'use strict';
// translate-b2-to-tailwind.mjs
// Transpile fallback <style> blocks (B2 sites) into Tailwind utility classes applied
// directly onto the matched elements, so the inline <style> drops below the strict
// 1500-char threshold (verdict A). @keyframes -> tailwind.config; @import -> <link>.
//
// Usage:
//   node scripts/translate-b2-to-tailwind.mjs <siteDir> [siteDir ...]
//   node scripts/translate-b2-to-tailwind.mjs --all-b2
// siteDir is the dir name under public/static-sites (e.g. "14", "wegic/2").

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const CHEERIO = '/Users/xiaoye/.workbuddy/binaries/node/workspace/node_modules/cheerio';
const cheerio = require(CHEERIO);

const ROOT = '/Users/xiaoye/Desktop/html5-examples/public';
const SCAN = '/tmp/ss_scan.json';
const EXTERNALIZE_THRESHOLD = 1400; // residual > this -> externalize to linked file (else inline; margin below 1500 scanner limit for TW-RESIDUAL comment overhead)

const av = (v) => v.trim().replace(/\s+/g, '_'); // arbitrary value: spaces -> _

function listHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const base = path.basename(p);
        if (['assets', 'css', 'js', 'vendor', 'images', 'img', 'fonts', 'font', 'node_modules', 'static', 'libs'].includes(base)) continue;
        walk(p);
      } else if (e.name.endsWith('.html')) out.push(p);
    }
  };
  walk(dir);
  return out;
}

// ---- declaration -> utilities ----
function declToUtilities(prop, rawVal) {
  let important = false;
  let val = rawVal.trim();
  if (/!\s*important/i.test(val)) { important = true; val = val.replace(/!\s*important/i, '').trim(); }
  prop = prop.trim().toLowerCase();
  if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-')) return []; // skip vendor prefixes as standalone
  const imp = (u) => (important ? u + '!' : u);
  const out = [];
  const single = (u) => out.push(imp(u));

  const isPct = (v) => /%$/.test(v);
  const sz = (p, v) => {
    if (v === '0') return single(`${p}-0`);
    if (v === 'auto') return single(`${p}-auto`);
    single(`${p}-[${av(v)}]`);
  };
  const mar = (p, v) => {
    if (v === '0') return single(`${p}-0`);
    if (v === 'auto') return single(`${p}-auto`);
    if (v.startsWith('-')) return single(`-${p}-[${av(v.slice(1))}]`);
    single(`${p}-[${av(v)}]`);
  };

  switch (prop) {
    case 'display':
      ({ none: 'hidden', block: 'block', 'inline-block': 'inline-block', inline: 'inline', flex: 'flex',
        'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid', 'flow-root': 'flow-root',
        table: 'table', 'table-row': 'table-row', 'table-cell': 'table-cell', 'list-item': 'list-item',
        contents: 'contents' }[val] ? single({ none: 'hidden', block: 'block', 'inline-block': 'inline-block', inline: 'inline', flex: 'flex',
        'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid', 'flow-root': 'flow-root',
        table: 'table', 'table-row': 'table-row', 'table-cell': 'table-cell', 'list-item': 'list-item',
        contents: 'contents' }[val]) : single(`[display:${av(val)}]`));
      break;
    case 'position':
      single({ static: 'static', relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky' }[val] || `[position:${av(val)}]`);
      break;
    case 'top': case 'right': case 'bottom': case 'left':
      if (val === '0') single(`${prop}-0`);
      else if (val.startsWith('-')) single(`-${prop}-[${av(val.slice(1))}]`);
      else single(`${prop}-[${av(val)}]`);
      break;
    case 'z-index': single(`z-[${av(val)}]`); break;
    case 'flex-direction': single({ row: 'flex-row', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' }[val] || `[flex-direction:${av(val)}]`); break;
    case 'flex-wrap': single({ wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' }[val] || `[flex-wrap:${av(val)}]`); break;
    case 'justify-content': single({ 'flex-start': 'justify-start', start: 'justify-start', center: 'justify-center', 'flex-end': 'justify-end', end: 'justify-end', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly' }[val] || `[justify-content:${av(val)}]`); break;
    case 'align-items': single({ stretch: 'items-stretch', start: 'items-start', 'flex-start': 'items-start', center: 'items-center', end: 'items-end', 'flex-end': 'items-end', baseline: 'items-baseline' }[val] || `[align-items:${av(val)}]`); break;
    case 'align-content': single({ stretch: 'content-stretch', center: 'content-center', start: 'content-start', 'flex-start': 'content-start', end: 'content-end', 'flex-end': 'content-end', between: 'content-between', around: 'content-around', evenly: 'content-evenly' }[val] || `[align-content:${av(val)}]`); break;
    case 'align-self': single({ auto: 'self-auto', start: 'self-start', 'flex-start': 'self-start', center: 'self-center', end: 'self-end', 'flex-end': 'self-end', stretch: 'self-stretch', baseline: 'self-baseline' }[val] || `[align-self:${av(val)}]`); break;
    case 'flex':
      if (val === '1' || val === '1 1 0%' || val === '1 1 0') single('flex-1');
      else if (val === 'auto') single('flex-auto');
      else if (val === 'none') single('flex-none');
      else if (val === 'initial') single('flex-initial');
      else single(`flex-[${av(val)}]`);
      break;
    case 'flex-grow': single(val === '1' || val === '1 1 0%' ? 'grow' : `grow-[${av(val)}]`); break;
    case 'flex-shrink': single(val === '0' ? 'shrink-0' : `shrink-[${av(val)}]`); break;
    case 'order': single(`order-[${av(val)}]`); break;
    case 'gap': single(`gap-[${av(val)}]`); break;
    case 'gap-x': single(`gap-x-[${av(val)}]`); break;
    case 'gap-y': single(`gap-y-[${av(val)}]`); break;
    case 'grid-template-columns': {
      const m = val.match(/repeat\((\d+)\s*,\s*(1fr|minmax\([^)]*\)|auto)\)/);
      if (m && (m[2] === '1fr' || m[2].startsWith('minmax'))) single(`grid-cols-[${av(val)}]`);
      else single(`grid-cols-[${av(val)}]`);
      break;
    }
    case 'grid-template-rows': single(`grid-rows-[${av(val)}]`); break;
    case 'grid-column': single(`col-[${av(val)}]`); break;
    case 'grid-row': single(`row-[${av(val)}]`); break;
    case 'width':
      if (val === '100%') single('w-full');
      else if (val === 'auto') single('w-auto');
      else if (val === 'fit-content') single('w-fit');
      else if (val === 'max-content') single('w-max');
      else if (val === 'min-content') single('w-min');
      else if (/^(\d*(?:\.\d+)?)vw$/.test(val)) single(`w-[${av(val)}]`);
      else sz('w', val);
      break;
    case 'height':
      if (val === '100%') single('h-full');
      else if (val === 'auto') single('h-auto');
      else if (val === 'fit-content') single('h-fit');
      else sz('h', val);
      break;
    case 'min-width': sz('min-w', val); break;
    case 'max-width':
      if (val === '100%') single('max-w-full');
      else if (/^\d*(?:\.\d+)?vw$/.test(val)) single(`max-w-[${av(val)}]`);
      else sz('max-w', val);
      break;
    case 'min-height': sz('min-h', val); break;
    case 'max-height': sz('max-h', val); break;
    case 'margin': case 'margin-top': case 'margin-right': case 'margin-bottom': case 'margin-left': {
      const p = prop === 'margin' ? 'm' : prop.replace('margin-', 'm-');
      if (val === '0') single(`${p}-0`);
      else if (val === 'auto') single(`${p}-auto`);
      else if (/^\s*([\d.]+px|\S+)\s+auto\s*$/.test(val)) { mar(p, val.split(/\s+/)[0]); single(`${p}x-auto`); }
      else mar(p, val);
      break;
    }
    case 'padding': case 'padding-top': case 'padding-right': case 'padding-bottom': case 'padding-left': {
      const p = prop === 'padding' ? 'p' : prop.replace('padding-', 'p-');
      if (val === '0') single(`${p}-0`);
      else sz(p, val);
      break;
    }
    case 'font-family': single(`font-[${av(val)}]`); break;
    case 'font-size': single(`text-[${av(val)}]`); break;
    case 'font-weight':
      single({ '100': 'font-thin', '200': 'font-extralight', '300': 'font-light', '400': 'font-normal', normal: 'font-normal', '500': 'font-medium', '600': 'font-semibold', '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black', bold: 'font-bold' }[val] || `[font-weight:${av(val)}]`);
      break;
    case 'line-height': single(`leading-[${av(val)}]`); break;
    case 'letter-spacing': single(`tracking-[${av(val)}]`); break;
    case 'text-align': single({ left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' }[val] || `[text-align:${av(val)}]`); break;
    case 'text-decoration': single({ underline: 'underline', 'line-through': 'line-through', none: 'no-underline' }[val] || `[text-decoration:${av(val)}]`); break;
    case 'text-transform': single({ uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' }[val] || `[text-transform:${av(val)}]`); break;
    case 'text-indent': single(`indent-[${av(val)}]`); break;
    case 'color': single(`text-[${av(val)}]`); break;
    case 'font-style': single(val === 'italic' ? 'italic' : 'not-italic'); break;
    case 'white-space': single({ normal: 'whitespace-normal', nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-wrap': 'whitespace-pre-wrap', 'pre-line': 'whitespace-pre-line' }[val] || `[white-space:${av(val)}]`); break;
    case 'word-break': single({ normal: 'break-normal', 'break-all': 'break-all', 'keep-all': 'break-keep' }[val] || `[word-break:${av(val)}]`); break;
    case 'overflow-wrap': single(val === 'break-word' ? 'break-words' : `[overflow-wrap:${av(val)}]`); break;
    case 'background': single(`bg-[${av(val)}]`); break;
    case 'background-color': single(`bg-[${av(val)}]`); break;
    case 'background-image': single(`bg-[${av(val)}]`); break;
    case 'background-size': single({ cover: 'bg-cover', contain: 'bg-contain' }[val] || `bg-[${av(val)}]`); break;
    case 'background-position': single({ center: 'bg-center', top: 'bg-top', bottom: 'bg-bottom', left: 'bg-left', right: 'bg-right' }[val] || `bg-[${av(val)}]`); break;
    case 'background-repeat': single({ 'no-repeat': 'bg-no-repeat', repeat: 'bg-repeat', 'repeat-x': 'bg-repeat-x', 'repeat-y': 'bg-repeat-y' }[val] || `bg-[${av(val)}]`); break;
    case 'background-attachment': single({ fixed: 'bg-fixed', local: 'bg-local', scroll: 'bg-scroll' }[val] || `[background-attachment:${av(val)}]`); break;
    case 'border':
      if (/^\d/.test(val) && !/\s/.test(val)) single(`border-[${av(val)}]`);
      else { const m = val.match(/(\d+px)/); if (m) single(`border-[${av(m[1])}]`); const c = val.match(/#([0-9a-fA-F]{3,8})|rgb|hsl/); if (/solid|dashed|dotted|double|none|groove|ridge/.test(val)) single(`border-${val.match(/solid|dashed|dotted|double|none|groove|ridge/)[0]}`); if (c) single(`border-[${av(val)}]`); if (!m && !c && !/solid|dashed|dotted|double|none|groove|ridge/.test(val)) single(`border-[${av(val)}]`); }
      break;
    case 'border-width': single(val === '0' ? 'border-0' : /^(1px|2px|4px|8px)$/.test(val) ? `border-${val === '1px' ? '' : val.replace('px', '')}` .replace('border-', 'border-') : `border-[${av(val)}]`); break;
    case 'border-style': single({ solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted', double: 'border-double', none: 'border-none' }[val] || `[border-style:${av(val)}]`); break;
    case 'border-color': single(`border-[${av(val)}]`); break;
    case 'border-radius':
      if (val === '50%' || val === '9999px' || val === '9999') single('rounded-full');
      else if (val === '0') single('rounded-none');
      else single(`rounded-[${av(val)}]`);
      break;
    case 'border-top': case 'border-right': case 'border-bottom': case 'border-left': {
      const side = prop.replace('border-', '');
      const map = { top: 't', right: 'r', bottom: 'b', left: 'l' };
      const m = val.match(/(\d+px)/);
      if (m) single(`border-${map[side]}-[${av(m[1])}]`);
      if (/solid|dashed|dotted|double|none/.test(val)) single(`border-${map[side]}-${val.match(/solid|dashed|dotted|double|none/)[0]}`);
      if (/#|rgb|hsl/.test(val)) single(`border-${map[side]}-[${av(val)}]`);
      if (!m && !/solid|dashed|dotted|double|none/.test(val) && !/#|rgb|hsl/.test(val)) single(`border-${map[side]}-[${av(val)}]`);
      break;
    }
    case 'border-top-width': case 'border-right-width': case 'border-bottom-width': case 'border-left-width': {
      const side = prop.replace('border-', '').replace('-width', '');
      const map = { top: 't', right: 'r', bottom: 'b', left: 'l' };
      single(`border-${map[side]}-[${av(val)}]`);
      break;
    }
    case 'box-shadow': single(val === 'none' ? 'shadow-none' : `shadow-[${av(val)}]`); break;
    case 'opacity': single(`opacity-[${av(val)}]`); break;
    case 'visibility': single({ visible: 'visible', hidden: 'invisible', collapse: 'collapse' }[val] || `[visibility:${av(val)}]`); break;
    case 'transform':
      // split into translate/rotate/scale/skew
      for (const fn of val.match(/[a-zA-Z]+\([^)]*\)/g) || []) {
        if (/^translate/.test(fn)) single(`[transform:${av(fn)}]`);
        else if (/^rotate/.test(fn)) single(`[transform:${av(fn)}]`);
        else if (/^scale/.test(fn)) single(`[transform:${av(fn)}]`);
        else if (/^skew/.test(fn)) single(`[transform:${av(fn)}]`);
        else single(`[transform:${av(fn)}]`);
      }
      break;
    case 'transform-origin': single(`origin-[${av(val)}]`); break;
    case 'transition':
      if (val === 'none') single('transition-none');
      else single(`transition-[${av(val)}]`);
      break;
    case 'transition-property': single(`transition-[${av(val)}]`); break;
    case 'transition-duration': single(`duration-[${av(val)}]`); break;
    case 'transition-timing-function': single(`ease-[${av(val)}]`); break;
    case 'transition-delay': single(`delay-[${av(val)}]`); break;
    case 'filter': single(val === 'none' ? 'filter-none' : `[filter:${av(val)}]`); break;
    case 'backdrop-filter': single(val === 'none' ? 'backdrop-blur-none' : `[backdrop-filter:${av(val)}]`); break;
    case 'cursor': single({ pointer: 'cursor-pointer', default: 'cursor-default', 'not-allowed': 'cursor-not-allowed', text: 'cursor-text', move: 'cursor-move', 'wait': 'cursor-wait', 'grab': 'cursor-grab', 'grabbing': 'cursor-grabbing' }[val] || `[cursor:${av(val)}]`); break;
    case 'pointer-events': single(val === 'none' ? 'pointer-events-none' : 'pointer-events-auto'); break;
    case 'user-select': single({ none: 'select-none', text: 'select-text', all: 'select-all', auto: 'select-auto' }[val] || `[user-select:${av(val)}]`); break;
    case 'overflow': single({ visible: 'overflow-visible', hidden: 'overflow-hidden', auto: 'overflow-auto', scroll: 'overflow-scroll' }[val] || `[overflow:${av(val)}]`); break;
    case 'overflow-x': single({ visible: 'overflow-x-visible', hidden: 'overflow-x-hidden', auto: 'overflow-x-auto', scroll: 'overflow-x-scroll' }[val] || `[overflow-x:${av(val)}]`); break;
    case 'overflow-y': single({ visible: 'overflow-y-visible', hidden: 'overflow-y-hidden', auto: 'overflow-y-auto', scroll: 'overflow-y-scroll' }[val] || `[overflow-y:${av(val)}]`); break;
    case 'box-sizing': single({ border: 'box-border', content: 'box-content' }[val] || `[box-sizing:${av(val)}]`); break;
    case 'list-style': case 'list-style-type': single({ none: 'list-none', disc: 'list-disc', decimal: 'list-decimal', 'circle': 'list-circle', 'square': 'list-square' }[val] || `[list-style-type:${av(val)}]`); break;
    case 'object-fit': single({ cover: 'object-cover', contain: 'object-contain', fill: 'object-fill', 'none': 'object-none', 'scale-down': 'object-scale-down' }[val] || `[object-fit:${av(val)}]`); break;
    case 'object-position': single(`object-[${av(val)}]`); break;
    case 'vertical-align': single({ top: 'align-top', middle: 'align-middle', bottom: 'align-bottom', baseline: 'align-baseline', 'text-top': 'align-text-top', 'text-bottom': 'align-text-bottom' }[val] || `[vertical-align:${av(val)}]`); break;
    case 'float': single({ left: 'float-left', right: 'float-right', none: 'float-none' }[val] || `[float:${av(val)}]`); break;
    case 'clear': single({ left: 'clear-left', right: 'clear-right', both: 'clear-both', none: 'clear-none' }[val] || `[clear:${av(val)}]`); break;
    case 'text-overflow': single({ ellipsis: 'text-ellipsis', clip: 'text-clip' }[val] || `[text-overflow:${av(val)}]`); break;
    case 'appearance': single(val === 'none' ? 'appearance-none' : `[appearance:${av(val)}]`); break;
    case 'resize': single({ none: 'resize-none', both: 'resize', vertical: 'resize-y', horizontal: 'resize-x' }[val] || `[resize:${av(val)}]`); break;
    case 'content': /* handled by caller for pseudo-elements */ break;
    case 'box-shadow': single(`shadow-[${av(val)}]`); break;
    default:
      // arbitrary property fallback — always valid in Tailwind JIT
      single(`[${prop}:${av(val)}]`);
  }
  return out;
}

// ---- selector -> {parts:[{base, variants}], contentVal} ----
const PSEUDO_ONLY = /^(?:before|after|root|first|last|only|not|hover|focus|active|visited|checked|disabled|enabled|required|placeholder|selection|target|empty|default|valid|invalid|in-range|out-of-range|optional|read-only|read-write|first-child|last-child|only-child|first-of-type|last-of-type|nth-child|nth-of-type|nth-last-child|nth-last-of-type|is|where|has)\b/;
function splitTopCommas(sel) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function parseOneSelector(raw) {
  let variants = [];
  let r = raw.trim();
  if (!r) return null;
  const pe = r.match(/:(:)?(before|after)/);
  if (pe) { variants.push(pe[2]); r = r.replace(/:(:)?(before|after)/g, ''); }
  const tokens = r.split(/\s*(?:>|\+|~)\s*|\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const subject = tokens.pop();
  const contexts = tokens;
  const pseudoMap = { ':hover': 'hover', ':focus': 'focus', ':active': 'active', ':visited': 'visited', ':focus-within': 'focus-within', ':focus-visible': 'focus-visible', ':disabled': 'disabled', ':enabled': 'enabled', ':checked': 'checked', ':first-child': 'first', ':last-child': 'last', ':only-child': 'only', ':first-of-type': 'first-of-type', ':last-of-type': 'last-of-type', ':required': 'required', ':read-only': 'read-only', ':read-write': 'read-write', ':placeholder-shown': 'placeholder-shown' };
  let base = subject;
  const pclasses = [];
  const notRe = /:not\(([^)]*)\)/g; let nm;
  while ((nm = notRe.exec(subject))) {
    const inner = nm[1].trim();
    pclasses.push('not-[' + (inner.startsWith('.') ? inner.slice(1) : inner) + ']');
  }
  base = base.replace(/:not\([^)]*\)/g, '');
  for (const [k, v] of Object.entries(pseudoMap)) {
    if (base.includes(k)) { pclasses.push(v); base = base.replace(k, ''); }
  }
  const classMatches = [...base.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((x) => x[1]);
  const idMatch = base.match(/#([a-zA-Z0-9_-]+)/);
  const tagMatch = base.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (classMatches.length > 1) {
    const first = classMatches[0];
    for (let i = 1; i < classMatches.length; i++) pclasses.push('[&.' + classMatches[i] + ']');
    base = '.' + first;
  } else if (classMatches.length === 1) {
    base = '.' + classMatches[0];
  } else if (idMatch) {
    base = '#' + idMatch[1];
  } else if (tagMatch && !PSEUDO_ONLY.test(tagMatch[1].toLowerCase())) {
    base = tagMatch[1].toLowerCase();
  } else {
    return null;
  }
  for (const c of contexts) {
    const cm = c.match(/\.([a-zA-Z0-9_-]+)/);
    if (cm) variants.push('[.' + cm[1] + '_&]');
    else if (c.startsWith('#')) variants.push('[#' + c.slice(1) + '_&]');
    else if (/^[a-zA-Z]/.test(c)) variants.push('[' + c.toLowerCase() + '_&]');
    else return null;
  }
  return { base, variants: [...variants, ...pclasses] };
}
function parseSelector(sel) {
  const parts = [];
  for (const raw of splitTopCommas(sel)) {
    const p = parseOneSelector(raw);
    if (!p) return null; // any unparseable part -> whole rule residual
    parts.push(p);
  }
  if (!parts.length) return null;
  return { parts };
}

// ---- CSS parser (handles @media, @keyframes, @import) ----
function parseCss(css) {
  const rules = []; // {selector, decls:[[prop,val]], media:null|variant}
  const keyframes = {}; // name -> {from,to,steps}
  const imports = [];
  let i = 0;
  const n = css.length;
  const skipWs = () => { while (i < n && /\s/.test(css[i])) i++; while (i < n && css.startsWith('/*', i)) { const e = css.indexOf('*/', i); i = e < 0 ? n : e + 2; } };
  function parseBlock(mediaVariant) {
    while (i < n) {
      skipWs();
      if (i >= n) return;
      if (css[i] === '}') { i++; return; }
      if (css.startsWith('@media', i)) {
        const e = css.indexOf('{', i);
        const mq = css.slice(i + 6, e).trim();
        i = e + 1;
        const mv = mediaToVariant(mq);
        if (mv === null) { // cannot express -> skip whole block (residual handled by caller via raw)
          skipBlock();
          continue;
        }
        parseBlock(mv);
        continue;
      }
      if (css.startsWith('@keyframes', i) || css.startsWith('@-webkit-keyframes', i) || css.startsWith('@-moz-keyframes', i) || css.startsWith('@-ms-keyframes', i) || css.startsWith('@-o-keyframes', i)) {
        const e = css.indexOf('{', i);
        const name = css.slice(i).match(/@-?(?:webkit-|moz-|ms-|o-)?keyframes\s+([\w-]+)/)[1];
        i = e + 1;
        const kf = {};
        while (i < n && css[i] !== '}') {
          skipWs();
          if (css[i] === '}') { i++; break; }
          const pct = css.slice(i).match(/^([\d.]+%|from|to)\s*\{/);
          if (!pct) { skipBlock(); break; }
          const pname = pct[1];
          i += pct[0].length;
          const decls = {};
          while (i < n && css[i] !== '}') {
            skipWs();
            if (css[i] === '}') break;
            const segEnd = nextSegEnd(i);
            const seg = css.slice(i, segEnd).trim();
            i = segEnd + 1;
            if (seg && seg.includes(':')) { const ci = seg.indexOf(':'); decls[seg.slice(0, ci).trim()] = seg.slice(ci + 1).trim(); }
          }
          if (css[i] === '}') i++;
          kf[pname] = decls;
        }
        if (css[i] === '}') i++;
        keyframes[name] = kf;
        continue;
      }
      if (css.startsWith('@import', i)) {
        const e = css.indexOf(';', i);
        const stmt = css.slice(i, e < 0 ? n : e);
        const urlm = stmt.match(/url\((['"]?)([^'")]+)\1\)/);
        if (urlm) imports.push(urlm[2]);
        i = e < 0 ? n : e + 1;
        continue;
      }
      if (css.startsWith('@font-face', i) || css.startsWith('@supports', i) || css.startsWith('@charset', i) || css.startsWith('@page', i)) {
        skipBlock();
        continue;
      }
      // a normal rule
      const e = css.indexOf('{', i);
      if (e < 0) return;
      const selector = css.slice(i, e).trim();
      i = e + 1;
      const decls = [];
      while (i < n && css[i] !== '}') {
        skipWs();
        if (css[i] === '}') break;
        if (css[i] === '{') { skipBlock(); continue; }
        const segEnd = nextSegEnd(i);
        const seg = css.slice(i, segEnd).trim();
        i = segEnd + 1;
        if (seg && seg.includes(':')) { const ci = seg.indexOf(':'); decls.push([seg.slice(0, ci).trim(), seg.slice(ci + 1).trim()]); }
      }
      if (css[i] === '}') i++;
      if (selector && decls.length) rules.push({ selector, decls, media: mediaVariant });
    }
  }
  function nextSegEnd(start) {
    let depth = 0; let j = start;
    while (j < n) {
      const ch = css[j];
      if (ch === '(' || ch === '{') depth++;
      else if (ch === ')' || ch === '}') { if (depth === 0) return j; depth--; }
      else if (ch === ';' && depth === 0) return j;
      j++;
    }
    return n;
  }
  function skipBlock() {
    const e = css.indexOf('{', i);
    if (e < 0) { i = n; return; }
    let depth = 1; i = e + 1;
    while (i < n && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
  }
  parseBlock(null);
  return { rules, keyframes, imports };
}

function mediaToVariant(mq) {
  const mm = mq.match(/min-width:\s*(\d+(?:\.\d+)?)(px|rem|em)?/);
  if (mm) {
    let w = parseFloat(mm[1]);
    if (mm[2] === 'rem' || mm[2] === 'em') w = w * 16;
    if (w >= 1536) return '2xl:';
    if (w >= 1280) return 'xl:';
    if (w >= 1024) return 'lg:';
    if (w >= 768) return 'md:';
    if (w >= 640) return 'sm:';
    return `[min-width:${w}px]:`;
  }
  const mx = mq.match(/max-width:\s*(\d+(?:\.\d+)?)(px|rem|em)?/);
  if (mx) {
    let w = parseFloat(mx[1]);
    if (mx[2] === 'rem' || mx[2] === 'em') w = w * 16;
    return `[max-width:${w}px]:`;
  }
  return null;
}

// ---- per-file processing ----
function extendConfig($, keyframes, animations) {
  if (!keyframes || !Object.keys(keyframes).length) return;
  // find existing tailwind.config script
  let cfgEl = null;
  $('script').each((_, el) => {
    const t = $(el).text();
    if (/tailwind\.config/.test(t)) cfgEl = el;
  });
  const kfBlock = `keyframes: ${JSON.stringify(keyframes, null, 2)}, animation: ${JSON.stringify(animations, null, 2)}`;
  if (cfgEl) {
    let t = $(cfgEl).text();
    if (/theme\s*:\s*\{/.test(t) && /extend\s*:\s*\{/.test(t)) {
      t = t.replace(/(extend\s*:\s*\{)/, `$1\n      ${kfBlock},\n`);
    } else if (/tailwind\.config\s*=\s*\{/.test(t)) {
      t = t.replace(/(tailwind\.config\s*=\s*\{)/, `$1\ntheme: { extend: { ${kfBlock} } },\n`);
    } else {
      t += `\ntailwind.config = { theme: { extend: { ${kfBlock} } } };`;
    }
    $(cfgEl).text(t);
  } else {
    // inject a config script after the CDN script
    const script = `<script>tailwind.config = { theme: { extend: { ${kfBlock} } } };</script>`;
    const cdn = $('script[src*="cdn.tailwindcss.com"]');
    if (cdn.length) cdn.after(script);
    else $('head').append(script);
  }
}

// Analyze one file: parse style blocks, translate rules into utilities (applied onto
// matched elements), and collect the untranslatable residual CSS. Does NOT write.
function analyzeFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const styleEls = [];
  $('style').each((_, el) => {
    const txt = $(el).text();
    if (/tailwind\.config/.test(txt)) return;
    styleEls.push({ el, txt });
  });
  const allRules = [];
  const allKeyframes = {};
  const allImports = [];
  for (const { txt } of styleEls) {
    const parsed = parseCss(txt);
    allRules.push(...parsed.rules);
    Object.assign(allKeyframes, parsed.keyframes);
    allImports.push(...parsed.imports);
  }
  const residual = [];
  let applied = 0;
  for (const r of allRules) {
    const ps = parseSelector(r.selector);
    if (!ps) { residual.push(`${r.selector} { ${r.decls.map((d) => d[0] + ':' + d[1]).join('; ')} }`); continue; }
    const { parts } = ps;
    const utils = [];
    for (const [prop, val] of r.decls) {
      if (prop.trim().toLowerCase() === 'content') {
        let cv = val.trim().replace(/^['"]|['"]$/g, '');
        if (cv === '' || cv === 'none' || cv === 'normal') utils.push('content-none');
        else utils.push(`content-['${cv.replace(/'/g, "\\'")}']`);
        continue;
      }
      utils.push(...declToUtilities(prop, val));
    }
    if (!utils.length) { residual.push(`${r.selector} { ${r.decls.map((d) => d[0] + ':' + d[1]).join('; ')} }`); continue; }
    let appliedAny = false;
    for (const part of parts) {
      let els;
      try { els = $(part.base); } catch { continue; }
      if (!els.length) continue;
      const cls = utils.map((u) => part.variants.join('') + u).join(' ');
      els.addClass(cls);
      appliedAny = true;
    }
    if (appliedAny) applied++;
    else residual.push(`/* no match */ ${r.selector} { ${r.decls.map((d) => d[0] + ':' + d[1]).join('; ')} }`);
  }
  return { $, styleEls, allKeyframes, allImports, applied, residualCss: residual.join('\n') };
}

// Write the analyzed file back: remove processed style blocks, inject residual (inline if
// small, else externalized), imports -> links, keyframes -> tailwind.config.
function writeFile(filePath, ar, externalizeAll) {
  const { $, styleEls, allKeyframes, allImports, applied, residualCss } = ar;
  const animations = {};
  for (const name of Object.keys(allKeyframes)) animations[name] = `${name} 1s`;
  for (const { el } of styleEls) $(el).remove();
  let externalized = false;
  if (residualCss.replace(/\s/g, '').length > 0) {
    if (externalizeAll || residualCss.length > EXTERNALIZE_THRESHOLD) {
      externalizeResidual(filePath, $, residualCss);
      externalized = true;
    } else {
      $('head').append(`<style data-tw-residual="1">/* TW-RESIDUAL */\n${residualCss}\n</style>`);
    }
  }
  for (const url of [...new Set(allImports)]) {
    $('head').append(`<link rel="stylesheet" href="${url.startsWith('/') ? url : url}">`);
  }
  extendConfig($, allKeyframes, animations);
  const html = fs.readFileSync(filePath, 'utf8');
  let out = $.html();
  if (!/^<!DOCTYPE/i.test(out) && /<!DOCTYPE/i.test(html)) out = html.slice(0, html.indexOf('>') + 1) + '\n' + out;
  fs.writeFileSync(filePath, out);
  return { applied, externalized, residualChars: externalized ? 0 : residualCss.length, keyframes: Object.keys(allKeyframes).length };
}

// Process a whole site: decide externalize-all when the site's TOTAL residual exceeds the
// strict 1500-char threshold (scanner sums inline chars across all files in the site).
function processSite(dir) {
  const files = listHtml(dir);
  if (!files.length) return { files: 0, applied: 0, externalized: 0, siteResidual: 0 };
  const analyzed = files.map((f) => analyzeFile(f));
  const siteResidual = analyzed.reduce((s, a) => s + a.residualCss.length, 0);
  const externalizeAll = siteResidual > EXTERNALIZE_THRESHOLD;
  let applied = 0, externalized = 0, kf = 0;
  for (let i = 0; i < files.length; i++) {
    const r = writeFile(files[i], analyzed[i], externalizeAll);
    applied += r.applied;
    if (r.externalized) externalized++;
    kf += r.keyframes;
  }
  return { files: files.length, applied, externalized, siteResidual, keyframes: kf };
}

// Move untranslatable residual CSS into an external file + <link> so inline <style> stays near zero.
function externalizeResidual(filePath, $, rCss) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath).replace(/\.html?$/i, '');
  const cssName = `template.${base}.css`;
  const cssPath = path.join(dir, cssName);
  fs.writeFileSync(cssPath, `/* TW externalized residual (non-Tailwind-expressible) */\n${rCss}\n`);
  const link = `<link rel="stylesheet" href="./${cssName}">`;
  const cdn = $('script[src*="cdn.tailwindcss.com"]');
  if (cdn.length) cdn.after(link);
  else $('head').append(link);
}

// ---- driver ----
function resolveDirs(args) {
  const dirs = [];
  if (args.includes('--all-b2')) {
    const scan = JSON.parse(fs.readFileSync(SCAN, 'utf8'));
    for (const s of scan.filter((x) => x.verdict === 'B2')) {
      dirs.push(path.dirname(s.entryUrl).replace(/^\/static-sites\//, ''));
    }
  } else {
    for (const a of args) dirs.push(a);
  }
  return [...new Set(dirs)];
}

const args = process.argv.slice(2);
const dirs = resolveDirs(args);
let ok = 0, fail = 0, totalApplied = 0, totalExternal = 0;
for (const d of dirs) {
  const dir = path.join(ROOT, 'static-sites', d);
  if (!fs.existsSync(dir)) { console.error('[skip] no dir:', dir); fail++; continue; }
  try {
    const r = processSite(dir);
    const flag = r.siteResidual > EXTERNALIZE_THRESHOLD ? ` EXTERNALIZED(${r.externalized})` : '';
    console.log(`[ok] ${d}: files=${r.files} applied=${r.applied} siteResidual=${r.siteResidual} keyframes=${r.keyframes}${flag}`);
    ok++; totalApplied += r.applied; totalExternal += r.externalized;
  } catch (e) {
    console.error(`[fail] ${d}:`, e.message);
    fail++;
  }
}
console.log(`\nDONE: sites=${dirs.length} ok=${ok} fail=${fail} totalRulesApplied=${totalApplied} externalizedFiles=${totalExternal}`);
