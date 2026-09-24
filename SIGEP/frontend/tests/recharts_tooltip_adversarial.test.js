/**
 * Automated Adversarial Test Suite: Recharts Custom Tactical Tooltip & Edge Cases
 * Targets: src/components/AnalysisDashboard.tsx (CustomTacticalTooltip, Recharts integration)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// MOS dictionary mapping extracted directly from AnalysisDashboard.tsx
const MOS_DESCRIPTIONS = {
  '11B': 'Infantería Ligera / Fusilero',
  '11A': 'Oficial de Infantería',
  '19D': 'Caballería / Exploración y Reconocimiento',
  '19K': 'Blindados / Tripulante de Tanques',
  '13A': 'Oficial de Artillería de Campaña',
  '13B': 'Artillería / Cañones y Obuses',
  '12B': 'Ingenieros Militares de Combate',
  '25B': 'Comunicaciones y Telemática',
  '25U': 'Sistemas de Transmisiones Tácticas',
  '35M': 'Inteligencia Militar / Interrogatorio',
  '35F': 'Analista de Inteligencia Táctica',
  '68W': 'Sanidad Militar / Enfermero de Combate',
  '91B': 'Mantenimiento de Vehículos y Blindados',
  '92Y': 'Logística / Abastecimiento Clase I-V',
  'MOS-SD': 'Sin Determinar'
};

function getMosLabel(code) {
  if (!code) return 'Sin Determinar';
  return MOS_DESCRIPTIONS[code] || `Especialidad Militar ${code}`;
}

function getIndicatorColorClass(name, dataKey) {
  if (dataKey === 'required') return 'bg-sky-400';
  if (dataKey === 'actual') return 'bg-emerald-500';
  if (name?.includes('Apto') && !name.includes('No Apto')) return 'bg-emerald-500';
  if (name?.includes('No Apto') || name?.includes('Baja')) return 'bg-rose-500';
  if (name?.includes('Excusado')) return 'bg-amber-500';
  if (name?.includes('Licencia')) return 'bg-sky-500';
  return 'bg-cyan-400';
}

/**
 * Exact replica of CustomTacticalTooltip from AnalysisDashboard.tsx
 */
const CustomTacticalTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const isBarChart = payload.length >= 2;
  const isPieChart = payload.length === 1 && !label;

  const reqItem = payload.find(p => p.dataKey === 'required');
  const actItem = payload.find(p => p.dataKey === 'actual');

  const reqVal = typeof reqItem?.value === 'number' ? reqItem.value : 0;
  const actVal = typeof actItem?.value === 'number' ? actItem.value : 0;
  const delta = actVal - reqVal;

  return React.createElement(
    'div',
    {
      className:
        'bg-slate-950/95 border border-cyan-500/40 backdrop-blur-md rounded-xl p-3.5 shadow-2xl shadow-cyan-950/50 font-mono text-xs text-slate-100 min-w-[220px] pointer-events-none'
    },
    label &&
      React.createElement(
        'div',
        { className: 'border-b border-slate-800 pb-2 mb-2' },
        React.createElement(
          'div',
          { className: 'text-[10px] text-cyan-400 font-bold uppercase tracking-widest' },
          'MOS / Especialidad'
        ),
        React.createElement(
          'div',
          { className: 'text-sm font-bold text-white flex items-center gap-2' },
          React.createElement('span', null, label),
          React.createElement(
            'span',
            { className: 'text-[11px] font-normal text-slate-400 font-sans' },
            `(${getMosLabel(label)})`
          )
        )
      ),
    isPieChart &&
      payload[0] &&
      React.createElement(
        'div',
        { className: 'border-b border-slate-800 pb-2 mb-2' },
        React.createElement(
          'div',
          { className: 'text-[10px] text-cyan-400 font-bold uppercase tracking-widest' },
          'Disponibilidad Médica'
        ),
        React.createElement('div', { className: 'text-sm font-bold text-white' }, payload[0].name)
      ),
    React.createElement(
      'div',
      { className: 'space-y-1.5 py-1' },
      payload.map((entry, index) => {
        const dotClass = getIndicatorColorClass(entry.name, entry.dataKey);
        return React.createElement(
          'div',
          { key: `entry-${index}`, className: 'flex items-center justify-between gap-4 py-0.5' },
          React.createElement(
            'span',
            { className: 'text-slate-300 font-sans flex items-center gap-2' },
            React.createElement('span', {
              className: `w-2.5 h-2.5 rounded-full ring-1 ring-slate-700 ${dotClass}`
            }),
            React.createElement('span', null, `${entry.name}:`)
          ),
          React.createElement(
            'span',
            { className: 'font-bold text-white tabular-nums font-mono' },
            entry.value
          )
        );
      })
    ),
    isBarChart &&
      reqItem &&
      actItem &&
      React.createElement(
        'div',
        {
          className:
            'mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono'
        },
        React.createElement('span', { className: 'text-[11px] text-slate-400' }, 'Balance Diferencial:'),
        React.createElement(
          'span',
          {
            className: `font-bold tabular-nums text-xs px-2 py-0.5 rounded ${
              delta >= 0
                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                : 'text-rose-400 bg-rose-950/60 border border-rose-500/30'
            }`
          },
          delta >= 0 ? `+${delta} Excedente` : `${delta} Déficit`
        )
      )
  );
};

describe('Recharts Custom Tactical Tooltip & Edge Cases', () => {
  // -------------------------------------------------------------------------
  // Test 1: Inactive and Empty Payloads
  // -------------------------------------------------------------------------
  test('TC-T01: Inactive state returns empty markup (null)', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: false, payload: [{ value: 10 }] })
    );
    assert.strictEqual(html, '', 'Inactive tooltip must render null');
  });

  test('TC-T02: Empty payload array returns empty markup (null)', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload: [] })
    );
    assert.strictEqual(html, '', 'Empty payload must render null');
  });

  test('TC-T03: Undefined payload returns empty markup (null)', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload: undefined })
    );
    assert.strictEqual(html, '', 'Undefined payload must render null');
  });

  // -------------------------------------------------------------------------
  // Test 2: BarChart Tooltip - Deficit, Complete, Surplus
  // -------------------------------------------------------------------------
  test('TC-T04: BarChart Tooltip correctly displays Deficit with rose styling', () => {
    const payload = [
      { name: 'Dotación Requerida (TOE)', dataKey: 'required', value: 30 },
      { name: 'Efectivos Físicos (Real)', dataKey: 'actual', value: 18 }
    ];
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload, label: '11B' })
    );

    assert.ok(html.includes('11B'), 'Must render MOS code');
    assert.ok(html.includes('Infantería Ligera / Fusilero'), 'Must render translated doctrinal MOS name');
    assert.ok(html.includes('-12 Déficit'), 'Must calculate exact negative delta (-12 Déficit)');
    assert.ok(html.includes('text-rose-400'), 'Must apply rose accent class for deficit');
    assert.ok(!html.includes('style='), 'Zero inline styles: must use 100% Tailwind classes');
  });

  test('TC-T05: BarChart Tooltip correctly displays Surplus with emerald styling', () => {
    const payload = [
      { name: 'Dotación Requerida (TOE)', dataKey: 'required', value: 20 },
      { name: 'Efectivos Físicos (Real)', dataKey: 'actual', value: 25 }
    ];
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload, label: '19D' })
    );

    assert.ok(html.includes('+5 Excedente'), 'Must calculate exact positive delta (+5 Excedente)');
    assert.ok(html.includes('text-emerald-400'), 'Must apply emerald accent class for surplus');
  });

  test('TC-T06: BarChart Tooltip handles exact balance (Delta = 0)', () => {
    const payload = [
      { name: 'Dotación Requerida (TOE)', dataKey: 'required', value: 40 },
      { name: 'Efectivos Físicos (Real)', dataKey: 'actual', value: 40 }
    ];
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload, label: '68W' })
    );

    assert.ok(html.includes('+0 Excedente'), 'Zero delta is considered non-deficit (+0 Excedente)');
    assert.ok(html.includes('text-emerald-400'));
  });

  // -------------------------------------------------------------------------
  // Test 3: PieChart Tooltip - Medical / Availability Slices
  // -------------------------------------------------------------------------
  test('TC-T07: PieChart Tooltip renders single slice for Aptos Operacionales', () => {
    const payload = [{ name: 'Aptos Operacionales', value: 120 }];
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload })
    );

    assert.ok(html.includes('Disponibilidad Médica'), 'Must render pie chart section header');
    assert.ok(html.includes('Aptos Operacionales'), 'Must render entry name');
    assert.ok(html.includes('120'), 'Must render entry value');
    assert.ok(html.includes('bg-emerald-500'), 'Aptos dot must be emerald');
  });

  test('TC-T08: PieChart Tooltip renders correctly for No Aptos / Bajas', () => {
    const payload = [{ name: 'No Aptos / Bajas', value: 14 }];
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload })
    );

    assert.ok(html.includes('No Aptos / Bajas'));
    assert.ok(html.includes('bg-rose-500'), 'No Aptos dot must be rose');
  });

  // -------------------------------------------------------------------------
  // Test 4: Adversarial Input Injection
  // -------------------------------------------------------------------------
  test('TC-T09: Adversarial input with string numbers does not throw', () => {
    const payload = [
      { name: 'Dotación Requerida (TOE)', dataKey: 'required', value: '30' },
      { name: 'Efectivos Físicos (Real)', dataKey: 'actual', value: '25' }
    ];
    // typeof value === 'number' is false, so it falls back to 0
    const html = ReactDOMServer.renderToString(
      React.createElement(CustomTacticalTooltip, { active: true, payload, label: '11B' })
    );

    assert.ok(html.length > 0, 'Must render without throwing exception');
    assert.ok(html.includes('+0 Excedente'), 'String values fallback gracefully to 0');
  });

  test('TC-T10: Unknown MOS code gracefully falls back', () => {
    const label = 'UNKNOWN_MOS_99Z';
    const fallback = getMosLabel(label);
    assert.strictEqual(fallback, 'Especialidad Militar UNKNOWN_MOS_99Z');
  });

  test('TC-T11: Empty/null label fallback', () => {
    assert.strictEqual(getMosLabel(undefined), 'Sin Determinar');
    assert.strictEqual(getMosLabel(''), 'Sin Determinar');
  });

  // -------------------------------------------------------------------------
  // Test 5: Recharts Direct Component Rendering with Empty & Zero Datasets
  // -------------------------------------------------------------------------
  test('TC-T12: Recharts BarChart renders cleanly with empty dataset []', () => {
    const chart = React.createElement(
      BarChart,
      { width: 500, height: 300, data: [] },
      React.createElement(Bar, { dataKey: 'required' }),
      React.createElement(Bar, { dataKey: 'actual' })
    );

    const html = ReactDOMServer.renderToString(chart);
    assert.ok(html.includes('recharts-wrapper'), 'Must render recharts container even with empty dataset');
  });

  test('TC-T13: Recharts PieChart renders cleanly with all-zero values dataset', () => {
    const zeroPieData = [
      { name: 'Aptos', value: 0 },
      { name: 'No Aptos', value: 0 },
      { name: 'Excusados', value: 0 },
      { name: 'Licencias', value: 0 }
    ];

    const chart = React.createElement(
      PieChart,
      { width: 300, height: 300 },
      React.createElement(
        Pie,
        { data: zeroPieData, dataKey: 'value', nameKey: 'name' },
        zeroPieData.map((_, i) => React.createElement(Cell, { key: `c-${i}`, fill: '#000' }))
      )
    );

    const html = ReactDOMServer.renderToString(chart);
    assert.ok(html.includes('recharts-wrapper'), 'PieChart must render without runtime explosion on all zeros');
  });
});
