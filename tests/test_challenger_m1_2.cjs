/**
 * EMPIRICAL ADVERSARIAL VERIFICATION HARNESS — CHALLENGER M1-2
 * Milestone 1: R1 Touch Ergonomics & Multiplatform Layout
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('⚡ STARTING ADVERSARIAL CHALLENGER M1-2 VERIFICATION HARNESS');
console.log('================================================================\n');

const results = {
  tabOverflow: { passed: 0, failed: 0, checks: [] },
  cssNoScrollbar: { passed: 0, failed: 0, checks: [] },
  personnelReportPrintScope: { passed: 0, failed: 0, checks: [] },
  nonRegressionSecurity: { passed: 0, failed: 0, checks: [] },
};

function record(suite, name, pass, detail = '') {
  if (pass) {
    results[suite].passed++;
    results[suite].checks.push(`  ✓ ${name}`);
  } else {
    results[suite].failed++;
    results[suite].checks.push(`  ✖ ${name}: ${detail}`);
  }
}

// ----------------------------------------------------------------------------
// 1. HORIZONTAL TAB OVERFLOW IN PERSONNELVIEW.TSX & ARTILLERYVIEWCOMPONENT.TSX
// ----------------------------------------------------------------------------
console.log('▶ [CHECK 1] Horizontal Tab Overflow: PersonnelView.tsx & ArtilleryViewComponent.tsx...');

const personnelViewPath = path.join(rootDir, 'components', 'PersonnelView.tsx');
const personnelViewSrc = fs.readFileSync(personnelViewPath, 'utf8');

// PersonnelView container
const pvHasOverflowX = personnelViewSrc.includes('overflow-x-auto');
const pvHasNoScrollbar = personnelViewSrc.includes('no-scrollbar');
const pvHasScrollSmooth = personnelViewSrc.includes('scroll-smooth');
const pvHasMinWMax = personnelViewSrc.includes('min-w-max');

record('tabOverflow', 'PersonnelView tab container has overflow-x-auto', pvHasOverflowX);
record('tabOverflow', 'PersonnelView tab container has no-scrollbar', pvHasNoScrollbar);
record('tabOverflow', 'PersonnelView tab container has scroll-smooth', pvHasScrollSmooth);
record('tabOverflow', 'PersonnelView inner flex has min-w-max to avoid tab crunching', pvHasMinWMax);

// Tab buttons in PersonnelView
const pvCatalogBtn = personnelViewSrc.includes("whitespace-nowrap flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'catalog'");
const pvStatusBtn = personnelViewSrc.includes("whitespace-nowrap flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'status'");
const pvReportsBtn = personnelViewSrc.includes("whitespace-nowrap flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports'");

record('tabOverflow', 'PersonnelView catalog tab has whitespace-nowrap & flex-shrink-0', pvCatalogBtn);
record('tabOverflow', 'PersonnelView status tab has whitespace-nowrap & flex-shrink-0', pvStatusBtn);
record('tabOverflow', 'PersonnelView reports tab has whitespace-nowrap & flex-shrink-0', pvReportsBtn);

// ArtilleryViewComponent
const artilleryViewPath = path.join(rootDir, 'components', 'ArtilleryViewComponent.tsx');
const artilleryViewSrc = fs.readFileSync(artilleryViewPath, 'utf8');

const artHasOverflowX = artilleryViewSrc.includes('overflow-x-auto');
const artHasNoScrollbar = artilleryViewSrc.includes('no-scrollbar');
const artHasScrollSmooth = artilleryViewSrc.includes('scroll-smooth');
const artHasMinW0 = artilleryViewSrc.includes('min-w-0');

record('tabOverflow', 'ArtilleryViewComponent tab container has overflow-x-auto', artHasOverflowX);
record('tabOverflow', 'ArtilleryViewComponent tab container has no-scrollbar', artHasNoScrollbar);
record('tabOverflow', 'ArtilleryViewComponent tab container has scroll-smooth', artHasScrollSmooth);
record('tabOverflow', 'ArtilleryViewComponent tab container has min-w-0 for flex parent shrinking', artHasMinW0);

// TabButton definition
const tabButtonSubstr = artilleryViewSrc.substring(
  artilleryViewSrc.indexOf('const TabButton:'),
  artilleryViewSrc.indexOf('export const ArtilleryViewComponent:')
);
const tbHasNowrap = tabButtonSubstr.includes('whitespace-nowrap');
const tbHasShrink0 = tabButtonSubstr.includes('flex-shrink-0');
const tbHasMinH44 = tabButtonSubstr.includes('min-h-[44px]');

record('tabOverflow', 'ArtilleryViewComponent TabButton has whitespace-nowrap', tbHasNowrap, tabButtonSubstr);
record('tabOverflow', 'ArtilleryViewComponent TabButton has flex-shrink-0', tbHasShrink0, tabButtonSubstr);
record('tabOverflow', 'ArtilleryViewComponent TabButton has min-h-[44px] touch target', tbHasMinH44, tabButtonSubstr);

console.log(results.tabOverflow.checks.join('\n'));
console.log(`  Subtotal: ${results.tabOverflow.passed} passed, ${results.tabOverflow.failed} failed\n`);

// ----------------------------------------------------------------------------
// 2. CSS DEFINITION IN INDEX.CSS FOR .NO-SCROLLBAR ACROSS BROWSER ENGINES
// ----------------------------------------------------------------------------
console.log('▶ [CHECK 2] CSS .no-scrollbar Cross-Browser Engine Support...');

const indexCssPath = path.join(rootDir, 'index.css');
const indexCssSrc = fs.readFileSync(indexCssPath, 'utf8');

// WebKit / Blink (Chrome, Safari, Edge, Opera)
const hasWebkitScrollbar = /\.no-scrollbar::-webkit-scrollbar\s*\{\s*display:\s*none;?\s*\}/.test(indexCssSrc);
record('cssNoScrollbar', 'index.css defines .no-scrollbar::-webkit-scrollbar { display: none } for WebKit/Blink', hasWebkitScrollbar);

// IE / Edge Legacy
const hasMsOverflow = /\.no-scrollbar\s*\{[^}]*-ms-overflow-style:\s*none;?[^}]*\}/.test(indexCssSrc);
record('cssNoScrollbar', 'index.css defines -ms-overflow-style: none for IE/Edge', hasMsOverflow);

// Firefox (Gecko)
const hasScrollbarWidth = /\.no-scrollbar\s*\{[^}]*scrollbar-width:\s*none;?[^}]*\}/.test(indexCssSrc);
record('cssNoScrollbar', 'index.css defines scrollbar-width: none for Firefox', hasScrollbarWidth);

// Compiled bundle test
const distAssetsDir = path.join(rootDir, 'dist', 'assets');
let distCssFiles = [];
if (fs.existsSync(distAssetsDir)) {
  distCssFiles = fs.readdirSync(distAssetsDir).filter(f => f.startsWith('index-') && f.endsWith('.css'));
}
const compiledCssHasRules = distCssFiles.some(f => {
  const css = fs.readFileSync(path.join(distAssetsDir, f), 'utf8');
  return css.includes('.no-scrollbar::-webkit-scrollbar{display:none}') &&
         css.includes('-ms-overflow-style:none') &&
         css.includes('scrollbar-width:none');
});
record('cssNoScrollbar', 'Compiled production bundle retains all .no-scrollbar engine rules', compiledCssHasRules);

console.log(results.cssNoScrollbar.checks.join('\n'));
console.log(`  Subtotal: ${results.cssNoScrollbar.passed} passed, ${results.cssNoScrollbar.failed} failed\n`);

// ----------------------------------------------------------------------------
// 3. PERSONNELREPORT.TSX PRINT VS SCREEN MEDIA SCOPING
// ----------------------------------------------------------------------------
console.log('▶ [CHECK 3] PersonnelReport.tsx Print vs Screen Theme Isolation...');

const reportPath = path.join(rootDir, 'components', 'PersonnelReport.tsx');
const reportSrc = fs.readFileSync(reportPath, 'utf8');

// Root container check
const rootContainerHasScreenDark = reportSrc.includes('bg-transparent min-h-screen text-gray-100');
const rootContainerHasPrintWhite = reportSrc.includes('print:bg-white print:text-black print:p-0 print:font-serif');
record('personnelReportPrintScope', 'Root container uses bg-transparent / text-gray-100 on screen', rootContainerHasScreenDark);
record('personnelReportPrintScope', 'Root container strictly scopes white bg to print (print:bg-white print:text-black)', rootContainerHasPrintWhite);

// Document paper container check
const docPaperHasScreenDark = reportSrc.includes('bg-gray-900/90 border border-gray-700/80 rounded-2xl shadow-2xl');
const docPaperHasPrintWhite = reportSrc.includes('print:bg-white print:border-none print:shadow-none print:p-0 print:rounded-none print:text-black');
record('personnelReportPrintScope', 'Document paper container uses dark HUD theme on screen', docPaperHasScreenDark);
record('personnelReportPrintScope', 'Document paper container strips shadows/borders and sets white bg on print', docPaperHasPrintWhite);

// Controls (Export CSV / Print buttons) hidden during print
const controlsHiddenOnPrint = reportSrc.includes('print:hidden');
record('personnelReportPrintScope', 'Print & Export controls are marked print:hidden', controlsHiddenOnPrint);

// Check that no un-scoped bg-white or text-black exists on major containers
const lines = reportSrc.split('\n');
let unScopedBgWhiteCount = 0;
let unScopedTextBlackCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('className=')) {
    const matches = line.matchAll(/className=["`{]([^"`}]+)["`}]/g);
    for (const m of matches) {
      const clsString = m[1];
      const tokens = clsString.split(/\s+/);
      for (const token of tokens) {
        if (token === 'bg-white' || token === 'bg-gray-100') {
          unScopedBgWhiteCount++;
        }
        if (token === 'text-black' || token === 'text-gray-900') {
          unScopedTextBlackCount++;
        }
      }
    }
  }
}

record('personnelReportPrintScope', 'Zero un-scoped bg-white or bg-gray-100 on screen elements', unScopedBgWhiteCount === 0, `Found ${unScopedBgWhiteCount}`);
record('personnelReportPrintScope', 'Zero un-scoped text-black or text-gray-900 on screen elements', unScopedTextBlackCount === 0, `Found ${unScopedTextBlackCount}`);

console.log(results.personnelReportPrintScope.checks.join('\n'));
console.log(`  Subtotal: ${results.personnelReportPrintScope.passed} passed, ${results.personnelReportPrintScope.failed} failed\n`);

// ----------------------------------------------------------------------------
// 4. NON-REGRESSION: 2FA, SECURITY, AND INTEGRITY
// ----------------------------------------------------------------------------
console.log('▶ [CHECK 4] Non-Regression: 2FA, Security Filters, Alert Handlers...');

const twoFactorPath = path.join(rootDir, 'components', 'TwoFactorSetupModal.tsx');
const twoFactorSrc = fs.readFileSync(twoFactorPath, 'utf8');

// Verify 2FA logic functions exist intact
const hasCodeState = twoFactorSrc.includes("const [code, setCode] = useState('');");
const hasGenerate2fa = twoFactorSrc.includes('adminService.generate2fa()');
const hasEnable2fa = twoFactorSrc.includes('adminService.enable2fa(code)');
const hasDisable2fa = twoFactorSrc.includes('adminService.disable2fa(code)');
const hasDynamicHeight = twoFactorSrc.includes('max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar');

record('nonRegressionSecurity', 'TwoFactorSetupModal retains code state', hasCodeState);
record('nonRegressionSecurity', 'TwoFactorSetupModal retains adminService.generate2fa invocation', hasGenerate2fa);
record('nonRegressionSecurity', 'TwoFactorSetupModal retains adminService.enable2fa invocation', hasEnable2fa);
record('nonRegressionSecurity', 'TwoFactorSetupModal retains adminService.disable2fa invocation', hasDisable2fa);
record('nonRegressionSecurity', 'TwoFactorSetupModal incorporates max-h dynamic height containment', hasDynamicHeight);

// AlertItemComponent
const alertItemPath = path.join(rootDir, 'components', 'AlertItemComponent.tsx');
const alertItemSrc = fs.readFileSync(alertItemPath, 'utf8');

const hasApprovePlatoonNovelty = alertItemSrc.includes('approvePlatoonNovelty(alertItem.id, currentUser!.id)');
const hasApproveAmmoReport = alertItemSrc.includes('approveAmmoReport(alertItem.id, currentUser!.id)');
const hasAcknowledgeAlert = alertItemSrc.includes('acknowledgeAlert(alertItem.id)');
const hasMin44Alerts = alertItemSrc.includes('min-h-[44px] min-w-[44px]');

record('nonRegressionSecurity', 'AlertItemComponent retains approvePlatoonNovelty handler', hasApprovePlatoonNovelty);
record('nonRegressionSecurity', 'AlertItemComponent retains approveAmmoReport handler', hasApproveAmmoReport);
record('nonRegressionSecurity', 'AlertItemComponent retains acknowledgeAlert handler', hasAcknowledgeAlert);
record('nonRegressionSecurity', 'AlertItemComponent applies min 44x44px touch ergonomics', hasMin44Alerts);

console.log(results.nonRegressionSecurity.checks.join('\n'));
console.log(`  Subtotal: ${results.nonRegressionSecurity.passed} passed, ${results.nonRegressionSecurity.failed} failed\n`);

// ----------------------------------------------------------------------------
// FINAL SUMMARY
// ----------------------------------------------------------------------------
const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

console.log('════════════════════════════════════════════════════════════════');
console.log(`CHALLENGER M1-2 EMPIRICAL VERIFICATION SUMMARY:`);
console.log(`  Total Checks: ${totalPassed + totalFailed}`);
console.log(`  Passed:       ${totalPassed}`);
console.log(`  Failed:       ${totalFailed}`);
console.log(`  Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
console.log('════════════════════════════════════════════════════════════════\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
