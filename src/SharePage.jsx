import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthService } from './firebase';
import { getBooks, getMovies, getSeries, getSongs } from './services/firebaseService';

const SECTION_META = [
  { key: 'movies', title: '영화', icon: 'movie' },
  { key: 'series', title: '시리즈', icon: 'theaters' },
  { key: 'books', title: '도서', icon: 'menu_book' },
  { key: 'music', title: '음악', icon: 'music_note' },
];

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, '').trim();

const getSubtitle = (item, type) => {
  if (type === 'books') return item.author || item.publisher || '';
  if (type === 'music') return item.artist || item.album || '';
  return item.director || item.cast || '';
};

const getYearLabel = (item, type) => {
  if (type === 'books') return item.pubdate || '';
  return item.year || '';
};

function RatingStars({ value }) {
  const rating = parseFloat(value) || 0;
  if (!rating) return null;

  return (
    <div className="flex gap-0.5 text-sm mt-1 justify-center">
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillPercentage = Math.max(0, Math.min(rating - (starIndex - 1), 1));
        return (
          <div key={starIndex} className="relative leading-none">
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

function ShareCard({ item, type, icon, onClick }) {
  const title = stripHtml(item.title || '제목 없음');
  const subtitle = stripHtml(getSubtitle(item, type));
  const year = stripHtml(getYearLabel(item, type));
  const imageSrc = item.image || item.albumImg || '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-gray-900 rounded-lg overflow-hidden flex flex-col border border-gray-800 hover:border-primary/60 hover:-translate-y-0.5 transition"
    >
      <div className="relative overflow-hidden bg-gray-800 aspect-[2/3]">
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-icons-outlined text-4xl text-gray-500">{icon}</span>
          </div>
        )}
      </div>
      <div className="p-3 flex-grow flex flex-col">
        <h3 className="font-bold text-sm line-clamp-2 break-keep">{title}</h3>
        {subtitle && <p className="text-gray-400 text-xs mt-1 line-clamp-1">{subtitle}</p>}
        {year && <p className="text-gray-500 text-xs mt-1">{year}</p>}
        <RatingStars value={item.userRating} />
      </div>
    </button>
  );
}

export default function SharePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [content, setContent] = useState({
    movies: [],
    books: [],
    music: [],
    series: [],
  });

  useEffect(() => {
    let isMounted = true;

    const loadSharedData = async () => {
      if (!userId) {
        if (isMounted) {
          setError('공유 사용자 ID가 없습니다.');
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

      const loadFromClient = async () => {
        if (!canLoadFromClient) return false;

        const [movies, books, music, series] = await Promise.all([
          getMovies(userId).catch(() => []),
          getBooks(userId).catch(() => []),
          getSongs(userId).catch(() => []),
          getSeries(userId).catch(() => []),
        ]);

        if (!isMounted) return true;
        setContent({ movies, books, music, series });
        return true;
      };

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${apiBase}/share/${encodeURIComponent(userId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          const loadedFromClient = await loadFromClient();
          if (!loadedFromClient) {
            throw new Error(`공유 페이지 로드 실패 (${response.status})`);
          }
          return;
        }

        const data = await response.json();
        if (!isMounted) return;

        const nextContent = {
          movies: data.movies || [],
          books: data.books || [],
          music: data.music || [],
          series: data.series || [],
        };

        const hasAnyContent = Object.values(nextContent).some((items) => items.length > 0);
        if (!hasAnyContent) {
          const loadedFromClient = await loadFromClient();
          if (loadedFromClient) return;
        }

        setContent(nextContent);
      } catch (err) {
        if (isMounted) {
          setError(err.message || '공유 페이지를 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSharedData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const totalCount = useMemo(
    () => content.movies.length + content.series.length + content.books.length + content.music.length,
    [content]
  );

  const filteredContent = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return content;

    const matchItem = (item, type) => {
      const text = [
        stripHtml(item.title || ''),
        stripHtml(getSubtitle(item, type)),
        stripHtml(getYearLabel(item, type)),
        stripHtml(item.description || item.overview || ''),
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(keyword);
    };

    return {
      movies: content.movies.filter((item) => matchItem(item, 'movies')),
      series: content.series.filter((item) => matchItem(item, 'series')),
      books: content.books.filter((item) => matchItem(item, 'books')),
      music: content.music.filter((item) => matchItem(item, 'music')),
    };
  }, [content, searchTerm]);

  const filteredCount = useMemo(
    () =>
      filteredContent.movies.length +
      filteredContent.series.length +
      filteredContent.books.length +
      filteredContent.music.length,
    [filteredContent]
  );

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <nav className="fixed top-0 w-full flex items-center justify-between px-4 md:px-12 py-4 navbar-blur">
        <h1
          className="text-primary font-black text-2xl tracking-tighter cursor-pointer"
          onClick={() => navigate('/')}
        >
          FAV-THING
        </h1>
        <span className="text-xs md:text-sm text-gray-300 font-bold">읽기 전용 공유 페이지</span>
      </nav>

      <main className="pt-24 px-4 md:px-12 pb-12 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-lg">공유 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="max-w-xl mx-auto mt-8 p-4 bg-red-900/20 border border-red-600 rounded text-red-300 text-center">
            {error}
          </div>
        ) : totalCount === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <span className="material-icons-outlined text-6xl text-gray-600 block mb-3">inventory_2</span>
              <p className="text-gray-400">공유된 콘텐츠가 없습니다.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                이 페이지는 공유용 읽기 전용입니다. 상세 페이지 열람은 가능하며, 추가/수정/삭제는 불가능합니다.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons-outlined text-primary">search</span>
                <h2 className="text-sm font-bold text-gray-200">공유 목록 검색</h2>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="제목, 감독, 저자, 아티스트, 설명 검색"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {filteredCount === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {SECTION_META.map((section) => {
                  const items = filteredContent[section.key];
                  if (!items?.length) return null;

                  return (
                    <section key={section.key}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-icons-outlined text-primary">{section.icon}</span>
                        <h2 className="text-2xl font-black text-primary">{section.title}</h2>
                        <span className="text-xs text-gray-500">({items.length})</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {items.map((item) => (
                          <ShareCard
                            key={`${section.key}-${item.id}`}
                            item={item}
                            type={section.key}
                            icon={section.icon}
                            onClick={() => navigate(`/share/${userId}/${section.key}/${item.id}`)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
