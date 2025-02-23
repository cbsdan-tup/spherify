import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';
import teamReducer from './teamSlice';
import calendarReducer from './calendarSlice';
import boardReducer from './boardSlice';
import listReducer from './listSlice';
import cardReducer from './cardSlice';
import ganttReducer from './ganttSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  team: teamReducer,
  calendar: calendarReducer,
  boards: boardReducer,
  lists: listReducer,
  cards: cardReducer,
  gantt: ganttReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'team'], 
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

const persistor = persistStore(store);

export { store, persistor };