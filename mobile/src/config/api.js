const fallbackBase = 'https://us-central1-favthing-cb626.cloudfunctions.net/api';

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || fallbackBase;

export const buildApiUrl = (path) => {
  const base = apiBaseUrl.replace(/\/$/, '');
  const suffix = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${base}${suffix}`;
};