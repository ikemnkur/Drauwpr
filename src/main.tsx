import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// const THEME_STORAGE_KEY = 'prolifer8-theme';
// const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

// if (storedTheme === 'dark' || storedTheme === 'light') {
//   document.documentElement.dataset.theme = storedTheme;
// } else {
//   document.documentElement.dataset.theme = 'light';
//   window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
// }


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
