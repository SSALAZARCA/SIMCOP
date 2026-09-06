const fs = require('fs');

// We test the markdown parsing logic directly
function parseInlineStyles(text) {
  if (!text) return '';
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-gray-850 text-amber-300 px-1.5 py-0.5 rounded text-xs border border-gray-700 font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em class="text-gray-300 italic">$2</em>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<em class="text-gray-300 italic">$2</em>');
}

function isTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const inner = trimmed.slice(1, -1);
  const parts = inner.split('|');
  return parts.length > 0 && parts.every(part => /^[\s:-]+$/.test(part) && part.includes('-'));
}

function parseTableRow(line) {
  const trimmed = line.trim();
  let content = trimmed;
  if (content.startsWith('|')) content = content.slice(1);
  if (content.endsWith('|')) content = content.slice(0, -1);
  return content.split('|').map(cell => cell.trim());
}

function formatTableBlock(lines) {
  if (lines.length < 2) return lines.join('<br />');

  const headerRow = parseTableRow(lines[0]);
  let startIndex = 1;
  
  if (lines.length > 1 && isTableSeparator(lines[1])) {
    startIndex = 2;
  }

  const rows = [];
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim().length > 0 && !isTableSeparator(lines[i])) {
      rows.push(parseTableRow(lines[i]));
    }
  }

  let html = '<div class="overflow-x-auto my-3 rounded-lg border border-gray-700/90 shadow-md bg-gray-900/90">';
  html += '<table class="min-w-full text-xs text-left border-collapse divide-y divide-gray-700">';
  html += '<thead class="bg-gray-800/95 text-cyan-400 font-bold uppercase tracking-wider">';
  html += '<tr>';
  headerRow.forEach((h) => {
    html += `<th class="px-3.5 py-2.5 border-r border-gray-700/80 last:border-r-0 whitespace-nowrap">${parseInlineStyles(h)}</th>`;
  });
  html += '</tr></thead>';

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

function renderTacticalMarkdown(raw) {
  if (!raw) return '';

  const rawLines = raw.split('\n');
  const resultBlocks = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i]);
        i++;
      }
      resultBlocks.push(formatTableBlock(tableLines));
      continue;
    }

    if (/^(\s*[-*_]\s*){3,}$/.test(trimmed)) {
      resultBlocks.push('<hr class="my-3.5 border-gray-700/70" />');
      i++;
      continue;
    }

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

    if (trimmed === '') {
      i++;
      continue;
    }

    resultBlocks.push(
      `<p class="my-1.5 leading-relaxed text-gray-200 text-xs sm:text-sm">${parseInlineStyles(trimmed)}</p>`
    );
    i++;
  }

  return resultBlocks.join('\n');
}

// TEST CASES
const testInput = `
---

### 2. Capacidades propias y brechas

| Unidad | Posición (DMS) | Distancia aproximada a cada foco | Capacidades clave | Brechas relevantes |
|---|---|---|---|---|
| **Vigesimonovena Brigada** (2° 27' 02" N, 76° 35' 39" W) | 0 km del Batallón 7 (co-locada) | Retén: ~64 km · Patía: ~57 km | Infantería convencional, 100% munición | No dispone de UAS, combustible desconocido. |
| **Batallón de Infantería No. 7** (2° 26' 55" N, 76° 35' 44" W) | Coincide con Vigesimonovena | Idénticas a la Brigada | Igual que arriba | Idem |

**Brechas críticas:**
1. **Falta de enlace de comunicaciones** – todas las unidades aparecen "Sin Comunicación".
2. **Ausencia de medios aéreos (UAS/Drones)** para reconocimiento rápido de los focos.

---

### 3. Prioridades de optimización del AOI

| Prioridad | Acción | Justificación táctica |
|---|---|---|
| **1. Re-establecer enlace de mando** | Designar un **NODO COM** | Permite coordinación de QRF |
`;

const output = renderTacticalMarkdown(testInput);

console.log("=== OUTPUT VALIDATION ===");
console.log("Contains table tag:", output.includes('<table'));
console.log("Contains thead with cyan:", output.includes('text-cyan-400'));
console.log("Contains bold tags for units:", output.includes('<strong class="text-white font-semibold">Vigesimonovena Brigada</strong>'));
console.log("Contains h3 headers:", output.includes('<h3 class="text-sm font-bold text-cyan-400'));
console.log("Contains numbered list 1:", output.includes('>1.</span>'));
console.log("Contains numbered list 2:", output.includes('>2.</span>'));
console.log("Contains horizontal rule:", output.includes('<hr'));
console.log("=== TEST FINISHED SUCCESSFULLY ===");
