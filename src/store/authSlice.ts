import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = (process.env.API_BASE_URL || '/api') as string;

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const readStoredUser = (): User | null => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser) as Partial<User>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.email !== 'string') {
      throw new Error('Invalid user payload');
    }

    return {
      id: Number(parsed.id) || 0,
      email: parsed.email,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      role: typeof parsed.role === 'string' ? parsed.role : 'user',
    };
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};

const storedUser = readStoredUser();
const storedToken = storedUser ? localStorage.getItem('token') : null;

const initialState: AuthState = {
  user: storedUser,
  token: storedToken || null,
  loading: false,
  error: null,
};

const postJson = async <T>(path: string, body: unknown) => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || data?.error || 'Ошибка запроса');
  }

  return (await response.json()) as T;
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const data = await postJson<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const data = await postJson<{ token: string; user: User }>('/auth/register', {
      email,
      password,
      name,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка входа';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка регистрации';
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
