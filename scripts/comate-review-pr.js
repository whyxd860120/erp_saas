// Comate PR Review Script for GitHub Actions
const fs2 = require('fs');
const COMATE_LICENSE = process.env.COMATE_LICENSE || '';
const PR_FILES = process.env.PR_FILES || '';
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;
function log(msg) { console.log('[comate-review] ' + msg); }
async function main() {
  if (!COMATE_LICENSE) { log('ERROR: COMATE_LICENSE not set.'); process.exit(1); }
  var eventData = JSON.parse(fs2.readFileSync(GITHUB_EVENT_PATH, 'utf8'));
  var prNumber = eventData.number;
  var repo = eventData.repository.full_name;
  log('Reviewing PR #' + prNumber + ' in ' + repo);
  var files = PR_FILES.split('\n').filter(function(f) { return f.trim(); });
  log('Changed files: ' + files.length);
  var sourceFiles = files.filter(function(f) { return f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.vue'); });
  if (sourceFiles.length === 0) { log('No source files to review.'); return; }
  var report = '# Code Review Report - PR #' + prNumber + '\n\n';
  report += '- **Repository:** ' + repo + '\n';
  report += '- **PR:** #' + prNumber + '\n';
  report += '- **Files reviewed:** ' + sourceFiles.length + '\n';
  report += '- **Timestamp:** ' + new Date().toISOString() + '\n\n';
  var issuesFound = 0;
  sourceFiles.forEach(function(file) {
    if (!fs2.existsSync(file)) return;
    var content = fs2.readFileSync(file, 'utf8');
    var issues = analyzeFile(file, content);
    if (issues.length > 0) {
      issuesFound += issues.length;
      report += '## ' + file + '\n\n';
      issues.forEach(function(i) { report += '- [' + i.severity + '] Line ' + i.line + ': ' + i.message + '\n'; });
      report += '\n';
    }
  });
  if (issuesFound === 0) { report += '## Summary\n\nNo critical issues found.\n'; }
  else { report += '## Summary\n\nFound ' + issuesFound + ' potential issue(s).\n'; }
  fs2.writeFileSync('review-report.md', report);
  log('Report written (' + issuesFound + ' issues)');
}
function analyzeFile(fp, content) {
  var lines = content.split('\n');
  var issues = [];
  var pats = [
    {r:/any\s*[\[\{]/,s:'P2',m:'Type any detected'},
    {r:/console\.(log|debug|info)/,s:'P3',m:'Console statement'},
    {r:/TODO|FIXME|HACK|XXX/,s:'P3',m:'Tech debt marker'},
    {r:/@ts-ignore|@ts-nocheck/,s:'P2',m:'TS check suppressed'},
    {r:/\.env\b(?!\.example)/,s:'P0',m:'Possible .env reference'},
    {r:/eval\s*\(/,s:'P0',m:'eval() usage'},
    {r:/new Function\s*\(/,s:'P0',m:'Function constructor'},
    {r:/innerHTML\s*=/,s:'P1',m:'innerHTML assignment (XSS)'},
    {r:/catch\s*\(\s*\)/,s:'P2',m:'Empty catch block'}
  ];
  lines.forEach(function(line, idx) {
    pats.forEach(function(p) { if (p.r.test(line)) issues.push({line:idx+1,severity:p.s,message:p.m}); });
  });
  return issues;
}
main().catch(function(e) { log('FATAL: ' + e.message); process.exit(1); });