import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthService } from './firebase';
import { getBooks, getMovies, getSeries, getSongs } from './services/firebaseService';

const SECTION_META = {
  movies: { key: 'movies', title: '영화', icon: 'movie', backPath: '/movies' },
  series: { key: 'series', title: '시리즈', icon: 'theaters', backPath: '/series' },
  books: { key: 'books', title: '도서', icon: 'menu_book', backPath: '/books' },
  music: { key: 'music', title: '음악', icon: 'music_note', backPath: '/music' },
};

const WATCH_STATUS_LABEL = {
  planned: '볼 예정이에요',
  plan: '볼 예정이에요',
  watching: '보고있어요',
  watched: '봤어요',
};

const READ_STATUS_LABEL = {
  planned: '읽을 예정이에요',
  reading: '읽고있어요',
  read: '읽었어요',
};

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, '').trim();

const getItemSubtitle = (item, section) => {
  if (section === 'books') return [item.author, item.publisher].filter(Boolean).join(' · ');
  if (section === 'music') return [item.artist, item.album].filter(Boolean).join(' · ');
  if (section === 'movies') return [item.director, item.actors].filter(Boolean).join(' · ');
  return [item.director, item.cast].filter(Boolean).join(' · ');
};

const getYearInfo = (item, section) => {
  if (section === 'books') {
    return { label: '출판일', value: item.pubdate };
  }
  return { label: '출시 연도', value: item.year };
};

const getDescription = (item) => {
  return stripHtml(item.description || item.overview || '');
};

function RatingStars({ value }) {
  const rating = parseFloat(value) || 0;
  if (!rating) {
    return <p className="text-gray-500 text-sm">평점이 없습니다.</p>;
  }

  return (
    <div className="detail-rating-stars">
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillPercentage = Math.max(0, Math.min(rating - (starIndex - 1), 1));

        return (
          <div key={starIndex} className="detail-rating-star relative leading-none">
            <span className="text-gray-600">★</span>
            {fillPercentage > 0 && (
              <span
                className="absolute left-0 top-0 text-primary overflow-hidden"
                style={{ width: `${Math.round(fillPercentage * 100)}%` }}
              >
                ★
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ShareDetailPage() {
  const navigate = useNavigate();
  const { userId, section, itemId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);

  const sectionMeta = SECTION_META[section];

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!userId || !sectionMeta || !itemId) {
        if (isMounted) {
          setError('잘못된 공유 상세 경로입니다.');
          setLoading(false);
        }
        return;
      }

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const useFirebaseEmulator = String(import.meta.env.VITE_USE_FIREBASE_EMULATOR || '').toLowerCase() === 'true';
      const apiBase = isLocalhost && !useFirebaseEmulator
        ? 'https://us-central1-favthing-cb626.cloudfunctions.net/api'
        : '/api';

      const currentUser = (() => {
        try {
          return getAuthService().currentUser;
        } catch (authError) {
          return null;
        }
      })();

      const canLoadFromClient = currentUser?.uid === userId;

      const pickItem = (data) => {
        const list = data?.[section] || [];
        return list.find((entry) => String(entry.id) === String(itemId)) || null;
      };

      const loadFromClient = async () => {
        if (!canLoadFromClient) return null;

        let list = [];
        if (section === 'movies') list = await getMovies(userId).catch(() => []);
        if (section === 'series') list = await getSeries(userId).catch(() => []);
        if (section === 'books') list = await getBooks(userId).catch(() => []);
        if (section === 'music') list = await getSongs(userId).catch(() => []);

        return list.find((entry) => String(entry.id) === String(itemId)) || null;
      };

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${apiBase}/share/${encodeURIComponent(userId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          const fallbackItem = await loadFromClient();
          if (!fallbackItem) {
            throw new Error(`공유 상세 로드 실패 (${response.status})`);
          }
          if (isMounted) setItem(fallbackItem);
          return;
        }

        const data = await response.json();
        const found = pickItem(data);

        if (found) {
          if (isMounted) setItem(found);
          return;
        }

        const fallbackItem = await loadFromClient();
        if (!fallbackItem) {
          throw new Error('해당 콘텐츠를 찾을 수 없습니다.');
        }

        if (isMounted) setItem(fallbackItem);
      } catch (err) {
        if (isMounted) {
          setError(err.message || '공유 상세 페이지를 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [userId, section, itemId, sectionMeta]);

  const title = useMemo(() => stripHtml(item?.title || ''), [item]);
  const subtitle = useMemo(() => stripHtml(getItemSubtitle(item || {}, section)), [item, section]);
  const yearInfo = useMemo(() => getYearInfo(item || {}, section), [item, section]);
  const description = useMemo(() => getDescription(item || {}), [item]);
  const comment = useMemo(() => stripHtml(item?.comment || ''), [item]);

  const statusLabel = useMemo(() => {
    if (!item) return '';
    if (section === 'books') return READ_STATUS_LABEL[item.readStatus] || '';
    return WATCH_STATUS_LABEL[item.watchStatus] || '';
  }, [item, section]);

  const handleGoBack = () => {
    navigate(`/share/${userId}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed top-0 w-full flex items-center justify-between px-4 md:px-12 py-4 navbar-blur z-10">
        <button
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-primary hover:text-red-400 font-bold transition"
        >
          <span className="material-icons-outlined">arrow_back</span>
          공유 목록으로
        </button>
        <span className="text-xs md:text-sm text-gray-300 font-bold">읽기 전용 상세 페이지</span>
      </nav>

      <main className="pt-24 px-4 md:px-12 pb-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-lg">상세 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="max-w-xl mx-auto mt-8 p-4 bg-red-900/20 border border-red-600 rounded text-red-300 text-center">
            {error}
          </div>
        ) : !item ? (
          <div className="max-w-xl mx-auto mt-8 p-4 bg-gray-900 border border-gray-700 rounded text-gray-300 text-center">
            콘텐츠를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1 md:sticky md:top-28 md:h-fit">
              {item.image || item.albumImg ? (
                <img
                  src={item.image || item.albumImg}
                  alt={title}
                  className="w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="material-icons-outlined text-6xl text-gray-500">{sectionMeta.icon}</span>
                </div>
              )}
            </div>

            <div className="md:col-span-3 space-y-6 bg-gray-900/80 backdrop-blur p-6 rounded-lg border border-gray-800">
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-primary break-keep">{title || '제목 없음'}</h1>
                {subtitle && <p className="text-gray-300 mt-3 break-keep">{subtitle}</p>}
                <p className="text-xs text-gray-500 mt-2">카테고리: {sectionMeta.title}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {yearInfo.value && (
                  <div className="bg-gray-800 p-3 rounded">
                    <p className="text-gray-500 text-sm mb-1">{yearInfo.label}</p>
                    <p className="text-white font-bold">{yearInfo.value}</p>
                  </div>
                )}

                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-gray-500 text-sm mb-1">내 평점</p>
                  <RatingStars value={item.userRating} />
                </div>
              </div>

              {statusLabel && (
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2">상태</h3>
                  <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-primary/20 text-primary">
                    {statusLabel}
                  </span>
                </div>
              )}

              {description && (
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2">설명</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-keep">{description}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-primary mb-2">코멘트</h3>
                {comment ? (
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-keep">{comment}</p>
                ) : (
                  <p className="text-gray-500">코멘트가 없습니다.</p>
                )}
              </div>

              <div className="border-t border-gray-700 pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition"
                >
                  공유 목록으로
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
