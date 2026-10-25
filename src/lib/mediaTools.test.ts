import { describe, expect, it } from 'vitest';
import { contrast, parseColor, toHex } from './color';
import { checkPair, flatten, formatRatio, results, suggestText } from './contrastCheck';
import { exportPalette, monochrome, oklchToRgba, palettes, rotate, scale, slugName, toOklch, nearestStep } from './palette';
import { commonSizes, gcd, parseRatio, parseSide, simplify, solve } from './aspectRatio';
import { buildIco, faviconHtml, fitBox, halvingSteps, lockedSide, outputName, pngSize, savings, targetSize, webManifest } from './imageMath';
import { describeReport, formatNumber, isEditorAttribute, isUnsafeUrl, roundLength, roundList, roundPath, roundTransform } from './svgOptimize';
import { TOOL_CONTENT } from '@/tools/content';

const c = (s: string) => parseColor(s)!;

describe('contrast checker', () => {
  it('matches known WCAG ratios', () => {
    expect(contrast(c('#000'), c('#fff'))).toBe(21);
    expect(formatRatio(contrast(c('#000'), c('#fff')))).toBe('21.00');
    expect(contrast(c('#777'), c('#fff'))).toBeCloseTo(4.48, 2);
    expect(formatRatio(contrast(c('#777'), c('#fff')))).toBe('4.47');
    expect(contrast(c('#fff'), c('#fff'))).toBe(1);
    expect(contrast(c('#767676'), c('#fff'))).toBeCloseTo(4.54, 2);
  });

  it('never rounds a failing ratio up to a pass', () => {
    expect(formatRatio(4.4999)).toBe('4.49');
    expect(formatRatio(4.5)).toBe('4.50');
    expect(results(4.4999).find((r) => r.id === 'aa')!.pass).toBe(false);
  });

  it('applies each WCAG threshold', () => {
    const r = Object.fromEntries(results(contrast(c('#777'), c('#fff'))).map((x) => [x.id, x.pass]));
    expect(r).toEqual({ aa: false, 'aa-large': true, aaa: false, 'aaa-large': false, ui: true });
    expect(results(21).every((x) => x.pass)).toBe(true);
    expect(results(1).some((x) => x.pass)).toBe(false);
  });

  it('parses hex, rgb() and hsl(), and says which input is wrong', () => {
    const p = checkPair('rgb(0 0 0)', 'hsl(0 0% 100%)');
    expect(p.ok && p.ratio).toBe(21);
    expect(checkPair('nope', '#fff')).toEqual({ ok: false, which: 'text' });
    expect(checkPair('#000', '')).toEqual({ ok: false, which: 'background' });
    expect(checkPair('', '')).toEqual({ ok: false, which: 'both' });
    expect(checkPair('黒', '#fff')).toEqual({ ok: false, which: 'text' });
  });

  it('flattens translucent colors before measuring', () => {
    expect(toHex(flatten({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 }))).toBe('#808080');
    const p = checkPair('rgb(0 0 0 / 0.5)', '#fff');
    expect(p.ok && p.translucent).toBe(true);
  });

  it('suggests the nearest passing text color', () => {
    const s = suggestText(c('#777'), c('#fff'), 4.5)!;
    expect(s.ratio).toBeGreaterThanOrEqual(4.5);
    expect(s.ratio).toBeLessThan(4.7);
    expect(s.hex).toBe('#767676');
    // A color that already passes needs no suggestion
    expect(suggestText(c('#000'), c('#fff'), 4.5)).toBeNull();
    // Light text on a dark background gets lighter
    const light = suggestText(c('#555'), c('#222'), 4.5)!;
    expect(toOklch(light.color).l).toBeGreaterThan(toOklch(c('#555')).l);
    // Keeps the hue of a colored text
    const blue = suggestText(c('#6b9cff'), c('#fff'), 4.5)!;
    expect(Math.abs(toOklch(blue.color).h - toOklch(c('#6b9cff')).h)).toBeLessThan(6);
    expect(blue.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('returns null when no lightness passes', () => {
    // On mid gray, neither white nor black reaches 7:1
    expect(suggestText(c('#808080'), c('#777'), 7)).toBeNull();
  });
});

describe('palette generator', () => {
  const blue = c('#3b82f6');

  it('round-trips OKLCH for in-gamut colors', () => {
    for (const hex of ['#3b82f6', '#ff7f50', '#000000', '#ffffff', '#123456']) {
      expect(toHex(oklchToRgba(toOklch(c(hex))))).toBe(hex);
    }
  });

  it('maps out-of-gamut colors into sRGB instead of clipping', () => {
    const v = oklchToRgba({ l: 0.7, c: 0.5, h: 150 });
    for (const ch of [v.r, v.g, v.b]) expect(ch).toBeGreaterThanOrEqual(0);
    expect(toOklch(v).l).toBeCloseTo(0.7, 1);
  });

  it('builds an 11-step scale, light to dark, with the base color in it', () => {
    const s = scale(blue);
    expect(s).toHaveLength(11);
    expect(s.map(toHex)).toContain('#3b82f6');
    expect(nearestStep(blue)).toBe(5);
    const ls = s.map((x) => toOklch(x).l);
    for (let i = 1; i < ls.length; i++) expect(ls[i]!).toBeLessThan(ls[i - 1]!);
  });

  it('rotates hues for harmonies and keeps the base first', () => {
    const p = palettes(blue);
    expect(p.map((x) => x.id)).toEqual(['scale', 'complementary', 'analogous', 'triadic', 'split', 'tetradic', 'monochrome']);
    const comp = p.find((x) => x.id === 'complementary')!;
    expect(toHex(comp.colors[0]!)).toBe('#3b82f6');
    const dh = Math.abs(toOklch(comp.colors[1]!).h - toOklch(blue).h);
    expect(Math.abs(dh - 180)).toBeLessThan(3);
    expect(toHex(rotate(blue, 360))).toBe('#3b82f6');
    for (const pal of p) expect(pal.keys).toHaveLength(pal.colors.length);
  });

  it('makes a monochrome set including the base, for very light and dark colors too', () => {
    for (const hex of ['#3b82f6', '#fafafa', '#050505']) {
      const m = monochrome(c(hex));
      expect(m).toHaveLength(5);
      expect(m.map(toHex)).toContain(hex);
    }
  });

  it('gives grays a gray palette', () => {
    for (const x of scale(c('#808080'))) expect(toOklch(x).c).toBeLessThan(0.01);
  });

  it('exports as hex, CSS variables and Tailwind', () => {
    const p = { keys: ['50', '500'], colors: [c('#eff6ff'), blue] };
    expect(exportPalette(p, 'hex', 'x')).toBe('#eff6ff\n#3b82f6\n');
    expect(exportPalette(p, 'css', 'Brand Blue')).toBe(':root {\n  --brand-blue-50: #eff6ff;\n  --brand-blue-500: #3b82f6;\n}\n');
    expect(exportPalette(p, 'tailwind4', 'brand')).toBe('@theme {\n  --color-brand-50: #eff6ff;\n  --color-brand-500: #3b82f6;\n}\n');
    expect(exportPalette(p, 'tailwind3', 'brand')).toContain("        brand: {\n          50: '#eff6ff',\n          500: '#3b82f6',\n        },");
    expect(exportPalette(p, 'tailwind3', 'brand blue')).toContain("'brand-blue': {");
  });

  it('turns any name into a safe identifier', () => {
    expect(slugName('')).toBe('brand');
    expect(slugName('Café Crème')).toBe('cafe-creme');
    expect(slugName('2nd')).toBe('c-2nd');
    expect(slugName('🎨')).toBe('brand');
    expect(slugName('x'.repeat(10_000))).toHaveLength(10_000);
  });
});

describe('aspect ratio', () => {
  it('simplifies with the GCD', () => {
    expect(gcd(1920, 1080)).toBe(120);
    expect(simplify(1920, 1080)).toMatchObject({ ok: true, w: 16, h: 9, near: null });
    expect(simplify(1080, 1920)).toMatchObject({ w: 9, h: 16 });
    expect(simplify(1366, 768)).toMatchObject({ w: 683, h: 384, near: '16:9' });
    expect(simplify(2560, 1080)).toMatchObject({ w: 64, h: 27, near: '2.39:1 or 21:9' });
    expect(simplify(1.5, 1)).toMatchObject({ w: 3, h: 2 });
    expect(simplify(1e9, 3)).toMatchObject({ ok: true, w: 1e9, h: 3 });
    const r = simplify(1920, 1080);
    expect(r.ok && r.decimal.toFixed(4)).toBe('1.7778');
    expect(simplify(0, 5).ok).toBe(false);
  });

  it('reads sides and ratios as typed', () => {
    expect(parseSide('1920')).toBe(1920);
    expect(parseSide('')).toBe('empty');
    expect(parseSide('abc')).toMatch(/positive number/);
    expect(parseSide('0')).toMatch(/above 0/);
    expect(parseSide('１９２０')).toMatch(/positive number/);
    expect(parseRatio('16:9')).toEqual([16, 9]);
    expect(parseRatio('16 / 9')).toEqual([16, 9]);
    expect(parseRatio('2.39')).toEqual([2.39, 1]);
    expect(parseRatio('1.85:1')).toEqual([1.85, 1]);
    expect(parseRatio('16:0')).toBeNull();
    expect(parseRatio('wide')).toBeNull();
  });

  it('solves the missing side', () => {
    expect(solve([16, 9], 'width', 1280)).toEqual({ exact: 720, rounded: 720 });
    expect(solve([16, 9], 'height', 1080)).toEqual({ exact: 1920, rounded: 1920 });
    expect(solve([4, 3], 'width', 1000).rounded).toBe(750);
    expect(solve([16, 9], 'width', 1000).exact).toBeCloseTo(562.5);
  });

  it('lists common sizes, marking the ones that are only close', () => {
    const s = commonSizes([16, 9]);
    expect(s.find((r) => r.w === 1920)).toMatchObject({ h: 1080, exact: true });
    expect(s.find((r) => r.w === 854)).toMatchObject({ exact: false });
    expect(commonSizes([21, 9]).every((r) => !r.exact)).toBe(true);
    expect(commonSizes([4, 5]).find((r) => r.w === 1080)!.h).toBe(1350);
    const odd = commonSizes([7, 5]);
    expect(odd.length).toBeGreaterThan(0);
    expect(odd[0]).toMatchObject({ w: 640, h: 457, exact: false });
  });
});

/** A minimal valid PNG header (signature + IHDR) of the given size. */
function fakePng(w: number, h: number, extra = 10): Uint8Array {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  return b;
}

describe('ICO writer', () => {
  it('writes the header, one entry per image and the right offsets', () => {
    const pngs = [fakePng(16, 16, 5), fakePng(32, 32, 50), fakePng(48, 48, 100)];
    const ico = buildIco(pngs);
    const v = new DataView(ico.buffer);
    expect([...ico.slice(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    expect(ico.length).toBe(6 + 3 * 16 + pngs.reduce((n, p) => n + p.length, 0));
    let offset = 6 + 48;
    pngs.forEach((p, i) => {
      const e = 6 + 16 * i;
      expect(ico[e]).toBe([16, 32, 48][i]);
      expect(ico[e + 1]).toBe([16, 32, 48][i]);
      expect(ico[e + 2]).toBe(0);
      expect(ico[e + 3]).toBe(0);
      expect(v.getUint16(e + 4, true)).toBe(1);
      expect(v.getUint16(e + 6, true)).toBe(32);
      expect(v.getUint32(e + 8, true)).toBe(p.length);
      expect(v.getUint32(e + 12, true)).toBe(offset);
      expect([...ico.slice(offset, offset + p.length)]).toEqual([...p]);
      offset += p.length;
    });
  });

  it('stores 256 px as 0 and refuses what ICO can’t hold', () => {
    expect(buildIco([fakePng(256, 256)])[6]).toBe(0);
    expect(() => buildIco([])).toThrow(/at least one/);
    expect(() => buildIco([fakePng(512, 512)])).toThrow(/256/);
    expect(() => buildIco([new Uint8Array([1, 2, 3])])).toThrow(/PNG/);
  });

  it('reads PNG dimensions', () => {
    expect(pngSize(fakePng(180, 90))).toEqual({ w: 180, h: 90 });
    expect(pngSize(new Uint8Array(0))).toBeNull();
  });

  it('gives the link tags and manifest', () => {
    expect(faviconHtml()).toContain('<link rel="icon" href="/favicon.ico" sizes="48x48">');
    expect(faviconHtml()).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
    const m = JSON.parse(webManifest({ name: ' Café "Ü" ', color: '#ffffff' }));
    expect(m.name).toBe('Café "Ü"');
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
  });

  it('fits the image inside the padding, keeping its shape', () => {
    expect(fitBox(100, 10, 1)).toEqual({ x: 10, y: 10, w: 80, h: 80 });
    expect(fitBox(100, 0, 2)).toEqual({ x: 0, y: 25, w: 100, h: 50 });
    expect(fitBox(100, 0, 0)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });
});

describe('image sizes and files', () => {
  it('names output files', () => {
    expect(outputName('holiday photo.PNG', 'webp')).toBe('holiday photo.webp');
    expect(outputName('a.b.jpeg', 'jpeg', '-small')).toBe('a.b-small.jpg');
    expect(outputName('', 'png')).toBe('image.png');
    expect(outputName('写真.jpg', 'png')).toBe('写真.png');
  });

  it('reports savings and growth', () => {
    expect(savings(1000, 250)).toMatchObject({ percent: 75, bigger: false, label: '75% smaller' });
    expect(savings(1000, 1100)).toMatchObject({ bigger: true, label: '10% bigger' });
    expect(savings(1000, 995).label).toBe('0.5% smaller');
    expect(savings(0, 10).bigger).toBe(true);
  });

  it('computes target sizes and refuses impossible ones', () => {
    const src = { w: 4000, h: 3000 };
    expect(targetSize(src, { unit: 'percent', percent: 50, width: 0, height: 0 })).toEqual({ ok: true, w: 2000, h: 1500 });
    expect(targetSize(src, { unit: 'px', percent: 0, width: 800, height: 600 })).toEqual({ ok: true, w: 800, h: 600 });
    expect(targetSize(src, { unit: 'percent', percent: 0.001, width: 0, height: 0 })).toEqual({ ok: true, w: 1, h: 1 });
    expect(targetSize(src, { unit: 'px', percent: 0, width: 0, height: 600 }).ok).toBe(false);
    expect(targetSize(src, { unit: 'px', percent: 0, width: 20000, height: 10 }).ok).toBe(false);
    expect(targetSize(src, { unit: 'px', percent: 0, width: 10000, height: 10000 }).ok).toBe(false);
    expect(lockedSide(src, 'width', 800)).toBe(600);
    expect(lockedSide(src, 'height', 600)).toBe(800);
    expect(lockedSide(src, 'width', 0)).toBe(0);
  });

  it('halves in steps for large reductions', () => {
    expect(halvingSteps({ w: 4000, h: 3000 }, { w: 800, h: 600 })).toEqual([
      { w: 2000, h: 1500 },
      { w: 1000, h: 750 },
      { w: 800, h: 600 },
    ]);
    expect(halvingSteps({ w: 600, h: 600 }, { w: 300, h: 300 })).toEqual([{ w: 300, h: 300 }]);
    expect(halvingSteps({ w: 100, h: 100 }, { w: 200, h: 200 })).toEqual([{ w: 200, h: 200 }]);
    expect(halvingSteps({ w: 16384, h: 16384 }, { w: 1, h: 1 }).length).toBeLessThanOrEqual(21);
  });
});

describe('SVG number and path helpers', () => {
  it('formats numbers short', () => {
    expect(formatNumber(0.5, 3)).toBe('.5');
    expect(formatNumber(-0.25, 3)).toBe('-.25');
    expect(formatNumber(3.0001, 3)).toBe('3');
    expect(formatNumber(-0.0001, 2)).toBe('0');
    expect(formatNumber(12.34567, 2)).toBe('12.35');
  });

  it('rounds path data and keeps arc flags and commands intact', () => {
    expect(roundPath('M 10.123456 20.987654 L 30.5 40.25 Z', 2)).toBe('M10.12 20.99L30.5 40.25Z');
    expect(roundPath('M0,0 C 0.5,0.25 -0.75,1 2,3', 2)).toBe('M0 0C.5.25-.75 1 2 3');
    // Compact arc flags: "a1 1 0 0110 10" = rx1 ry1 rot0 large0 sweep1 x10 y10
    expect(roundPath('M0 0a1 1 0 0110 10', 1)).toBe('M0 0a1 1 0 0 1 10 10');
    expect(roundPath('M1e2 5l2.5e-1 3', 2)).toBe('M100 5l.25 3');
    expect(roundPath('M0 0 10 10 20 20z m5 5h1v1', 0)).toBe('M0 0 10 10 20 20zm5 5h1v1');
    expect(roundPath('', 2)).toBe('');
    expect(roundPath('M0', 2)).toBeNull();
    expect(roundPath('L0 0', 2)).toBeNull();
    expect(roundPath('M0 0 Q 1', 2)).toBeNull();
    expect(roundPath('M0 0 é', 2)).toBeNull();
    const big = 'M0 0' + ' L1.23456 2.34567'.repeat(20_000);
    expect(roundPath(big, 1)).toBe('M0 0' + 'L1.2 2.3'.repeat(20_000));
  });

  it('rounds lists, lengths and transforms', () => {
    expect(roundList('0 0 100.123 50.555', 1)).toBe('0 0 100.1 50.6');
    expect(roundList('1,2 3,4', 1)).toBe('1 2 3 4');
    expect(roundList('a b', 1)).toBeNull();
    expect(roundLength('12.3456px', 2)).toBe('12.35px');
    expect(roundLength('50%', 2)).toBe('50%');
    expect(roundLength('auto', 2)).toBeNull();
    expect(roundTransform('translate(10.12345, 20) rotate(45.0)', 2)).toBe('translate(10.12 20) rotate(45)');
    expect(roundTransform('matrix(1 0 0 1 -0.5 0.5)', 2)).toBe('matrix(1 0 0 1-.5.5)');
    expect(roundTransform('url(x)', 2)).toBeNull();
  });

  it('spots editor attributes and unsafe links', () => {
    expect(isEditorAttribute('inkscape:label', 'http://www.inkscape.org/namespaces/inkscape')).toBe(true);
    expect(isEditorAttribute('sodipodi:nodetypes', null)).toBe(true);
    expect(isEditorAttribute('data-name', null)).toBe(true);
    expect(isEditorAttribute('xlink:href', 'http://www.w3.org/1999/xlink')).toBe(false);
    expect(isEditorAttribute('fill', null)).toBe(false);
    expect(isUnsafeUrl('javascript:alert(1)')).toBe(true);
    expect(isUnsafeUrl(' JaVa\tScript:alert(1)')).toBe(true);
    expect(isUnsafeUrl('#icon')).toBe(false);
    expect(isUnsafeUrl('https://example.com')).toBe(false);
  });

  it('describes what was removed', () => {
    const base = { comments: 0, metadata: 0, editorItems: 0, emptyItems: 0, defaults: 0, scripts: 0, eventHandlers: 0, unsafeLinks: 0, titles: 0, addedNamespace: false };
    expect(describeReport(base)).toEqual([]);
    expect(describeReport({ ...base, comments: 2, scripts: 1, eventHandlers: 1 })).toEqual([
      'Removed 2 comments.',
      'Stripped 1 script, 1 event handler attribute: scripts don’t belong in an image.',
    ]);
  });
});

describe('page text', () => {
  it('fills every page and links related tools', () => {
    for (const id of ['color-palette', 'contrast-checker', 'aspect-ratio', 'image-compressor', 'image-resizer', 'favicon-generator', 'svg-optimizer'] as const) {
      const t = TOOL_CONTENT[id];
      expect(t.lede, id).not.toBe('TODO');
      expect(t.steps, id).toHaveLength(3);
      expect(t.faq.length, id).toBeGreaterThanOrEqual(3);
      expect(t.related!.length, id).toBeGreaterThanOrEqual(2);
    }
    expect(TOOL_CONTENT['contrast-checker'].related).toContain('color-converter');
    expect(TOOL_CONTENT['color-palette'].related).toContain('color-converter');
  });

  it('aspect ratio example is the real output', () => {
    const ex = TOOL_CONTENT['aspect-ratio'].example!;
    const s = simplify(2560, 1440);
    const h = solve([16, 9], 'width', 1280);
    expect(s.ok && `2560 × 1440 → ${s.w}:${s.h} (${s.decimal.toFixed(4)})\n16:9 at 1280 wide → 1280 × ${h.rounded}`).toBe(ex.output);
  });

  it('contrast example is the real output', () => {
    const ex = TOOL_CONTENT['contrast-checker'].example!;
    const p = checkPair('#777777', '#ffffff');
    const s = suggestText(c('#777777'), c('#ffffff'), 4.5)!;
    const lines = p.ok ? [`Ratio ${formatRatio(p.ratio)}:1`, ...results(p.ratio).map((r) => `${r.label}: ${r.pass ? 'pass' : 'fail'}`), `Nearest AA text color: ${s.hex}`] : [];
    expect(lines.join('\n')).toBe(ex.output);
  });
});
