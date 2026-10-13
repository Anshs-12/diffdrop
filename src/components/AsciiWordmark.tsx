import React, { useEffect, useRef } from 'react';

/**
 * "diffdrop" as ASCII art with a reflection that flows like water.
 *
 * The word is drawn in the site font on an offscreen canvas and sampled cell by
 * cell: each cell becomes a character whose visual weight matches how much of
 * it the letters cover. The letters never change; only the rows underneath them
 * are redrawn, a dozen times a second, as a rippling reflection plus a couple of
 * rolling wave lines. Every line is padded to the same width so nothing shifts.
 * Everything happens in the browser.
 */

const WORD = 'diffdrop';
const COLS = 150;
/** Geist Mono advance is 0.6em and the <pre> uses line-height 1, so a cell is 1 / 0.6 as tall as wide. */
const CELL_ASPECT = 1 / 0.6;
const REFLECTION_ROWS = 6;
const WAVE_ROWS = 2;
const FRAME_MS = 85;

/** Ordered from lightest to densest. */
const RAMP = " .'`,:;-~=+il!|1tfjrxnvczuJCLUQ0OZ";

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(coverage: number, x: number, y: number): string {
  if (coverage < 0.04) return ' ';
  // A little noise so solid areas get texture instead of one repeated character
  const v = Math.min(1, Math.max(0, coverage + (hash(x, y) - 0.5) * 0.16));
  return RAMP[Math.max(1, Math.round(v * (RAMP.length - 1)))]!;
}

interface Art {
  /** Every row that contains part of a letter (descenders included): never changes. */
  head: string;
  /** Coverage of the rows just above the baseline, nearest first; mirrored into the water. */
  mirror: number[][];
  /** Columns the word spans, for fading the wave lines at the ends. */
  first: number;
  last: number;
}

async function build(): Promise<Art> {
  const family = '"Geist Variable", ui-sans-serif, system-ui, sans-serif';
  const size = 120;
  try {
    await document.fonts.load(`700 ${size}px "Geist Variable"`);
  } catch {
    // Fall back to whatever sans-serif is available
  }

  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `700 ${size}px ${family}`;
  const m = probe.measureText(WORD);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const textW = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;

  const pad = size * 0.06;
  const cellW = (textW + pad * 2) / COLS;
  const cellH = cellW * CELL_ASPECT;
  const rows = Math.ceil((ascent + descent + pad * 2) / cellH);

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(COLS * cellW);
  canvas.height = Math.ceil(rows * cellH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.font = `700 ${size}px ${family}`;
  ctx.fillStyle = '#000';
  ctx.fillText(WORD, pad + m.actualBoundingBoxLeft, pad + ascent);

  const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const coverage: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    const y0 = Math.floor(r * cellH);
    const y1 = Math.min(canvas.height, Math.floor((r + 1) * cellH));
    for (let c = 0; c < COLS; c++) {
      const x0 = Math.floor(c * cellW);
      const x1 = Math.min(canvas.width, Math.floor((c + 1) * cellW));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += data[(y * width + x) * 4 + 3]!;
          n++;
        }
      }
      row.push(n ? sum / (n * 255) : 0);
    }
    coverage.push(row);
  }

  const lines = coverage.map((row, r) => row.map((v, c) => pick(v, c, r)).join(''));
  const baselineRow = Math.min(rows - 1, Math.floor((pad + ascent) / cellH));

  let top = 0;
  while (top < baselineRow && !lines[top]!.trim()) top++;
  let bottom = lines.length - 1;
  while (bottom > baselineRow && !lines[bottom]!.trim()) bottom--;

  let first = COLS;
  let last = 0;
  for (const row of coverage) {
    row.forEach((v, c) => {
      if (v > 0.1) {
        first = Math.min(first, c);
        last = Math.max(last, c);
      }
    });
  }

  return {
    // Padded to full width so the block never changes size (and never shifts)
    head: lines.slice(top, bottom + 1).map((l) => l.padEnd(COLS, ' ')).join('\n'),
    mirror: Array.from({ length: REFLECTION_ROWS }, (_, k) => coverage[baselineRow - k] ?? []),
    first,
    last,
  };
}

/** The water under the word at time `t` (seconds): reflection, then rolling waves. */
function water(art: Art, t: number): string {
  const out: string[] = [];
  const tick = Math.floor(t * 7); // sparkle pattern changes ~7 times a second

  for (let k = 0; k < REFLECTION_ROWS; k++) {
    const src = art.mirror[k]!;
    const depth = k / REFLECTION_ROWS;
    const drift = Math.sin(t * 0.7 + k * 0.6) * 1.4;
    let line = '';
    for (let c = 0; c < COLS; c++) {
      // Ripples grow with depth; the whole row also drifts slowly side to side
      const wobble = Math.sin(c * 0.33 + t * 2.4 + k * 0.9) * (0.5 + depth * 2.2);
      const v = src[Math.round(c + wobble + drift)] ?? 0;
      const intensity = v * (1 - depth * 0.85);
      const n = hash(c + 7 * k, tick * 131 + k);
      if (intensity < 0.22 || n > 0.3 + intensity * 0.55) {
        line += ' ';
      } else if (intensity > 0.6) {
        line += n < 0.4 ? '~' : '=';
      } else if (intensity > 0.4) {
        line += n < 0.5 ? '-' : ':';
      } else {
        line += n < 0.5 ? '.' : "'";
      }
    }
    out.push(line);
  }

  // Rolling wave lines across the width of the word, fading at the ends
  for (let w = 0; w < WAVE_ROWS; w++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const edge = Math.min(c - art.first, art.last - c) / 12;
      if (edge <= 0) {
        line += ' ';
        continue;
      }
      const s = Math.sin(c * 0.21 - t * 1.9 + w * 1.7) + 0.6 * Math.sin(c * 0.067 + t * 0.8 - w);
      const fade = Math.min(1, edge) * (1 - w * 0.35);
      const h = hash(c, tick * 17 + w * 5);
      line += s * fade > 1.05 ? '~' : s * fade > 0.65 && h < 0.6 ? '-' : s * fade > 0.2 && h < 0.18 ? '.' : ' ';
    }
    out.push(line);
  }

  return out.map((l) => l.padEnd(COLS, ' ').slice(0, COLS)).join('\n');
}

const AsciiWordmark: React.FC<{ className?: string }> = ({ className }) => {
  const headRef = useRef<HTMLPreElement>(null);
  const waterRef = useRef<HTMLPreElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let visible = false;
    let last = 0;
    let art: Art | null = null;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();

    const draw = (now: number) => {
      if (!art || !waterRef.current) return;
      waterRef.current.textContent = water(art, (now - start) / 1000);
    };

    const loop = (now: number) => {
      raf = 0;
      if (!alive || !visible) return;
      if (now - last >= FRAME_MS) {
        last = now;
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    };

    // Only animate while the footer is on screen (rAF already pauses in hidden tabs)
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible && !still && !raf) raf = requestAnimationFrame(loop);
    });

    void build().then((a) => {
      if (!alive) return;
      art = a;
      if (headRef.current) headRef.current.textContent = a.head;
      draw(start + 1200); // a settled first frame, also the only one with reduced motion
      if (wrapRef.current) io.observe(wrapRef.current);
    });

    return () => {
      alive = false;
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      <span className="sr-only">diffdrop</span>
      <div className="ascii-wordmark" aria-hidden="true">
        <pre ref={headRef} />
        <pre ref={waterRef} className="ascii-water" />
      </div>
    </div>
  );
};

export default AsciiWordmark;
