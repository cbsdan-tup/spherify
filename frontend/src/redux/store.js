import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';
import teamReducer from './teamSlice';

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  team: teamReducer,
  // ...other reducers
});

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'team'], // Add reducers you want to persist
};

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

const persistor = persistStore(store);

export { store, persistor };