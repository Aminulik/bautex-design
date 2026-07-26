import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './index';
import { logout } from './authSlice';

const API_URL = (process.env.API_BASE_URL || '/api') as string;
const FAVORITES_STORAGE_KEY = 'bautex_favorites';

interface FavoritesState {
  items: string[];
  loading: boolean;
  error: string | null;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message = 'Request failed') {
    super(message);
    this.status = status;
  }
}

const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

const readLocalFavorites = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeLocalFavorites = (items: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(new Set(items))));
};

const requestJson = async <T>(path: string, options: RequestInit = {}, token?: string | null) => {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.message || data?.error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const initialState: FavoritesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchFavorites = createAsyncThunk<
  string[],
  void,
  { state: RootState; dispatch: AppDispatch }
>('favorites/fetch', async (_, { getState, dispatch }) => {
  const token = getState().auth.token;

  if (!token) {
    return readLocalFavorites();
  }

  try {
    const data = await requestJson<string[]>('/favorites', {}, token);
    const serverItems = Array.isArray(data) ? data : [];
    const localItems = readLocalFavorites();
    const mergedItems = Array.from(new Set([...serverItems, ...localItems]));
    const unsyncedItems = localItems.filter((productId) => !serverItems.includes(productId));

    if (unsyncedItems.length) {
      await Promise.allSettled(
        unsyncedItems.map((productId) =>
          requestJson('/favorites', { method: 'POST', body: JSON.stringify({ productId }) }, token)
        )
      );
    }

    writeLocalFavorites(mergedItems);
    return mergedItems;
  } catch (error) {
    if (isUnauthorized(error)) {
      dispatch(logout());
      return [];
    }
    throw error;
  }
});

export const addToFavorites = createAsyncThunk<
  string,
  string,
  { state: RootState; dispatch: AppDispatch }
>('favorites/add', async (productId, { getState, dispatch }) => {
  const token = getState().auth.token;

  if (!token) {
    writeLocalFavorites([...readLocalFavorites(), productId]);
    return productId;
  }

  try {
    await requestJson('/favorites', { method: 'POST', body: JSON.stringify({ productId }) }, token);
    writeLocalFavorites([...readLocalFavorites(), productId]);
    return productId;
  } catch (error) {
    if (isUnauthorized(error)) {
      dispatch(logout());
      throw new Error('Session expired. Please sign in again.');
    }
    throw error;
  }
});

export const removeFromFavorites = createAsyncThunk<
  string,
  string,
  { state: RootState; dispatch: AppDispatch }
>('favorites/remove', async (productId, { getState, dispatch }) => {
  const token = getState().auth.token;

  if (!token) {
    writeLocalFavorites(readLocalFavorites().filter((id) => id !== productId));
    return productId;
  }

  try {
    await requestJson(`/favorites/${encodeURIComponent(productId)}`, { method: 'DELETE' }, token);
    writeLocalFavorites(readLocalFavorites().filter((id) => id !== productId));
    return productId;
  } catch (error) {
    if (isUnauthorized(error)) {
      dispatch(logout());
      throw new Error('Session expired. Please sign in again.');
    }
    throw error;
  }
});

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        writeLocalFavorites(action.payload);
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка загрузки избранного';
      })
      .addCase(addToFavorites.fulfilled, (state, action) => {
        if (!state.items.includes(action.payload)) {
          state.items.push(action.payload);
        }
        writeLocalFavorites(state.items);
      })
      .addCase(removeFromFavorites.fulfilled, (state, action) => {
        state.items = state.items.filter((id) => id !== action.payload);
        writeLocalFavorites(state.items);
      });
  },
});

export default favoritesSlice.reducer;
