// Comate Full Review Script for GitHub Actions
const fs2 = require('fs');
const path2 = require('path');
function log(msg) { console.log('[comate-full-review] ' + msg); }
function findFiles(dir, exts, baseDir) {
  baseDir = baseDir || dir; var results = [];
  var entries = fs2.readdirSync(dir, { withFileTypes: true });
  entries.forEach(function(entry) {
    var fp = path2.join(dir, entry.name); var rp = path2.relative(baseDir, fp);
    if (entry.isDirectory()) {
      if (['node_modules','.git','dist','.next','coverage'].indexOf(entry.name) !== -1) return;
      results = results.concat(findFiles(fp, exts, baseDir));
    } else {
      if (exts.some(function(e) { return entry.name.endsWith(e); })) results.push(rp);
    }
  }); return results;
}
async function main() {
  if (!process.env.COMATE_LICENSE) { log('ERROR: no license'); process.exit(1); }
  log('Starting full review...');
  var sourceFiles = findFiles(process.cwd(), ['.ts','.js','.vue']);
  log('Found ' + sourceFiles.length + ' files');
  var report = '# Full Code Review Report\n\n';
  report += '- **Timestamp:** ' + new Date().toISOString() + '\n';
  report += '- **Total files:** ' + sourceFiles.length + '\n\n';
  var allIssues = []; var sevOrder = {P0:0,P1:1,P2:2,P3:3};
  sourceFiles.forEach(function(file) {
    var c = fs2.readFileSync(file, 'utf8'); var is = analyzeFile(file, c);
    is.forEach(function(i) { allIssues.push(Object.assign({}, i, {file: file})); });
  });
  allIssues.sort(function(a,b) { return sevOrder[a.severity] - sevOrder[b.severity]; });
  var bySev = {};
  allIssues.forEach(function(i) { if (!bySev[i.severity]) bySev[i.severity] = []; bySev[i.severity].push(i); });
  Object.keys(bySev).sort(function(a,b) { return sevOrder[a]-sevOrder[b]; }).forEach(function(sev) {
    var items = bySev[sev];
    report += '## ' + sev + ' Issues (' + items.length + ')\n\n';
    items.slice(0,50).forEach(function(it) { report += '' + it.file + ':' + it.line + ' - ' + it.message + '\n'; });
    if (items.length > 50) report += '... and ' + (items.length-50) + ' more\n';
    report += '\n';
  });
  var p0=(bySev.P0||[]).length,p1=(bySev.P1||[]).length,p2=(bySev.P2||[]).length,p3=(bySev.P3||[]).length;
  report += '## Summary\n\n';
  report += '| Severity | Count |\n|----------|-------|\n';
  report += '| P0 Critical | ' + p0 + ' |\n';
  report += '| P1 High | ' + p1 + ' |\n';
  report += '| P2 Medium | ' + p2 + ' |\n';
  report += '| P3 Low | ' + p3 + ' |\n';
  report += '| **Total** | **' + allIssues.length + '** |\n\n';
  if (p0 > 0) report += p0 + ' CRITICAL issue(s) found!\n';
  else if (p1 > 0) report += p1 + ' high-priority issue(s)\n';
  else report += 'No critical issues found.\n';
  fs2.writeFileSync('review-report.md', report);
  log('Done. P0=' + p0 + ' P1=' + p1 + ' P2=' + p2 + ' P3=' + p3);
}
function analyzeFile(filePath, content) {
  var lines = content.split('\n'); var issues = [];
  var patterns = [
    {r:/any\s*[\[\{]/,s:'P2',m:'Type any detected'},
    {r:/console\.(log|debug|info)/,s:'P3',m:'Console statement'},
    {r:/TODO|FIXME|HACK|XXX/,s:'P3',m:'Tech debt marker'},
    {r:/@ts-ignore|@ts-nocheck/,s:'P2',m:'TS suppressed'},
    {r:/\.env\b(?!\.example)/,s:'P0',m:'env reference (security)'},
    {r:/eval\s*\(/,s:'P0',m:'eval() security risk'},
    {r:/new Function\s*\(/,s:'P0',m:'Function constructor'},
    {r:/innerHTML\s*=/,s:'P1',m:'innerHTML XSS risk'},
    {r:/catch\s*\(\s*\)/,s:'P2',m:'Empty catch'},
    {r:/hardcoded.*password|password\s*=\s*['"][^'"]+['"]/i,s:'P0',m:'Hardcoded password'},
    {r:/secret\s*=\s*['"][^'"]+['"]/i,s:'P0',m:'Hardcoded secret'},
    {r:/api[_-]?key\s*=\s*['"][^'"]+['"]/i,s:'P0',m:'Hardcoded API key'},
    {r:/return\s+true\s*;?\s*}/m,s:'P1',m:'Function always returns true'},
    {r:/increment:\s*\d+/i,s:'P1',m:'Non-atomic increment (race condition)'}
  ];
  lines.forEach(function(line, idx) {
    patterns.forEach(function(p) { if (p.r.test(line)) issues.push({line:idx+1,severity:p.s,message:p.m}); });
  });
  return issues;
}
main().catch(function(e) { log('FATAL: ' + e.message); process.exit(1); });