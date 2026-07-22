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
  updateDoc,
} from 'firebase/firestore';
import { getDB } from '../lib/firebase';

const COLLECTIONS = {
  BOOKS: 'books',
  MOVIES: 'movies',
  MUSIC: 'music',
  SERIES: 'series',
};

export const addItem = async (collectionName, data, userId) => {
  if (!userId) throw new Error('사용자 ID가 필요합니다.');
  if (!data || typeof data !== 'object') throw new Error('유효한 데이터를 제공해주세요.');

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
};

export const deleteItem = async (collectionName, itemId) => {
  if (!itemId) throw new Error('삭제할 아이템 ID가 필요합니다.');
  const db = getDB();
  await deleteDoc(doc(db, collectionName, itemId));
};

export const getItems = async (collectionName, userId) => {
  if (!userId) throw new Error('사용자 ID가 필요합니다.');

  const db = getDB();
  const q = query(
    collection(db, collectionName),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const items = [];
  snapshot.forEach((itemDoc) => {
    const data = itemDoc.data();
    items.push({
      id: itemDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  });
  return items;
};

export const updateItem = async (collectionName, itemId, data) => {
  if (!itemId) throw new Error('업데이트할 아이템 ID가 필요합니다.');
  const db = getDB();
  await updateDoc(doc(db, collectionName, itemId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMultipleItems = async (collectionName, itemIds) => {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('삭제할 아이템 ID 배열이 필요합니다.');
  }

  const db = getDB();
  const batch = writeBatch(db);
  itemIds.forEach((itemId) => {
    batch.delete(doc(db, collectionName, itemId));
  });
  await batch.commit();
};

export const addBook = (bookData, userId) => addItem(COLLECTIONS.BOOKS, bookData, userId);
export const deleteBook = (bookId) => deleteItem(COLLECTIONS.BOOKS, bookId);
export const getBooks = (userId) => getItems(COLLECTIONS.BOOKS, userId);
export const deleteMultiBooks = (bookIds) => deleteMultipleItems(COLLECTIONS.BOOKS, bookIds);
export const updateBook = (bookId, data) => updateItem(COLLECTIONS.BOOKS, bookId, data);

export const addMovie = (movieData, userId) => addItem(COLLECTIONS.MOVIES, movieData, userId);
export const updateMovie = (movieId, data) => updateItem(COLLECTIONS.MOVIES, movieId, data);
export const deleteMovie = (movieId) => deleteItem(COLLECTIONS.MOVIES, movieId);
export const getMovies = (userId) => getItems(COLLECTIONS.MOVIES, userId);
export const deleteMultiMovies = (movieIds) => deleteMultipleItems(COLLECTIONS.MOVIES, movieIds);

export const addSong = (songData, userId) => addItem(COLLECTIONS.MUSIC, songData, userId);
export const updateSong = (songId, data) => updateItem(COLLECTIONS.MUSIC, songId, data);
export const deleteSong = (songId) => deleteItem(COLLECTIONS.MUSIC, songId);
export const getSongs = (userId) => getItems(COLLECTIONS.MUSIC, userId);
export const deleteMultiSongs = (songIds) => deleteMultipleItems(COLLECTIONS.MUSIC, songIds);

export const addSeries = (seriesData, userId) => addItem(COLLECTIONS.SERIES, seriesData, userId);
export const updateSeries = (seriesId, data) => updateItem(COLLECTIONS.SERIES, seriesId, data);
export const deleteSeries = (seriesId) => deleteItem(COLLECTIONS.SERIES, seriesId);
export const getSeries = (userId) => getItems(COLLECTIONS.SERIES, userId);
export const deleteMultiSeries = (seriesIds) => deleteMultipleItems(COLLECTIONS.SERIES, seriesIds);