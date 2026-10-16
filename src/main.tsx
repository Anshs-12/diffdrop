import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import App from './App';
import { readPage } from './variant';
import './index.css';

// Entry for the diff pages (/diff-checker/ and /json-diff/); the home page uses home/main.tsx, the JSON tools tools/main.tsx
const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App variant={readPage(root) === 'json-diff' ? 'json' : 'text'} />
  </React.StrictMode>,
);
