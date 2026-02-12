import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSeries, getSeries } from './services/firebaseService';
import { ZINDEX } from './constants/zIndex';
import ManualAddModal from './components/ManualAddModal';

const SERIES_MANUAL_FIELDS = [
  { name: 'title', label: '제목', placeholder: '시리즈 제목', required: true },
  { name: 'director', label: 'PD/제작자', placeholder: '예: 홍길동' },
  { name: 'year', label: '공개 연도', placeholder: '예: 2025', type: 'number' },
  { name: 'episodeCount', label: '에피소드 수', placeholder: '예: 12', type: 'number' },
  { name: 'cast', label: '출연진', placeholder: '배우1, 배우2' },
  { name: 'genres', label: '장르', placeholder: '예: 스릴러, 드라마' },
  { name: 'overview', label: '줄거리', placeholder: '간단한 줄거리', multiline: true, rows: 4 },
];

export default function SeriesList({ userId, onSeriesLoad }) {
  const navigate = useNavigate();
  const normalizeDate = (value) => {
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value || 0);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  // 추가된 시리즈들 (Firebase 데이터)
  const [addedSeries, setAddedSeries] = useState([]);
  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const [loading, setLoading] = useState(true);

  // 시리즈 검색 모달
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [tmdbSeries, setTmdbSeries] = useState([]);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(null);

  // 평점 입력 모달
  const [selectedTmdbSeries, setSelectedTmdbSeries] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRatingInput, setUserRatingInput] = useState(0); // 0-5점
  const [hoverRating, setHoverRating] = useState(0); // 호버 상태용

  // 보기 방식 및 정렬 (localStorage에서 초기값 읽어오기)
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('seriesViewMode') || 'card';
  });
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('seriesSortBy') || 'date';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('seriesSortOrder') || 'desc';
  });

  // 보기 옵션 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('seriesViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('seriesSortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('seriesSortOrder', sortOrder);
  }, [sortOrder]);

  // Firebase에서 시리즈 로드
  useEffect(() => {
    if (userId) {
      loadSeries();
    }
  }, [userId]);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const series = await getSeries(userId);
      setAddedSeries(series);
      if (onSeriesLoad) onSeriesLoad(series);
    } catch (error) {
      // 로드 실패 처리
    } finally {
      setLoading(false);
    }
  };

  // TMDB API에서 시리즈 검색
  const fetchTmdbSeries = async (query) => {
    setTmdbLoading(true);
    setTmdbError(null);

    try {
      const response = await fetch(
        `/api/tmdb/search/tv?query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error('서버에서 응답이 없습니다.');
      }

      const data = JSON.parse(text);
      setTmdbSeries(data.results || []);
    } catch (err) {
      setTmdbError(`시리즈 검색 중 오류 발생: ${err.message}`);
    } finally {
      setTmdbLoading(false);
    }
  };

  const handleSearchClick = () => {
    setShowSearchModal(true);
    setTmdbSeries([]);
    setTmdbSearchQuery('');
    setTmdbError(null);
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setTmdbSearchQuery(query);

    if (query.trim().length > 0) {
      await fetchTmdbSeries(query);
    } else {
      setTmdbSeries([]);
    }
  };

  // 시리즈 선택 시 상세 정보 조회 후 평점 입력 모달 표시
  const selectSeriesFromTmdb = async (series) => {
    try {
      // TMDB 상세 정보 조회
      const response = await fetch(`/api/tmdb/tv/${series.id}`);
      if (!response.ok) throw new Error('상세 정보 조회 실패');
      
      const detailData = await response.json();
      
      // 선택한 시리즈와 상세 정보 병합
      const enrichedSeries = {
        ...series,
        ...detailData,
        // overview도 포함됨
      };
      
      setSelectedTmdbSeries(enrichedSeries);
      setShowRatingModal(true);
      setUserRatingInput(0);
      setHoverRating(0);
    } catch (error) {
      console.error('시리즈 상세 정보 조회 실패:', error);
      alert('시리즈 정보를 불러오지 못했습니다.');
    }
  };

  // 평점과 함께 시리즈 추가
  const confirmSeriesWithRating = async () => {
    if (!selectedTmdbSeries) return;

    const posterUrl = selectedTmdbSeries.poster_path
      ? `https://image.tmdb.org/t/p/w300${selectedTmdbSeries.poster_path}`
      : null;

    // TMDB 배우 목록 추출 (상세 정보에 포함된 경우)
    const castList = selectedTmdbSeries.credits?.cast
      ?.slice(0, 10)
      .map(c => c.name)
      .join(', ') || '';

    // 장르 목록 추출
    const genresList = selectedTmdbSeries.genres
      ?.map(g => g.name)
      .join(', ') || '';

    const newSeries = {
      title: selectedTmdbSeries.name,
      image: posterUrl,
      director: selectedTmdbSeries.created_by?.map(c => c.name).join(', ') || '',
      year: selectedTmdbSeries.first_air_date?.substring(0, 4) || '',
      userRating: userRatingInput,
      comment: '',
      overview: selectedTmdbSeries.overview || '',
      cast: castList,
      genres: genresList,
      episodeCount: selectedTmdbSeries.number_of_episodes || 0,
      tmdbId: selectedTmdbSeries.id,
    };

    try {
      const savedSeries = await addSeries(newSeries, userId);
      setAddedSeries([...addedSeries, savedSeries]);

      setShowRatingModal(false);
      setShowSearchModal(false);
      setSelectedTmdbSeries(null);
    } catch (error) {
      console.error('시리즈 추가 실패:', error);
    }
  };

  const addSeriesManually = async (manualSeries) => {
    const parsedEpisodeCount = parseInt(manualSeries.episodeCount, 10);
    const newSeries = {
      title: manualSeries.title,
      image: manualSeries.image || '',
      director: manualSeries.director || '',
      year: manualSeries.year || '',
      userRating: manualSeries.userRating || '',
      comment: '',
      overview: manualSeries.overview || '',
      cast: manualSeries.cast || '',
      genres: manualSeries.genres || '',
      episodeCount: Number.isFinite(parsedEpisodeCount) ? parsedEpisodeCount : 0,
      tmdbId: null,
    };

    const savedSeries = await addSeries(newSeries, userId);
    const updatedSeries = [...addedSeries, savedSeries];
    setAddedSeries(updatedSeries);
    if (onSeriesLoad) onSeriesLoad(updatedSeries);
  };

  // 필터링
  const filteredSeries = addedSeries.filter((series) =>
    series.title?.toLowerCase().includes(searchQueryLocal.toLowerCase())
  );

  // 정렬
  const getSortedSeries = () => {
    let sorted = [...filteredSeries];

    if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const dateA = normalizeDate(a.createdAt);
        const dateB = normalizeDate(b.createdAt);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else if (sortBy === 'year') {
      sorted.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return sortOrder === 'desc' ? yearB - yearA : yearA - yearB;
      });
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => {
        const ratingA = parseFloat(a.userRating) || 0;
        const ratingB = parseFloat(b.userRating) || 0;
        return sortOrder === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      });
    }

    return sorted;
  };

  const sortedSeries = getSortedSeries();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-primary break-keep">시리즈 리스트</h1>
        <div className="flex items-center gap-3">
          {/* 보기 옵션 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowViewOptions(!showViewOptions)}
              className="h-11 w-11 md:w-32 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded transition flex items-center justify-center gap-2"
            >
              <span className="material-icons-outlined text-[20px]">tune</span>
              <span className="hidden md:inline">보기 옵션</span>
            </button>

            {/* 보기 옵션 패널 */}
            {showViewOptions && (
              <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 w-96" style={{ zIndex: ZINDEX.DROPDOWN }}>
                {/* 보기 방식 */}
                <div className="mb-4">
                  <p className="text-gray-400 text-sm font-bold mb-2">보기 방식</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-bold transition ${
                        viewMode === 'card'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      카드
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-bold transition ${
                        viewMode === 'list'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      줄
                    </button>
                  </div>
                </div>

                {/* 정렬 */}
                <div>
                  <p className="text-gray-400 text-sm font-bold mb-2">정렬</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSortBy('date')}
                      className={`px-3 py-2 rounded text-sm font-bold transition ${
                        sortBy === 'date'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      추가한 순서
                    </button>
                    <button
                      onClick={() => setSortBy('year')}
                      className={`px-3 py-2 rounded text-sm font-bold transition ${
                        sortBy === 'year'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      출시 연도
                    </button>
                    <button
                      onClick={() => setSortBy('rating')}
                      className={`px-3 py-2 rounded text-sm font-bold transition ${
                        sortBy === 'rating'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      평점
                    </button>
                  </div>
                </div>

                {/* 정렬 순서 */}
                <div>
                  <p className="text-gray-400 text-sm font-bold mb-2">순서</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortOrder('desc')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-bold transition ${
                        sortOrder === 'desc'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      내림차순
                    </button>
                    <button
                      onClick={() => setSortOrder('asc')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-bold transition ${
                        sortOrder === 'asc'
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      오름차순
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 추가 버튼 */}
          <button
            onClick={handleSearchClick}
            className="h-11 w-11 md:w-32 bg-primary hover:bg-red-700 text-white font-bold rounded transition flex items-center justify-center gap-2"
          >
            <span className="material-icons-outlined text-[20px]">add</span>
            <span className="hidden md:inline">시리즈 추가</span>
          </button>
          <button
            onClick={() => setShowManualAddModal(true)}
            className="h-11 w-11 md:w-32 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
          >
            <span className="material-icons-outlined text-[20px]">edit</span>
            <span className="hidden md:inline">직접 추가</span>
          </button>
        </div>
      </div>

      {/* 로컬 검색 바 */}
      {addedSeries.length > 0 && (
        <div className="mb-8">
          <input
            type="text"
            value={searchQueryLocal}
            onChange={(e) => setSearchQueryLocal(e.target.value)}
            placeholder="제목, PD명 검색..."
            className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* 로딩 상태 */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">로딩 중...</p>
        </div>
      ) : sortedSeries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">추가된 시리즈가 없습니다.</p>
          <button
            onClick={handleSearchClick}
            className="mt-4 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-opacity-80 transition"
          >
            시리즈 추가하기
          </button>
        </div>
      ) : viewMode === 'card' ? (
        // 카드 보기
        <div className="grid gap-6 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {sortedSeries.map((series) => (
            <div key={series.id} onClick={() => navigate(`/series/${series.id}`)} className="bg-gray-900 rounded-lg overflow-hidden hover:transform hover:scale-105 transition duration-300 group cursor-pointer flex flex-col">
              <div className="relative overflow-hidden bg-gray-800 flex-shrink-0 aspect-[2/3]">
                {series.image ? (
                  <img
                    src={series.image}
                    alt={series.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-icons-outlined text-4xl text-gray-500">theaters</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-sm mb-1 line-clamp-2">{series.title}</h3>
                <p className="text-gray-400 text-xs mb-2">{series.director}</p>
                {series.userRating && (
                  <div className="flex gap-0 text-sm mt-2">
                    {[1, 2, 3, 4, 5].map((starIndex) => {
                      const rating = parseFloat(series.userRating) || 0;
                      const fillPercentage = Math.max(0, Math.min(rating - (starIndex - 1), 1));
                      
                      return (
                        <div key={starIndex} className="relative">
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
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 목록 보기
        <div className="space-y-2">
          {sortedSeries.map((series) => (
            <div
              key={series.id}
              onClick={() => navigate(`/series/${series.id}`)}
              className="bg-gray-900 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-800 transition cursor-pointer group"
            >
              <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-gray-800">
                {series.image ? (
                  <img
                    src={series.image}
                    alt={series.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-icons-outlined text-xl text-gray-500">theaters</span>
                  </div>
                )}
              </div>

              <div className="flex-grow">
                <h3 className="font-bold text-base mb-1">{series.title}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <p className="text-gray-400">{series.director}</p>
                  {series.year && <p className="text-gray-500">{series.year}년</p>}
                  {series.userRating && (
                    <div className="flex gap-0 text-lg">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const rating = parseFloat(series.userRating) || 0;
                        const fillPercentage = Math.max(0, Math.min(rating - (starIndex - 1), 1));
                        
                        return (
                          <div key={starIndex} className="relative">
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
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 검색 모달 */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ zIndex: ZINDEX.MODAL_OVERLAY }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowSearchModal(false)}></div>
          <div
            className="relative bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto"
            style={{ zIndex: ZINDEX.MODAL }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-primary">시리즈 검색</h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="시리즈 제목을 입력하세요..."
              value={tmdbSearchQuery}
              onChange={handleSearch}
              autoFocus
              className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg placeholder-gray-500 mb-4"
            />

            {tmdbLoading && <p className="text-gray-400 text-center py-4">검색 중...</p>}
            {tmdbError && <p className="text-red-400 text-center py-4">{tmdbError}</p>}

            {tmdbSeries.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tmdbSeries.map((series) => (
                  <button
                    key={series.id}
                    onClick={() => selectSeriesFromTmdb(series)}
                    className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded text-left transition flex gap-3 items-start"
                  >
                    {series.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${series.poster_path}`}
                        alt={series.name}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-grow">
                      <p className="font-bold text-white">{series.name}</p>
                      <p className="text-gray-400 text-sm">
                        {series.first_air_date?.substring(0, 4)} · {series.networks?.[0]?.name || 'Network TBD'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 평점 입력 모달 */}
      {showRatingModal && selectedTmdbSeries && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ zIndex: ZINDEX.MODAL_OVERLAY }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowRatingModal(false)}></div>
          <div
            className="relative bg-gray-900 rounded-lg p-6 w-96"
            style={{ zIndex: ZINDEX.MODAL }}
          >
            <div className="text-center">
              {selectedTmdbSeries.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w300${selectedTmdbSeries.poster_path}`}
                  alt={selectedTmdbSeries.name}
                  className="w-32 h-48 object-cover rounded mx-auto mb-4"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <h2 className="text-2xl font-black text-primary mb-2">{selectedTmdbSeries.name}</h2>
              {selectedTmdbSeries.first_air_date && (
                <p className="text-gray-400 text-sm mb-6">{selectedTmdbSeries.first_air_date?.substring(0, 4)}년</p>
              )}

              {/* 평점 입력 - 별 5개 (0.5점 단위) */}
              <div className="mb-6">
                <label className="block text-white font-bold mb-4">
                  내 평점을 선택하세요 (0.5점 단위)
                </label>
                <div className="flex justify-center gap-2 text-6xl mb-4">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const displayRating = hoverRating > 0 ? hoverRating : userRatingInput;
                    const fillPercentage = Math.max(0, Math.min(displayRating - (starIndex - 1), 1));
                    
                    const handleStarClick = (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const isLeftHalf = x < rect.width / 2;
                      setUserRatingInput(isLeftHalf ? starIndex - 0.5 : starIndex);
                    };
                    
                    const handleMouseMove = (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const isLeftHalf = x < rect.width / 2;
                      setHoverRating(isLeftHalf ? starIndex - 0.5 : starIndex);
                    };
                    
                    return (
                      <button
                        key={starIndex}
                        type="button"
                        className="relative cursor-pointer focus:outline-none"
                        style={{ width: '60px', height: '60px', padding: 0, border: 'none', background: 'none' }}
                        onClick={handleStarClick}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {/* 빈 별 배경 */}
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                          ★
                        </div>

                        {/* 채워진 별 - clipPath로 정확하게 자르기 */}
                        {fillPercentage > 0 && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center text-primary pointer-events-none"
                            style={{
                              clipPath: `inset(0 ${(1 - fillPercentage) * 100}% 0 0)`
                            }}
                          >
                            ★
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {userRatingInput > 0 && (
                  <p className="text-primary font-bold text-xl">{userRatingInput}점</p>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={confirmSeriesWithRating}
                  disabled={userRatingInput === 0}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-opacity-80 text-black font-bold rounded transition disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setUserRatingInput(0);
                    setHoverRating(0);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ManualAddModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        title="시리즈 직접 추가"
        subtitle="검색 없이 시리즈 정보를 바로 입력할 수 있습니다."
        imageLabel="포스터 이미지"
        submitLabel="시리즈 추가"
        fields={SERIES_MANUAL_FIELDS}
        onSubmit={addSeriesManually}
      />
    </div>
  );
}
