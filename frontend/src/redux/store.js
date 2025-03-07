import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';
import teamReducer from './teamSlice';
import calendarReducer from './calendarSlice';
import ganttReducer from './ganttSlice';
import listReducer from './listSlice';
import cardReducer from './cardSlice';
import configurationsReducer from './configurationSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  team: teamReducer,
  configurations: configurationsReducer,
  calendar: calendarReducer,
  gantt: ganttReducer,
  lists: listReducer,
  cards: cardReducer, // Changed from 'card' to 'cards'
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'team', 'configurations'], 
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