import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteSong, updateSong } from './services/firebaseService';
import { ZINDEX } from './constants/zIndex';

export default function MusicDetail({ songs, userId }) {
  const { songId } = useParams();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [comment, setComment] = useState('');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [hoverTempRating, setHoverTempRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(0);

  const song = songs.find((s) => s.id === songId);

  // 컴포넌트 마운트 시 comment 초기화
  React.useEffect(() => {
    if (song?.comment) {
      setComment(song.comment);
    }
    if (song?.userRating) {
      setCurrentRating(parseFloat(song.userRating) || 0);
    }
  }, [song]);

  const handleSaveComment = async () => {
    try {
      await updateSong(songId, { comment: comment });
      setIsEditingComment(false);
    } catch (error) {
      alert('코멘트 저장에 실패했습니다.');
    }
  };

  // 간단한 마크다운 미리보기
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 제목
    html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 1.125rem; font-weight: bold; margin: 0.5rem 0;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.25rem; font-weight: bold; margin: 0.75rem 0;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 1.5rem; font-weight: bold; margin: 1rem 0;">$1</h1>');
    
    // 굵게
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');
    
    // 이탤릭
    html = html.replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>');
    
    // 줄바꿈
    html = html.replace(/\n/g, '<br />');
    
    return html;
  };

  if (!song) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">음악을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/music')}
            className="px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteSong(songId);
      setShowDeleteModal(false);
      navigate('/music');
    } catch (error) {
      alert('삭제에 실패했습니다.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 헤더 */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 z-10 flex items-center justify-between">
        <button
          onClick={() => navigate('/music')}
          className="flex items-center gap-2 text-primary hover:text-red-400 font-bold transition"
        >
          <span className="material-icons-outlined leading-none relative translate-y-0.5">arrow_back</span>
          음악 목록으로
        </button>
        
        {/* 점세개 메뉴 */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <span className="material-icons-outlined">more_vert</span>
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setShowMenu(false);
                }}
                disabled={isDeleting}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-700 transition disabled:opacity-50 font-bold"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="relative px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 앨범 커버 - Sticky */}
            <div className="md:col-span-1 md:sticky md:top-24 md:h-fit">
              {song.image ? (
                <img
                  src={song.image}
                  alt={song.title}
                  className="w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="material-icons-outlined text-6xl text-gray-500">album</span>
                </div>
              )}
            </div>

            {/* 음악 정보 */}
            <div className="md:col-span-3 space-y-6 bg-gray-900/80 backdrop-blur p-6 rounded-lg">
              {/* 제목 */}
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-primary mb-2">
                  {song.title}
                </h1>
                {song.artist && (
                  <p className="text-xl text-gray-400">아티스트: {song.artist}</p>
                )}
                {song.album && (
                  <p className="text-lg text-gray-400">앨범: {song.album}</p>
                )}
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {song.year && (
                  <div className="bg-gray-800 p-3 rounded">
                    <p className="text-gray-500 text-sm mb-1">발매년도</p>
                    <p className="text-white font-bold">{song.year}</p>
                  </div>
                )}

                {song.userRating && (
                  <div className="bg-gray-800 p-3 rounded">
                    <p className="text-gray-500 text-sm mb-1">내 평점</p>
                    <div className="flex gap-0">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const displayRating = hoverTempRating > 0 ? hoverTempRating : currentRating;
                        const fillPercentage = Math.max(0, Math.min(displayRating - (starIndex - 1), 1));
                        
                        return (
                          <button
                            key={starIndex}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const isLeftHalf = x < rect.width / 2;
                              setHoverTempRating(isLeftHalf ? starIndex - 0.5 : starIndex);
                            }}
                            onMouseLeave={() => setHoverTempRating(0)}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const newRating = hoverTempRating > 0 ? hoverTempRating : starIndex;
                              try {
                                setCurrentRating(newRating);
                                setHoverTempRating(0);
                                await updateSong(songId, { userRating: newRating.toString() });
                              } catch (error) {
                                alert('평점 저장에 실패했습니다: ' + error.message);
                              }
                            }}
                            className="relative text-2xl cursor-pointer hover:scale-110 transition"
                          >
                            <span className="text-gray-600">★</span>
                            {fillPercentage > 0 && (
                              <span
                                className="absolute left-0 top-0 text-primary overflow-hidden"
                                style={{ width: `${Math.round(fillPercentage * 100)}%` }}
                              >
                                ★
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 구분선 */}
              <div className="border-t border-gray-700" />

              {/* 나의 코멘트 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-primary">나의 코멘트</h3>
                  <button
                    onClick={() => setIsEditingComment(!isEditingComment)}
                    className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                  >
                    {isEditingComment ? '취소' : '수정'}
                  </button>
                </div>

                {isEditingComment ? (
                  <div className="space-y-3">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="마크다운 형식으로 코멘트를 입력하세요. (#제목, **굵게**, *이탤릭*, - 리스트)"
                      className="w-full h-40 bg-gray-800 border border-gray-700 rounded p-3 text-white resize-none focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleSaveComment}
                      className="w-full px-4 py-2 bg-primary hover:bg-red-700 text-white font-bold rounded transition"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <div>
                    {comment ? (
                      <div
                        className="bg-gray-800 p-4 rounded text-gray-300 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(comment) }}
                      />
                    ) : (
                      <p className="text-gray-500 italic">코멘트가 없습니다</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: ZINDEX.MODAL_OVERLAY }}>
          <div className="bg-gray-900 rounded-lg max-w-md w-full">
            <div className="bg-gray-800 p-6 border-b border-gray-700">
              <h2 className="text-2xl font-black text-primary">삭제 확인</h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-300">
                정말로 <span className="text-primary font-bold">{song.title}</span>을(를) 삭제하시겠습니까?
              </p>
              <p className="text-gray-500 text-sm">이 작업은 되돌릴 수 없습니다.</p>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded transition disabled:opacity-50"
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
