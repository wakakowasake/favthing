import React, { useState, useEffect } from 'react';
import { addAnime, deleteAnime, getAnimes } from './services/firebaseService';
import { ZINDEX } from './constants/zIndex';

export default function AnimeList({ userId }) {
  // 추가된 애니들 (Firebase 데이터)
  const [addedAnimes, setAddedAnimes] = useState([]);
  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const [loading, setLoading] = useState(true);

  // 애니 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    studio: '',
    poster: '',
    year: '',
    episodes: '',
  });

  // 상세 모달
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Firebase에서 애니 로드
  useEffect(() => {
    if (userId) {
      loadAnimes();
    }
  }, [userId]);

  const loadAnimes = async () => {
    try {
      setLoading(true);
      const animes = await getAnimes(userId);
      setAddedAnimes(animes);
    } catch (error) {
      console.error('애니 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 애니 추가
  const addAnimeToFirebase = async () => {
    if (formData.title.trim()) {
      try {
        const newAnime = {
          title: formData.title,
          studio: formData.studio,
          poster: formData.poster,
          year: formData.year,
          episodes: formData.episodes,
        };
        const savedAnime = await addAnime(newAnime, userId);
        setAddedAnimes([...addedAnimes, savedAnime]);
        setFormData({ title: '', studio: '', poster: '', year: '', episodes: '' });
        alert('애니가 추가되었습니다!');
        setShowAddModal(false);
      } catch (error) {
        console.error('애니 추가 실패:', error);
        alert('애니 추가에 실패했습니다.');
      }
    }
  };

  // 애니 삭제
  const removeAnimeFromFirebase = async (animeId) => {
    try {
      await deleteAnime(animeId);
      setAddedAnimes(addedAnimes.filter((anime) => anime.id !== animeId));
    } catch (error) {
      console.error('애니 삭제 실패:', error);
    }
  };

  // 로컬 검색 필터링
  const filteredAnimes = addedAnimes.filter(
    (anime) =>
      anime.title.toLowerCase().includes(searchQueryLocal.toLowerCase()) ||
      anime.studio.toLowerCase().includes(searchQueryLocal.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-primary">애니메이션 리스트</h1>
        <button
          onClick={() => {
            setShowAddModal(true);
            setFormData({ title: '', studio: '', poster: '', year: '', episodes: '' });
          }}
          className="px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition flex items-center gap-2"
        >
          <span className="material-icons-outlined">add</span>
          애니 추가
        </button>
      </div>

      {/* 로컬 검색 바 */}
      {addedAnimes.length > 0 && (
        <div className="mb-8">
          <input
            type="text"
            value={searchQueryLocal}
            onChange={(e) => setSearchQueryLocal(e.target.value)}
            placeholder="제목, 스튜디오명 검색..."
            className="w-full md:w-96 px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* 추가된 애니 목록 */}
      {filteredAnimes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {filteredAnimes.map((anime) => (
            <div
              key={anime.id}
              className="bg-gray-900 rounded-lg overflow-hidden hover:transform hover:scale-105 transition duration-300 group"
            >
              <div className="relative overflow-hidden h-72">
                {anime.poster ? (
                  <img
                    src={anime.poster}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:brightness-50 transition"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="material-icons-outlined text-4xl text-gray-500">theaters</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                  <button
                    onClick={() => {
                      setSelectedAnime(anime);
                      setShowDetailModal(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition bg-primary hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
                  >
                    상세보기
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-base mb-1 line-clamp-2">{anime.title}</h3>
                <p className="text-gray-400 text-xs mb-2">{anime.studio}</p>
                {anime.year && <p className="text-gray-500 text-xs mb-2">{anime.year}년</p>}
                {anime.episodes && <p className="text-primary text-xs font-bold">{anime.episodes}화</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <span className="material-icons-outlined text-6xl text-gray-600 mb-4 block">
              theaters
            </span>
            <p className="text-gray-400">
              {addedAnimes.length === 0
                ? '추가된 애니가 없습니다. "애니 추가" 버튼에서 애니를 추가해보세요!'
                : '검색 결과가 없습니다'}
            </p>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetailModal && selectedAnime && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL }}>
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-6 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">애니 상세정보</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 애니 포스터 */}
              <div className="flex justify-center">
                {selectedAnime.poster ? (
                  <img
                    src={selectedAnime.poster}
                    alt={selectedAnime.title}
                    className="rounded-lg max-w-xs shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-72 bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="material-icons-outlined text-6xl text-gray-500">theaters</span>
                  </div>
                )}
              </div>

              {/* 애니 정보 */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-primary mb-2">제목</h3>
                  <p className="text-white">{selectedAnime.title}</p>
                </div>

                <div>
                  <h3 className="text-lg font-black text-primary mb-2">스튜디오</h3>
                  <p className="text-gray-300">{selectedAnime.studio}</p>
                </div>

                {selectedAnime.year && (
                  <div>
                    <h3 className="text-lg font-black text-primary mb-2">방영년도</h3>
                    <p className="text-gray-300">{selectedAnime.year}년</p>
                  </div>
                )}

                {selectedAnime.episodes && (
                  <div>
                    <h3 className="text-lg font-black text-primary mb-2">에피소드</h3>
                    <p className="text-gray-300">{selectedAnime.episodes}화</p>
                  </div>
                )}
              </div>

              {/* 삭제 버튼 */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    removeAnimeFromFirebase(selectedAnime.id);
                    setShowDetailModal(false);
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition"
                >
                  삭제
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 애니 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL }}>
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full">
            <div className="bg-gray-800 p-6 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">애니메이션 추가</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-white font-bold mb-2">애니메이션 제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="애니 제목 입력..."
                  className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-2">스튜디오</label>
                <input
                  type="text"
                  value={formData.studio}
                  onChange={(e) => setFormData({ ...formData, studio: e.target.value })}
                  placeholder="스튜디오명 입력..."
                  className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-2">포스터 이미지 URL</label>
                <input
                  type="url"
                  value={formData.poster}
                  onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
                  placeholder="이미지 URL 입력..."
                  className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-bold mb-2">방영년도</label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="예: 2024"
                    className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-white font-bold mb-2">총 화수</label>
                  <input
                    type="text"
                    value={formData.episodes}
                    onChange={(e) => setFormData({ ...formData, episodes: e.target.value })}
                    placeholder="예: 12"
                    className="w-full px-4 py-3 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={addAnimeToFirebase}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition"
                >
                  추가하기
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
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
