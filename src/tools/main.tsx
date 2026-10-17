import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import ToolApp from './ToolApp';
import { readPage } from '@/variant';
import '@/index.css';

// Entry for the tool pages (JSON tools, Base64, JWT, …); doesn't load the diff app
const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ToolApp page={readPage(root)} />
  </React.StrictMode>,
);
