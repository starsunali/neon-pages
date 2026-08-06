// Axios instance pointed at the Neon Pages API with silent access-token
// refresh on 401 responses.

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getAccessToken, setTokens, clearTokens } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the HttpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Queue requests made while a refresh is in-flight so only one refresh runs.
let isRefreshing = false;
let waiters: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  waiters.forEach((cb) => cb(token));
  waiters = [];
}

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => waiters.push(resolve));
  }
  isRefreshing = true;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, undefined, {
      withCredentials: true,
    });
    const { accessToken, refreshToken } = data as {
      accessToken: string;
      refreshToken: string;
    };
    setTokens(accessToken, refreshToken);
    onRefreshed(accessToken);
    return accessToken;
  } catch {
    clearTokens();
    onRefreshed(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  } finally {
    isRefreshing = false;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);