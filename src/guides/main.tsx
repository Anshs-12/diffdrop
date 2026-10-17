import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { readPage } from '@/variant';
import GuideApp from './GuideApp';
import type { GuideId } from './content';
import '@/index.css';

// Entry for the guide pages
const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <GuideApp page={readPage(root) as GuideId} />
  </React.StrictMode>,
);
