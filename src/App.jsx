import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { initializeFirebase, getAuthService } from './firebase';
import { ZINDEX } from './constants/zIndex';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import MoviesList from './MoviesList';
import MovieDetail from './MovieDetail';
import BooksList from './BooksList';
import BookDetail from './BookDetail';
import MusicList from './MusicList';
import MusicDetail from './MusicDetail';
import SeriesList from './SeriesList';
import SeriesDetail from './SeriesDetail';
import SharePage from './SharePage';
import { getMovies, getBooks, getSongs, getSeries } from './services/firebaseService';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialCollectionsLoaded, setInitialCollectionsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [firebaseError, setFirebaseError] = useState(null);
  const [addedMovies, setAddedMovies] = useState([]);
  const [addedBooks, setAddedBooks] = useState([]);
  const [addedSongs, setAddedSongs] = useState([]);
  const [addedSeries, setAddedSeries] = useState([]);
  const useFirebaseEmulator = String(import.meta.env.VITE_USE_FIREBASE_EMULATOR || '').toLowerCase() === 'true';
  const isShareRoute = location.pathname.startsWith('/share/');

  // 경로에 따라 activeTab 업데이트
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('home');
    } else if (path.startsWith('/movies')) {
      setActiveTab('movies');
    } else if (path.startsWith('/books')) {
      setActiveTab('books');
    } else if (path.startsWith('/music')) {
      setActiveTab('music');
    } else if (path.startsWith('/series')) {
      setActiveTab('series');
    }
  }, [location.pathname]);

  // Firebase 초기화 및 로그인 상태 감시
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeFirebase();
        const auth = getAuthService();
        if (useFirebaseEmulator) {
          getRedirectResult(auth).catch((error) => {
            console.error('Google redirect login failed:', error);
          });
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        setFirebaseError('Firebase 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
      }
    };

    let unsubscribe;
    initApp().then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 로그인 직후 모든 컬렉션을 미리 로드해 상세 페이지 진입 시 데이터 누락을 방지
  useEffect(() => {
    let isMounted = true;

    const loadInitialCollections = async () => {
      if (!user?.uid) {
        if (isMounted) setInitialCollectionsLoaded(false);
        return;
      }

      if (isMounted) setInitialCollectionsLoaded(false);

      try {
        const [movies, books, songs, series] = await Promise.all([
          getMovies(user.uid).catch(() => []),
          getBooks(user.uid).catch(() => []),
          getSongs(user.uid).catch(() => []),
          getSeries(user.uid).catch(() => []),
        ]);

        if (!isMounted) return;
        setAddedMovies(movies);
        setAddedBooks(books);
        setAddedSongs(songs);
        setAddedSeries(series);
      } finally {
        if (isMounted) setInitialCollectionsLoaded(true);
      }
    };

    loadInitialCollections();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const isAuthEmulatorReachable = async () => {
    try {
      await fetch('http://localhost:9099/', { mode: 'no-cors' });
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const auth = getAuthService();

      if (isLocalhost && useFirebaseEmulator) {
        const emulatorReady = await isAuthEmulatorReachable();
        if (!emulatorReady) {
          alert('Auth emulator (9099) is not running. Start it with: firebase emulators:start --only auth,firestore,functions');
          return;
        }

        await signInWithRedirect(auth, googleProvider);
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error('Google popup login failed:', error);
      alert('Login failed (' + (error.code || 'unknown') + '): ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuthService();
      await signOut(auth);
      setUser(null);
    } catch (error) {
      // 로그아웃 실패 처리
    }
  };

  const handleSharePage = async () => {
    if (!user?.uid) return;

    const shareUrl = `${window.location.origin}/share/${user.uid}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'FAV-THING 공유',
          text: '내 취향 목록 공유 페이지',
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert('공유 링크를 복사했습니다.');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        window.prompt('공유 링크를 복사하세요:', shareUrl);
      }
    }
  };

  // 모든 hooks를 먼저 호출한 후 조건부 렌더링
  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    );
  }

  if (isShareRoute) {
    return (
      <Routes>
        <Route path="/share/:userId" element={<SharePage />} />
      </Routes>
    );
  }

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-5xl font-black text-primary mb-4">⚠️ 오류</h1>
          <p className="text-red-400 mb-8">{firebaseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-4 bg-primary hover:bg-red-700 text-white font-bold rounded-lg transition"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-5xl font-black text-primary mb-4">FAV-THING</h1>
          <p className="text-gray-300 mb-8">
            내 관심 분야들을 한 곳에 모아 관리하세요
          </p>
          <button
            onClick={handleGoogleLogin}
            className="w-full px-6 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-3 mb-4"
          >
            <span className="material-icons-outlined">login</span>
            Google로 로그인
          </button>
          <p className="text-gray-500 text-sm">
            로그인 후 책, 영화, 음악, 시리즈를 추가할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  // 로그인한 상태 - 여기서부터 user가 존재함을 보장
  const navItems = [
    { id: 'movies', label: 'Movies', icon: 'movie' },
    { id: 'series', label: 'Series', icon: 'theaters' },
    { id: 'books', label: 'Books', icon: 'menu_book' },
    { id: 'music', label: 'Music', icon: 'music_note' },
  ];

  return (
    <div className="min-h-screen bg-background-dark text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full flex items-center justify-between px-4 md:px-12 py-4 navbar-blur" style={{ zIndex: ZINDEX.NAVBAR }}>
        <div className="flex items-center space-x-8">
          <h1 className="text-primary font-black text-2xl tracking-tighter cursor-pointer" onClick={() => navigate('/')}>
            FAV-THING
          </h1>
          <ul className="hidden md:flex space-x-5 text-sm font-medium text-gray-300">
            {navItems.map((item) => (
              <li
                key={item.id}
                onClick={() => navigate(`/${item.id}`)}
                className={`cursor-pointer transition ${
                  activeTab === item.id ? 'text-primary font-bold' : 'hover:text-white'
                }`}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center space-x-6 text-gray-300">
          <span className="material-icons-outlined cursor-pointer hover:text-white">search</span>
          <button
            type="button"
            onClick={handleSharePage}
            className="flex items-center gap-1 hover:text-white transition"
            title="공유 링크"
          >
            <span className="material-icons-outlined">share</span>
            <span className="hidden md:inline text-xs font-bold">공유</span>
          </button>
          <div className="relative group">
            <div className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 bg-blue-600 rounded-full overflow-hidden">
                <img
                  alt="Profile"
                  src={user.photoURL || 'https://via.placeholder.com/32'}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden md:inline text-sm font-medium">{user.displayName || 'User'}</span>
              <span className="material-icons-outlined text-sm group-hover:rotate-180 transition-transform">
                arrow_drop_down
              </span>
            </div>
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
              <div className="px-4 py-2 border-b border-gray-700">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition flex items-center gap-2"
              >
                <span className="material-icons-outlined text-sm">logout</span>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Homepage user={user} />} />
          <Route path="/movies" element={<MoviesList userId={user.uid} onMoviesLoad={setAddedMovies} />} />
          <Route
            path="/movies/:movieId"
            element={initialCollectionsLoaded ? <MovieDetail movies={addedMovies} userId={user.uid} /> : <DetailLoading />}
          />
          <Route path="/books" element={<BooksList userId={user.uid} onBooksLoad={setAddedBooks} />} />
          <Route
            path="/books/:bookId"
            element={initialCollectionsLoaded ? <BookDetail books={addedBooks} userId={user.uid} /> : <DetailLoading />}
          />
          <Route path="/music" element={<MusicList userId={user.uid} onMusicLoad={setAddedSongs} />} />
          <Route
            path="/music/:songId"
            element={initialCollectionsLoaded ? <MusicDetail songs={addedSongs} userId={user.uid} /> : <DetailLoading />}
          />
          <Route path="/series" element={<SeriesList userId={user.uid} onSeriesLoad={setAddedSeries} />} />
          <Route
            path="/series/:seriesId"
            element={initialCollectionsLoaded ? <SeriesDetail series={addedSeries} userId={user.uid} /> : <DetailLoading />}
          />
        </Routes>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-gray-900 border-t border-gray-800 flex items-center justify-between px-2" style={{ zIndex: ZINDEX.NAVBAR }}>
        {[
          { id: 'movies', label: 'Movies', icon: 'movie' },
          { id: 'series', label: 'Series', icon: 'theaters' },
          { id: 'home', label: 'Home', icon: 'home' },
          { id: 'books', label: 'Books', icon: 'menu_book' },
          { id: 'music', label: 'Music', icon: 'music_note' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id === 'home' ? '/' : `/${item.id}`)}
            className={`flex-1 flex flex-col items-center justify-center py-3 transition ${
              activeTab === item.id ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-icons-outlined text-2xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Homepage Component
function Homepage({ user }) {
  const navigate = useNavigate();
  const [allContent, setAllContent] = useState({ movies: [], books: [], music: [], series: [] });
  const [loading, setLoading] = useState(true);

  const normalizeDate = (value) => {
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value || 0);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  useEffect(() => {
    const loadAllContent = async () => {
      try {
        if (!user?.uid) return;

        const [movies, books, music, series] = await Promise.all([
          getMovies(user.uid).catch(() => []),
          getBooks(user.uid).catch(() => []),
          getSongs(user.uid).catch(() => []),
          getSeries(user.uid).catch(() => [])
        ]);

        setAllContent({ movies, books, music, series });
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllContent();
  }, [user?.uid]);

  // 정렬 함수
  const getSortedItems = (items, sortBy, sortOrder) => {
    let sorted = [...items];

    if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const dateA = normalizeDate(a.createdAt);
        const dateB = normalizeDate(b.createdAt);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else if (sortBy === 'year' || sortBy === 'releaseYear') {
      sorted.sort((a, b) => {
        const yearA = parseInt(a.year || a.releaseYear) || 0;
        const yearB = parseInt(b.year || b.releaseYear) || 0;
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

  // localStorage에서 정렬 설정 가져오기
  const movieSortBy = localStorage.getItem('moviesSortBy') || localStorage.getItem('movieSortBy') || 'date';
  const movieSortOrder = localStorage.getItem('moviesSortOrder') || localStorage.getItem('movieSortOrder') || 'desc';
  const bookSortBy = localStorage.getItem('booksSortBy') || localStorage.getItem('bookSortBy') || 'date';
  const bookSortOrder = localStorage.getItem('booksSortOrder') || localStorage.getItem('bookSortOrder') || 'desc';
  const musicSortBy = localStorage.getItem('musicSortBy') || 'date';
  const musicSortOrder = localStorage.getItem('musicSortOrder') || 'desc';
  const seriesSortBy = localStorage.getItem('seriesSortBy') || 'date';
  const seriesSortOrder = localStorage.getItem('seriesSortOrder') || 'desc';

  // 정렬된 데이터
  const sortedMovies = getSortedItems(allContent.movies, movieSortBy, movieSortOrder);
  const sortedBooks = getSortedItems(allContent.books, bookSortBy, bookSortOrder);
  const sortedMusic = getSortedItems(allContent.music, musicSortBy, musicSortOrder);
  const sortedSeries = getSortedItems(allContent.series, seriesSortBy, seriesSortOrder);

  const ContentSection = ({ title, items, icon, path }) => {
    if (items.length === 0) return null;

    return (
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-black text-primary flex items-center gap-2">
            <span className="material-icons-outlined">{icon}</span>
            {title}
          </h3>
          <button
            onClick={() => navigate(`/${path}`)}
            className="text-gray-400 hover:text-white transition text-sm font-bold"
          >
            모두 보기 →
          </button>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide">
          {items.slice(0, 8).map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/${path}/${item.id}`)}
              className="flex-shrink-0 w-48 cursor-pointer group"
            >
              <div className="relative overflow-hidden rounded-lg h-72 mb-3">
                {item.image || item.albumImg ? (
                  <img
                    src={item.image || item.albumImg}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="material-icons-outlined text-4xl text-gray-500">{icon}</span>
                  </div>
                )}
              </div>
              <h4 className="font-bold text-white line-clamp-2 group-hover:text-primary transition">
                {item.title}
              </h4>
              <p className="text-gray-400 text-sm line-clamp-1">
                {item.author || item.artist || item.director || ''}
              </p>
              {item.userRating && (
                <div className="flex gap-0 text-sm mt-1">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const rating = parseFloat(item.userRating) || 0;
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
          ))}
        </div>
      </section>
    );
  };

  return (
    <div>
      {/* Hero Section - Simplified */}
      <header className="relative pt-12 pb-8 px-4 md:px-12">
        <div className="max-w-7xl">
          <h1 className="text-5xl md:text-6xl font-black text-primary mb-2">
            FAV-THING
          </h1>
          <p className="text-gray-400 text-lg">당신의 취향을 한곳에서 관리하세요</p>
        </div>
      </header>

      {/* Content Sections */}
      <main className="px-4 md:px-12 pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-400">로드 중...</div>
          </div>
        ) : (
          <>
            {sortedMovies.length > 0 && (
              <ContentSection
                title="내 영화"
                items={sortedMovies}
                icon="movie"
                path="movies"
              />
            )}
            {sortedSeries.length > 0 && (
              <ContentSection
                title="내 시리즈"
                items={sortedSeries}
                icon="theaters"
                path="series"
              />
            )}
            {sortedBooks.length > 0 && (
              <ContentSection
                title="내 책"
                items={sortedBooks}
                icon="menu_book"
                path="books"
              />
            )}
            {sortedMusic.length > 0 && (
              <ContentSection
                title="내 음악"
                items={sortedMusic}
                icon="music_note"
                path="music"
              />
            )}

            {allContent.movies.length === 0 &&
              allContent.books.length === 0 &&
              allContent.music.length === 0 &&
              allContent.series.length === 0 && (
                <div className="text-center py-20">
                  <span className="material-icons-outlined text-6xl text-gray-600 mx-auto block mb-4">
                    favorite_border
                  </span>
                  <h3 className="text-2xl font-bold text-gray-400 mb-2">아직 추가한 내용이 없습니다</h3>
                  <p className="text-gray-500">상단의 메뉴에서 영화, 책, 음악, 시리즈를 추가해보세요!</p>
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}

function DetailLoading() {
  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center">
      <div className="text-white text-lg">로딩 중...</div>
    </div>
  );
}
