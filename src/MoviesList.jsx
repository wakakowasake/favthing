import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMovie, deleteMovie, getMovies } from './services/firebaseService';
import { ZINDEX } from './constants/zIndex';
import ManualAddModal from './components/ManualAddModal';

const MOVIE_MANUAL_FIELDS = [
  { name: 'title', label: '제목', placeholder: '영화 제목', required: true },
  { name: 'director', label: '감독', placeholder: '감독명' },
  { name: 'year', label: '개봉 연도', placeholder: '예: 2024', type: 'number' },
  { name: 'actors', label: '배우', placeholder: '주요 배우' },
  { name: 'genre', label: '장르', placeholder: '예: 드라마, 액션' },
  { name: 'nation', label: '국가', placeholder: '예: 한국' },
  { name: 'runtime', label: '상영 시간(분)', placeholder: '예: 120', type: 'number' },
  { name: 'contentRating', label: '관람 등급', placeholder: '예: 15세 관람가' },
  { name: 'description', label: '줄거리', placeholder: '간단한 줄거리', multiline: true, rows: 4 },
];

export default function MoviesList({ userId, onMoviesLoad }) {
  const navigate = useNavigate();
  const normalizeDate = (value) => {
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value || 0);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  // 추가된 영화들 (Firebase 데이터)
  const [addedMovies, setAddedMovies] = useState([]);
  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const [loading, setLoading] = useState(true);

  // 영화 검색 모달
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [kmdbMovies, setKmdbMovies] = useState([]);
  const [kmdbSearchQuery, setKmdbSearchQuery] = useState('');
  const [kmdbLoading, setKmdbLoading] = useState(false);
  const [kmdbError, setKmdbError] = useState(null);

  // 상세 모달 관련 코드 제거 - 페이지 네비게이션으로 변경됨

  // 평점 입력 모달
  const [selectedKmdbMovie, setSelectedKmdbMovie] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRatingInput, setUserRatingInput] = useState(0); // 0-5점
  const [hoverRating, setHoverRating] = useState(0); // 호버 상태용

  // 보기 방식 및 정렬 (localStorage에서 초기값 읽어오기)
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('moviesViewMode') || 'card';
  });
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('moviesSortBy') || 'date';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('moviesSortOrder') || 'desc';
  });

  // 보기 옵션 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('moviesViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('moviesSortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('moviesSortOrder', sortOrder);
  }, [sortOrder]);

  // Firebase에서 영화 로드
  useEffect(() => {
    if (userId) {
      loadMovies();
    }
  }, [userId]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const movies = await getMovies(userId);
      setAddedMovies(movies);
      if (onMoviesLoad) onMoviesLoad(movies);
    } catch (error) {
      // 로드 실패 처리
    } finally {
      setLoading(false);
    }
  };

  // KMDB API에서 영화 검색 (한국 영화 DB)
  const fetchKmdbMovies = async (query) => {
    setKmdbLoading(true);
    setKmdbError(null);

    try {
      const response = await fetch(
        `/api/kmdb/search/movie?query=${encodeURIComponent(query)}`,
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
      setKmdbMovies(data.results || []);
    } catch (err) {
      setKmdbError(`영화 검색 중 오류 발생: ${err.message}`);
    } finally {
      setKmdbLoading(false);
    }
  };

  const handleKmdbSearch = (e) => {
    e.preventDefault();
    if (kmdbSearchQuery.trim()) {
      fetchKmdbMovies(kmdbSearchQuery);
    }
  };

  // 검색 결과에서 영화 선택 - 평점 입력 모달 표시
  const selectMovieFromKmdb = (kmdbMovie) => {
    setSelectedKmdbMovie(kmdbMovie);
    setUserRatingInput(0);
    setHoverRating(0);
    setShowRatingModal(true);
  };

  // 평점 입력 후 영화 추가
  const confirmMovieWithRating = async () => {
    if (!selectedKmdbMovie || userRatingInput === 0) {
      alert('평점을 선택해주세요.');
      return;
    }

    try {
      const newMovie = {
        title: selectedKmdbMovie.title,
        director: selectedKmdbMovie.director || '감독 정보 없음',
        actors: selectedKmdbMovie.actors || '',
        image: selectedKmdbMovie.poster_path || '', // 포스터 이미지
        backdrop_path: selectedKmdbMovie.backdrop_path || '', // 스틸컷 배경 이미지
        year: selectedKmdbMovie.year || '',
        contentRating: selectedKmdbMovie.rating || '', // 관람등급
        userRating: userRatingInput.toString(), // 사용자 평점
        description: selectedKmdbMovie.overview || '',
        genre: selectedKmdbMovie.genre || '',
        nation: selectedKmdbMovie.nation || '',
        runtime: selectedKmdbMovie.runtime || '',
      };
      const savedMovie = await addMovie(newMovie, userId);
      setAddedMovies([...addedMovies, savedMovie]);
      setShowRatingModal(false);
      setShowSearchModal(false);
      setKmdbSearchQuery('');
      setKmdbMovies([]);
      setSelectedKmdbMovie(null);
      setUserRatingInput(0);
      setHoverRating(0);
      alert('영화가 추가되었습니다!');
    } catch (error) {
      alert('영화 추가에 실패했습니다.');
    }
  };

  const addMovieManually = async (manualMovie) => {
    const newMovie = {
      title: manualMovie.title,
      director: manualMovie.director || '감독 정보 없음',
      actors: manualMovie.actors || '',
      image: manualMovie.image || '',
      backdrop_path: '',
      year: manualMovie.year || '',
      contentRating: manualMovie.contentRating || '',
      userRating: manualMovie.userRating || '',
      description: manualMovie.description || '',
      genre: manualMovie.genre || '',
      nation: manualMovie.nation || '',
      runtime: manualMovie.runtime || '',
      comment: '',
    };

    const savedMovie = await addMovie(newMovie, userId);
    const updatedMovies = [...addedMovies, savedMovie];
    setAddedMovies(updatedMovies);
    if (onMoviesLoad) onMoviesLoad(updatedMovies);
  };

  // 영화 삭제
  const removeMovieFromFirebase = async (movieId) => {
    try {
      await deleteMovie(movieId);
      setAddedMovies(addedMovies.filter((movie) => movie.id !== movieId));
    } catch (error) {
      // 삭제 실패 처리
    }
  };

  // 로컬 검색 필터링
  const filteredMovies = addedMovies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(searchQueryLocal.toLowerCase()) ||
      movie.director.toLowerCase().includes(searchQueryLocal.toLowerCase())
  );

  // 정렬 함수
  const getSortedMovies = () => {
    let sorted = [...filteredMovies];

    // 정렬 기준 적용
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

  const sortedMovies = getSortedMovies();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-primary break-keep">영화 리스트</h1>
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

                {/* 정렬 기준 */}
                <div className="mb-4">
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

          {/* 영화 추가 버튼 */}
          <button
            onClick={() => {
              setShowSearchModal(true);
              setKmdbSearchQuery('');
              setKmdbMovies([]);
            }}
            className="h-11 w-11 md:w-32 bg-primary hover:bg-red-700 text-white font-bold rounded transition flex items-center justify-center gap-2"
          >
            <span className="material-icons-outlined text-[20px]">add</span>
            <span className="hidden md:inline">영화 추가</span>
          </button>
          <button
            onClick={() => setShowManualAddModal(true)}
            className="h-11 w-11 md:w-32 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition flex items-center justify-center gap-2"
          >
            <span className="material-icons-outlined text-[20px]">edit</span>
            <span className="hidden md:inline">직접 추가</span>
          </button>
        </div>
      </div>

      {/* 로컬 검색 바 */}
      {addedMovies.length > 0 && (
        <div className="mb-8">
          <input
            type="text"
            value={searchQueryLocal}
            onChange={(e) => setSearchQueryLocal(e.target.value)}
            placeholder="제목, 감독명 검색..."
            className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* 추가된 영화 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-400">영화 로드 중...</div>
        </div>
      ) : filteredMovies.length > 0 ? (
        viewMode === 'card' ? (
          // 카드 뷰
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {sortedMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => navigate(`/movies/${movie.id}`)}
                className="bg-gray-900 rounded-lg overflow-hidden hover:transform hover:scale-105 transition duration-300 group cursor-pointer flex flex-col"
              >
                <div className="relative overflow-hidden bg-gray-800 flex-shrink-0 aspect-[2/3]">
                  {movie.image ? (
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-icons-outlined text-4xl text-gray-500">movie</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="font-bold text-sm mb-1 line-clamp-2">{movie.title}</h3>
                  <p className="text-gray-400 text-xs mb-2">{movie.director}</p>
                  {movie.year && <p className="text-gray-500 text-xs mb-2">{movie.year}년</p>}
                  {movie.userRating && (
                    <div className="flex gap-0 text-sm">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const rating = parseFloat(movie.userRating) || 0;
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
          // 줄 뷰
          <div className="space-y-2">
            {sortedMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => navigate(`/movies/${movie.id}`)}
                className="bg-gray-900 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-800 transition cursor-pointer group"
              >
                <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-gray-800">
                  {movie.image ? (
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-icons-outlined text-xl text-gray-500">movie</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-base mb-1">{movie.title}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <p className="text-gray-400">{movie.director}</p>
                    {movie.year && <p className="text-gray-500">{movie.year}년</p>}
                    {movie.userRating && (
                      <div className="flex gap-0 text-lg">
                        {[1, 2, 3, 4, 5].map((starIndex) => {
                          const rating = parseFloat(movie.userRating) || 0;
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
        )
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <span className="material-icons-outlined text-6xl text-gray-600 mb-4 block">
              movie
            </span>
            <p className="text-gray-400">
              {addedMovies.length === 0
                ? '추가된 영화가 없습니다. "영화 추가" 버튼에서 영화를 추가해보세요!'
                : '검색 결과가 없습니다'}
            </p>
          </div>
        </div>
      )}

      {/* 영화 검색 모달 */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL }}>
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-6 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">영화 검색</h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 검색 입력 */}
              <form onSubmit={handleKmdbSearch} className="flex gap-2">
                <input
                  type="text"
                  value={kmdbSearchQuery}
                  onChange={(e) => setKmdbSearchQuery(e.target.value)}
                  placeholder="영화 제목 검색 (한국 영화)..."
                  className="flex-1 px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={kmdbLoading}
                  className="px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
                >
                  {kmdbLoading ? '검색 중...' : '검색'}
                </button>
              </form>

              {/* 에러 메시지 */}
              {kmdbError && (
                <div className="p-4 bg-red-900/30 border border-red-500 rounded text-red-400">
                  {kmdbError}
                </div>
              )}

              {/* 검색 결과 */}
              {kmdbMovies.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {kmdbMovies.map((movie) => (
                    <div
                      key={movie.id}
                      className="flex gap-4 p-4 bg-gray-800 rounded hover:bg-gray-750 transition cursor-pointer items-center"
                      onClick={() => selectMovieFromKmdb(movie)}
                    >
                      {movie.poster_path && (
                        <img
                          src={movie.poster_path}
                          alt={movie.title}
                          className="w-16 h-24 object-cover rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{movie.title}</h3>
                        {movie.director && (
                          <p className="text-gray-400 text-sm">감독: {movie.director}</p>
                        )}
                        {movie.year && (
                          <p className="text-gray-400 text-sm">{movie.year}년</p>
                        )}
                        {movie.genre && (
                          <p className="text-gray-500 text-sm">{movie.genre}</p>
                        )}
                        {movie.rating && (
                          <p className="text-primary text-sm mt-1">관람등급: {movie.rating}</p>
                        )}
                      </div>
                      <button
                        className="px-4 py-2 bg-primary hover:bg-red-700 text-white font-bold rounded whitespace-nowrap transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectMovieFromKmdb(movie);
                        }}
                      >
                        선택
                      </button>
                    </div>
                  ))}
                </div>
              ) : kmdbSearchQuery && !kmdbLoading ? (
                <div className="text-center py-8 text-gray-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  영화 제목을 입력하고 검색하세요. (한국 영화 데이터베이스)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 평점 입력 모달 */}
      {showRatingModal && selectedKmdbMovie && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL_OVERLAY }}>
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="bg-gray-800 p-6 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">평점 입력</h2>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedKmdbMovie(null);
                  setUserRatingInput(0);
                  setHoverRating(0);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 영화 정보 */}
              <div className="text-center">
                {selectedKmdbMovie.poster_path && (
                  <img
                    src={selectedKmdbMovie.poster_path}
                    alt={selectedKmdbMovie.title}
                    className="w-32 h-48 object-cover rounded mx-auto mb-4"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <h3 className="font-bold text-white text-lg mb-2">{selectedKmdbMovie.title}</h3>
                <p className="text-gray-400 text-sm">{selectedKmdbMovie.director}</p>
                {selectedKmdbMovie.rating && (
                  <p className="text-primary text-xs mt-2">관람등급: {selectedKmdbMovie.rating}</p>
                )}
              </div>

              {/* 평점 입력 - 별 5개 */}
              <div className="text-center">
                <label className="block text-white font-bold mb-4">
                  내 평점을 선택하세요 (0.5점 단위)
                </label>
                <div className="flex justify-center gap-2 text-6xl mb-4">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const displayRating = hoverRating > 0 ? hoverRating : userRatingInput;
                    // 각 별이 얼마나 채워져야 하는지 계산 (0~1 범위)
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
                  onClick={confirmMovieWithRating}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setSelectedKmdbMovie(null);
                    setUserRatingInput(0);
                    setHoverRating(0);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition"
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
        title="영화 직접 추가"
        subtitle="검색 없이 영화 정보를 바로 입력할 수 있습니다."
        imageLabel="포스터 이미지"
        submitLabel="영화 추가"
        fields={MOVIE_MANUAL_FIELDS}
        onSubmit={addMovieManually}
      />
    </div>
  );
}
