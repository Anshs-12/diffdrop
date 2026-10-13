import React from 'react';

/**
 * The diffdrop mark: three lines of a diff — one removed, one kept, one added —
 * on an ink tile. Colors come from theme tokens so it inverts with dark mode.
 */
export const LogoMark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="var(--text)" />
    <rect x="8" y="9" width="10" height="3" rx="1.5" fill="var(--logo-del)" />
    <rect x="8" y="14.5" width="16" height="3" rx="1.5" fill="var(--bg)" opacity="0.55" />
    <rect x="14" y="20" width="10" height="3" rx="1.5" fill="var(--logo-add)" />
  </svg>
);
