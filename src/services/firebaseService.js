import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDB } from '../firebase';

const COLLECTIONS = {
  BOOKS: 'books',
  MOVIES: 'movies',
  MUSIC: 'music',
  SERIES: 'series',
};

/**
 * 아이템 추가 (userId와 함께 저장)
 * @param {string} collectionName - 컬렉션 이름
 * @param {object} data - 저장할 데이터
 * @param {string} userId - 사용자 ID
 * @returns {object} - 저장된 문서 (id 포함)
 */
export const addItem = async (collectionName, data, userId) => {
  if (!userId) {
    throw new Error('사용자 ID가 필요합니다.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('유효한 데이터를 제공해주세요.');
  }

  try {
    const db = getDB();
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...data,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(`${collectionName}에 아이템 추가 실패:`, error);
    throw new Error(`${collectionName} 추가 실패: ${error.message}`);
  }
};

/**
 * 아이템 삭제
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} itemId - 문서 ID
 */
export const deleteItem = async (collectionName, itemId) => {
  if (!itemId) {
    throw new Error('삭제할 아이템 ID가 필요합니다.');
  }

  try {
    const db = getDB();
    await deleteDoc(doc(db, collectionName, itemId));
  } catch (error) {
    console.error(`${collectionName}에서 아이템 삭제 실패:`, error);
    throw new Error(`삭제 실패: ${error.message}`);
  }
};

/**
 * 사용자의 데이터만 가져오기
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} userId - 사용자 ID
 * @returns {array} - 문서 배열
 */
export const getItems = async (collectionName, userId) => {
  if (!userId) {
    throw new Error('사용자 ID가 필요합니다.');
  }

  try {
    const db = getDB();
    const q = query(
      collection(db, collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const items = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      });
    });

    return items;
  } catch (error) {
    console.error(`${collectionName}에서 데이터 로드 실패:`, error);
    throw new Error(`데이터 로드 실패: ${error.message}`);
  }
};

/**
 * 아이템 업데이트
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} itemId - 문서 ID
 * @param {object} data - 업데이트할 데이터
 */
export const updateItem = async (collectionName, itemId, data) => {
  if (!itemId) {
    throw new Error('업데이트할 아이템 ID가 필요합니다.');
  }

  try {
    const db = getDB();
    await updateDoc(doc(db, collectionName, itemId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`${collectionName}에서 아이템 업데이트 실패:`, error);
    throw new Error(`업데이트 실패: ${error.message}`);
  }
};

/**
 * 여러 아이템 일괄 삭제
 * @param {string} collectionName - 컬렉션 이름
 * @param {array} itemIds - 문서 ID 배열
 */
export const deleteMultipleItems = async (collectionName, itemIds) => {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('삭제할 아이템 ID 배열이 필요합니다.');
  }

  const db = getDB();
  const batch = writeBatch(db);

  itemIds.forEach((itemId) => {
    batch.delete(doc(db, collectionName, itemId));
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error(`${collectionName}에서 일괄 삭제 실패:`, error);
    throw new Error(`일괄 삭제 실패: ${error.message}`);
  }
};

// ========== 책 ==========
export const addBook = (bookData, userId) => addItem(COLLECTIONS.BOOKS, bookData, userId);
export const deleteBook = (bookId) => deleteItem(COLLECTIONS.BOOKS, bookId);
export const getBooks = (userId) => getItems(COLLECTIONS.BOOKS, userId);
export const deleteMultiBooks = (bookIds) => deleteMultipleItems(COLLECTIONS.BOOKS, bookIds);
export const updateBook = (bookId, data) => updateItem(COLLECTIONS.BOOKS, bookId, data);

// ========== 영화 ==========
export const addMovie = (movieData, userId) => addItem(COLLECTIONS.MOVIES, movieData, userId);
export const updateMovie = (movieId, data) => updateItem(COLLECTIONS.MOVIES, movieId, data);
export const deleteMovie = (movieId) => deleteItem(COLLECTIONS.MOVIES, movieId);
export const getMovies = (userId) => getItems(COLLECTIONS.MOVIES, userId);
export const deleteMultiMovies = (movieIds) => deleteMultipleItems(COLLECTIONS.MOVIES, movieIds);

// ========== 음악 ==========
export const addSong = (songData, userId) => addItem(COLLECTIONS.MUSIC, songData, userId);
export const updateSong = (songId, data) => updateItem(COLLECTIONS.MUSIC, songId, data);
export const deleteSong = (songId) => deleteItem(COLLECTIONS.MUSIC, songId);
export const getSongs = (userId) => getItems(COLLECTIONS.MUSIC, userId);
export const deleteMultiSongs = (songIds) => deleteMultipleItems(COLLECTIONS.MUSIC, songIds);

// ========== 시리즈 ==========
export const addSeries = (seriesData, userId) => addItem(COLLECTIONS.SERIES, seriesData, userId);
export const updateSeries = (seriesId, data) => updateItem(COLLECTIONS.SERIES, seriesId, data);
export const deleteSeries = (seriesId) => deleteItem(COLLECTIONS.SERIES, seriesId);
export const getSeries = (userId) => getItems(COLLECTIONS.SERIES, userId);
export const deleteMultiSeries = (seriesIds) => deleteMultipleItems(COLLECTIONS.SERIES, seriesIds);
