import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { decodeHash } from '@/lib/share';
import HomeApp from './HomeApp';
import '@/index.css';

// Links shared before the diff checker moved to /diff-checker/ look like /#<texts>
if (decodeHash(window.location.hash)) {
  window.location.replace(`/diff-checker/${window.location.hash}`);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HomeApp />
    </React.StrictMode>,
  );
}
