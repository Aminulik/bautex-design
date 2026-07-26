import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';
import favoritesReducer from './favoritesSlice';
import cartReducer from './cartSlice'; // создадим следующим шагом

const cartPersistConfig = {
  key: 'cart',
  storage,
  whitelist: ['items'], // сохраняем только массив items
};

const favoritesPersistConfig = {
  key: 'favorites',
  storage,
  whitelist: ['items'],
};

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'user'], // сохраняем сессию
};

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    favorites: persistReducer(favoritesPersistConfig, favoritesReducer),
    cart: persistReducer(cartPersistConfig, cartReducer),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
