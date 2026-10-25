import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'SVG optimizer',
  lede: 'Make SVG files smaller in your browser: remove comments, editor metadata and attributes that change nothing, round long numbers and collapse whitespace. Compare the before and after, then copy or download.',
  steps: [
    { title: 'Paste or open an SVG', body: 'Paste the markup or open a .svg file. It is parsed as XML, and any error is shown.' },
    { title: 'Choose the options', body: 'Set how many decimals to keep in coordinates, and whether to remove <title> and <desc>.' },
    { title: 'Compare and save', body: 'See both sizes and both previews side by side, then copy the result or download it.' },
  ],
  faq: [
    { q: 'What does it remove?', a: 'Comments, <metadata>, Inkscape, Sodipodi, Sketch, Illustrator and Figma namespaces and attributes, data-name, empty groups and attributes, and default values in places where removing them can’t change the drawing. Scripts and on… event attributes are stripped too.' },
    { q: 'How many decimals should I keep?', a: 'For icons drawn on a 24 or 100 unit grid, 1 or 2 is plenty. If the viewBox is tiny, such as 0 0 1 1, keep 3 or more, or turn rounding off, and check the preview.' },
    { q: 'Why are scripts removed?', a: 'An SVG opened directly or placed inline in a page can run JavaScript. Images rarely need it, so script elements, event handler attributes and javascript: links are taken out of the output.' },
    { q: 'Is this as thorough as SVGO?', a: 'No. It does the safe, common clean-ups but doesn’t merge paths, convert shapes to paths, or rewrite IDs and styles. For most exported icons that is where most of the savings are anyway.' },
  ],
  mistakes: [
    { title: 'Removing the title from meaningful images', body: 'A <title> gives screen readers a name for the image. Keep it for icons that carry meaning, such as a lone button icon.' },
    { title: 'Rounding too hard', body: 'Zero decimals on a small viewBox moves points visibly. Compare the previews before you save.' },
    { title: 'Deleting the viewBox', body: 'Without a viewBox, an SVG can’t scale to fit its box. This tool keeps it; keep it when editing by hand too.' },
    { title: 'Optimizing the only copy', body: 'Editor data helps when you reopen the file in Inkscape or Illustrator. Keep the original and ship the optimized copy.' },
  ],
  related: ['favicon-generator', 'image-compressor', 'code-beautifier'],
};

export default content;
