import DOMPurify from 'dompurify';

/**
 * Parses inline formatting like bold, italics, code, and links.
 */
function parseInlineStyles(text: string): string {
  if (!text) return '';

  return text
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="bg-gray-850 text-amber-300 px-1.5 py-0.5 rounded text-xs border border-gray-700 font-mono">$1</code>')
    // Bold: **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic: *text* or _text_
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em class="text-gray-300 italic">$2</em>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<em class="text-gray-300 italic">$2</em>');
}

/**
 * Checks if a string is a markdown table separator line (e.g., |---|:---|---:|)
 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const inner = trimmed.slice(1, -1);
  const parts = inner.split('|');
  return parts.length > 0 && parts.every(part => /^[\s:-]+$/.test(part) && part.includes('-'));
}

/**
 * Splits a table row into cells, trimming whitespace.
 */
function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  let content = trimmed;
  if (content.startsWith('|')) content = content.slice(1);
  if (content.endsWith('|')) content = content.slice(0, -1);
  return content.split('|').map(cell => cell.trim());
}

/**
 * Converts a block of markdown table lines into an HTML table with dark tactical styling.
 */
function formatTableBlock(lines: string[]): string {
  if (lines.length < 2) return lines.join('<br />');

  const headerRow = parseTableRow(lines[0]);
  let startIndex = 1;
  
  // Check if second line is separator
  if (lines.length > 1 && isTableSeparator(lines[1])) {
    startIndex = 2;
  }

  const rows: string[][] = [];
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim().length > 0 && !isTableSeparator(lines[i])) {
      rows.push(parseTableRow(lines[i]));
    }
  }

  let html = '<div class="overflow-x-auto my-3 rounded-lg border border-gray-700/90 shadow-md bg-gray-900/90">';
  html += '<table class="min-w-full text-xs text-left border-collapse divide-y divide-gray-700">';
  
  // Header
  html += '<thead class="bg-gray-800/95 text-cyan-400 font-bold uppercase tracking-wider">';
  html += '<tr>';
  headerRow.forEach((h) => {
    html += `<th class="px-3.5 py-2.5 border-r border-gray-700/80 last:border-r-0 whitespace-nowrap">${parseInlineStyles(h)}</th>`;
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody class="divide-y divide-gray-800 text-gray-200">';
  rows.forEach((r, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? 'bg-gray-900/50' : 'bg-gray-850/50';
    html += `<tr class="${rowBg} hover:bg-gray-800/40 transition-colors">`;
    r.forEach((cell) => {
      html += `<td class="px-3.5 py-2 border-r border-gray-800 last:border-r-0 align-top leading-relaxed">${parseInlineStyles(cell)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  return html;
}

/**
 * Main tactical markdown renderer.
 * Transforms raw markdown into rich, safe, readable tactical HTML for SIMCOP.
 */
export function renderTacticalMarkdown(raw: string): string {
  if (!raw) return '';

  const rawLines = raw.split('\n');
  const resultBlocks: string[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Detect table block
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i]);
        i++;
      }
      resultBlocks.push(formatTableBlock(tableLines));
      continue;
    }

    // 2. Horizontal separator: --- or ***
    if (/^(\s*[-*_]\s*){3,}$/.test(trimmed)) {
      resultBlocks.push('<hr class="my-3.5 border-gray-700/70" />');
      i++;
      continue;
    }

    // 3. Headers
    if (trimmed.startsWith('### ')) {
      const title = trimmed.replace(/^###\s+/, '');
      resultBlocks.push(
        `<h3 class="text-sm font-bold text-cyan-400 mt-4 mb-2 pb-1 border-b border-gray-700/60 uppercase tracking-wide flex items-center gap-1.5">
          <span class="w-1.5 h-3.5 bg-cyan-500 rounded-sm inline-block"></span>
          ${parseInlineStyles(title)}
        </h3>`
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const title = trimmed.replace(/^##\s+/, '');
      resultBlocks.push(
        `<h2 class="text-base font-bold text-amber-400 mt-4 mb-2 pb-1 border-b border-gray-700 flex items-center gap-1.5">
          <span class="w-2 h-4 bg-amber-500 rounded-sm inline-block"></span>
          ${parseInlineStyles(title)}
        </h2>`
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      const title = trimmed.replace(/^#\s+/, '');
      resultBlocks.push(
        `<h1 class="text-lg font-bold text-emerald-400 mt-5 mb-2 pb-1 border-b border-gray-700 flex items-center gap-1.5">
          <span class="w-2.5 h-4.5 bg-emerald-500 rounded-sm inline-block"></span>
          ${parseInlineStyles(title)}
        </h1>`
      );
      i++;
      continue;
    }

    // 4. Numbered list items: 1. 2. 3.
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const text = numberedMatch[2];
      resultBlocks.push(
        `<div class="flex items-start gap-2 my-1.5 ml-1">
          <span class="text-cyan-400 font-bold text-xs shrink-0 mt-0.5 min-w-[1.25rem]">${num}.</span>
          <div class="text-gray-200 text-xs sm:text-sm leading-relaxed">${parseInlineStyles(text)}</div>
        </div>`
      );
      i++;
      continue;
    }

    // 5. Bullet list items: •, -, *
    const isIndented = line.startsWith('  ') || line.startsWith('\t');
    const bulletMatch = trimmed.match(/^[•\-*]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1];
      if (isIndented) {
        resultBlocks.push(
          `<div class="flex items-start gap-2 my-1 ml-5 text-xs text-gray-300">
            <span class="text-amber-400/90 shrink-0 text-[10px] mt-1">▫</span>
            <div class="leading-relaxed">${parseInlineStyles(text)}</div>
          </div>`
        );
      } else {
        resultBlocks.push(
          `<div class="flex items-start gap-2 my-1.5 ml-1">
            <span class="text-emerald-400 shrink-0 text-xs mt-0.5">▪</span>
            <div class="text-gray-200 text-xs sm:text-sm leading-relaxed">${parseInlineStyles(text)}</div>
          </div>`
        );
      }
      i++;
      continue;
    }

    // 6. Empty line
    if (trimmed === '') {
      i++;
      continue;
    }

    // 7. Regular paragraph line
    resultBlocks.push(
      `<p class="my-1.5 leading-relaxed text-gray-200 text-xs sm:text-sm">${parseInlineStyles(trimmed)}</p>`
    );
    i++;
  }

  const rawHtml = resultBlocks.join('\n');
  if (typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function') {
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target', 'rel'],
      ADD_TAGS: ['hr', 'strong', 'em', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'p', 'h1', 'h2', 'h3']
    });
  }
  return rawHtml;
}
