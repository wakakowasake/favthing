import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSong, deleteSong, getSongs } from './services/firebaseService';
import { ZINDEX } from './constants/zIndex';

export default function MusicList({ userId, onMusicLoad }) {
  const navigate = useNavigate();
  const normalizeDate = (value) => {
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value || 0);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  // 추가된 음악들 (Firebase 데이터)
  const [addedSongs, setAddedSongs] = useState([]);
  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const [loading, setLoading] = useState(true);

  // Last.fm 검색 모달
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [melonSongs, setMelonSongs] = useState([]);
  const [melonSearchQuery, setMelonSearchQuery] = useState('');
  const [melonLoading, setMelonLoading] = useState(false);
  const [melonError, setMelonError] = useState(null);

  // 평점 입력 모달
  const [selectedMelonSong, setSelectedMelonSong] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRatingInput, setUserRatingInput] = useState(0); // 0-5점
  const [hoverRating, setHoverRating] = useState(0); // 호버 상태용

  // 보기 방식 및 정렬 (localStorage에서 초기값 읽어오기)
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('musicViewMode') || 'card';
  });
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('musicSortBy') || 'date';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('musicSortOrder') || 'desc';
  });

  // 보기 옵션 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('musicViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('musicSortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('musicSortOrder', sortOrder);
  }, [sortOrder]);

  // Firebase에서 음악 로드
  useEffect(() => {
    if (userId) {
      loadSongs();
    }
  }, [userId]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const songs = await getSongs(userId);
      setAddedSongs(songs);
      if (onMusicLoad) onMusicLoad(songs);
    } catch (error) {
      // 로드 실패 처리
    } finally {
      setLoading(false);
    }
  };

  // Melon API에서 음악 검색
  const fetchMelonSongs = async (query) => {
    setMelonLoading(true);
    setMelonError(null);

    try {
      const response = await fetch(
        `/api/melona/search/song?query=${encodeURIComponent(query)}`,
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
      setMelonSongs(data || []);
    } catch (err) {
      setMelonError(`음악 검색 중 오류 발생: ${err.message}`);
    } finally {
      setMelonLoading(false);
    }
  };

  const handleMelonSearch = (e) => {
    e.preventDefault();
    if (melonSearchQuery.trim()) {
      fetchMelonSongs(melonSearchQuery);
    }
  };

  // 검색 결과에서 음악 선택 - 평점 입력 모달 표시
  const selectSongFromMelon = (melonSong) => {
    setSelectedMelonSong(melonSong);
    setUserRatingInput(0);
    setHoverRating(0);
    setShowRatingModal(true);
  };

  // 평점 입력 후 음악 추가
  const confirmSongWithRating = async () => {
    if (!selectedMelonSong || userRatingInput === 0) {
      alert('평점을 선택해주세요.');
      return;
    }

    try {
      const newSong = {
        title: selectedMelonSong.title,
        artist: selectedMelonSong.artist || '아티스트 정보 없음',
        album: selectedMelonSong.album || '',
        image: selectedMelonSong.albumImg || selectedMelonSong.image || '', // 앨범 아트
        year: selectedMelonSong.year || '',
        userRating: userRatingInput.toString(), // 사용자 평점
      };
      const savedSong = await addSong(newSong, userId);
      setAddedSongs([...addedSongs, savedSong]);
      setShowRatingModal(false);
      setShowSearchModal(false);
      setMelonSearchQuery('');
      setMelonSongs([]);
      setSelectedMelonSong(null);
      setUserRatingInput(0);
      setHoverRating(0);
      alert('음악이 추가되었습니다!');
    } catch (error) {
      alert('음악 추가에 실패했습니다.');
    }
  };

  // 음악 삭제
  const removeSongFromFirebase = async (songId) => {
    try {
      await deleteSong(songId);
      setAddedSongs(addedSongs.filter((song) => song.id !== songId));
    } catch (error) {
      // 삭제 실패 처리
    }
  };

  // 로컬 검색 필터링
  const filteredSongs = addedSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQueryLocal.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQueryLocal.toLowerCase())
  );

  // 정렬 함수
  const getSortedSongs = () => {
    let sorted = [...filteredSongs];

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

  const sortedSongs = getSortedSongs();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-primary">음악 리스트</h1>
        <div className="flex items-center gap-3">
          {/* 보기 옵션 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowViewOptions(!showViewOptions)}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded transition flex items-center gap-2"
            >
              <span className="material-icons-outlined">tune</span>
              보기 옵션
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
                      발매 연도
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

          {/* 음악 추가 버튼 */}
          <button
            onClick={() => {
              setShowSearchModal(true);
              setMelonSearchQuery('');
              setMelonSongs([]);
            }}
            className="px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition flex items-center gap-2"
          >
            <span className="material-icons-outlined">add</span>
            음악 추가
          </button>
        </div>
      </div>

      {/* 로컬 검색 바 */}
      {addedSongs.length > 0 && (
        <div className="mb-8">
          <input
            type="text"
            value={searchQueryLocal}
            onChange={(e) => setSearchQueryLocal(e.target.value)}
            placeholder="제목, 아티스트명 검색..."
            className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* 추가된 음악 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-400">음악 로드 중...</div>
        </div>
      ) : filteredSongs.length > 0 ? (
        viewMode === 'card' ? (
          // 카드 뷰
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {sortedSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => navigate(`/music/${song.id}`)}
                className="bg-gray-900 rounded-lg overflow-hidden hover:transform hover:scale-105 transition duration-300 group cursor-pointer flex flex-col"
              >
                <div className="relative overflow-hidden bg-gray-800 flex-shrink-0 aspect-square">
                  {song.image ? (
                    <img
                      src={song.image}
                      alt={song.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-icons-outlined text-4xl text-gray-500">album</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="font-bold text-sm mb-1 line-clamp-2">{song.title}</h3>
                  <p className="text-gray-400 text-xs mb-2">{song.artist}</p>
                  {song.album && <p className="text-gray-500 text-xs mb-2">{song.album}</p>}
                  {song.userRating && (
                    <div className="flex gap-0 text-sm">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const rating = parseFloat(song.userRating) || 0;
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
            {sortedSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => navigate(`/music/${song.id}`)}
                className="bg-gray-900 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-800 transition cursor-pointer group"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-800">
                  {song.image ? (
                    <img
                      src={song.image}
                      alt={song.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-icons-outlined text-lg text-gray-500">album</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-base mb-1">{song.title}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <p className="text-gray-400">{song.artist}</p>
                    {song.album && <p className="text-gray-500">{song.album}</p>}
                    {song.userRating && (
                      <div className="flex gap-0 text-lg">
                        {[1, 2, 3, 4, 5].map((starIndex) => {
                          const rating = parseFloat(song.userRating) || 0;
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
              music_note
            </span>
            <p className="text-gray-400">
              {addedSongs.length === 0
                ? '추가된 음악이 없습니다. "음악 추가" 버튼에서 음악을 추가해보세요!'
                : '검색 결과가 없습니다'}
            </p>
          </div>
        </div>
      )}

      {/* 음악 검색 모달 */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL }}>
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-6 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">음악 검색</h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 검색 입력 */}
              <form onSubmit={handleMelonSearch} className="flex gap-2">
                <input
                  type="text"
                  value={melonSearchQuery}
                  onChange={(e) => setMelonSearchQuery(e.target.value)}
                  placeholder="음악 제목 또는 아티스트명 검색..."
                  className="flex-1 px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={melonLoading}
                  className="px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
                >
                  {melonLoading ? '검색 중...' : '검색'}
                </button>
              </form>

              {/* 에러 메시지 */}
              {melonError && (
                <div className="p-4 bg-red-900/30 border border-red-500 rounded text-red-400">
                  {melonError}
                </div>
              )}

              {/* 검색 결과 */}
              {melonSongs.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {melonSongs.map((song, index) => (
                    <div
                      key={`${song.artist}-${song.title}-${index}`}
                      className="flex gap-4 p-4 bg-gray-800 rounded hover:bg-gray-750 transition cursor-pointer items-center"
                      onClick={() => selectSongFromMelon(song)}
                    >
                      {song.albumImg && (
                        <img
                          src={song.albumImg}
                          alt={song.title}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{song.title}</h3>
                        {song.artist && (
                          <p className="text-gray-400 text-sm">아티스트: {song.artist}</p>
                        )}
                        {song.album && (
                          <p className="text-gray-500 text-sm">앨범: {song.album}</p>
                        )}
                      </div>
                      <button
                        className="px-4 py-2 bg-primary hover:bg-red-700 text-white font-bold rounded whitespace-nowrap transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectSongFromMelon(song);
                        }}
                      >
                        선택
                      </button>
                    </div>
                  ))}
                </div>
              ) : melonSearchQuery && !melonLoading ? (
                <div className="text-center py-8 text-gray-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  음악 제목이나 아티스트명을 입력하고 검색하세요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 평점 입력 모달 */}
      {showRatingModal && selectedMelonSong && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL_OVERLAY }}>
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="bg-gray-800 p-6 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">평점 입력</h2>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedMelonSong(null);
                  setUserRatingInput(0);
                  setHoverRating(0);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 음악 정보 */}
              <div className="text-center">
                {selectedMelonSong.albumImg && (
                  <img
                    src={selectedMelonSong.albumImg}
                    alt={selectedMelonSong.title}
                    className="w-32 h-32 object-cover rounded mx-auto mb-4"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <h3 className="font-bold text-white text-lg mb-2">{selectedMelonSong.title}</h3>
                <p className="text-gray-400 text-sm">{selectedMelonSong.artist}</p>
                {selectedMelonSong.album && (
                  <p className="text-gray-500 text-xs mt-2">앨범: {selectedMelonSong.album}</p>
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
                  onClick={confirmSongWithRating}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setSelectedMelonSong(null);
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
    </div>
  );
}
