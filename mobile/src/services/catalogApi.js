import { buildApiUrl } from '../config/api';

const parseJsonResponse = async (response, fallbackMessage) => {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || fallbackMessage;
    throw new Error(message);
  }

  return payload;
};

const requestJson = async (path, fallbackMessage) => {
  const response = await fetch(buildApiUrl(path), { method: 'GET' });
  return parseJsonResponse(response, fallbackMessage);
};

export const searchMovies = async (keyword) => {
  const data = await requestJson(
    `/kmdb/search/movie?query=${encodeURIComponent(keyword)}`,
    '영화 검색에 실패했습니다.'
  );
  return data?.results || [];
};

export const searchBooks = async (keyword) => {
  const data = await requestJson(
    `/naver/search/book?query=${encodeURIComponent(keyword)}&display=20&start=1&sort=sim`,
    '도서 검색에 실패했습니다.'
  );
  return data?.items || [];
};

export const searchSongs = async (keyword) => {
  const data = await requestJson(
    `/melona/search/song?query=${encodeURIComponent(keyword)}`,
    '음악 검색에 실패했습니다.'
  );
  return Array.isArray(data) ? data : [];
};

export const searchSeries = async (keyword) => {
  const data = await requestJson(
    `/tmdb/search/tv?query=${encodeURIComponent(keyword)}`,
    '시리즈 검색에 실패했습니다.'
  );
  return data?.results || [];
};

export const getSeriesDetail = async (tmdbId) => {
  return requestJson(`/tmdb/tv/${encodeURIComponent(tmdbId)}`, '시리즈 상세 정보를 불러오지 못했습니다.');
};

export const tmdbPosterUrl = (path) => {
  if (!path) return '';
  if (String(path).startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/w300${path}`;
};
