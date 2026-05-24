// Comate PR Review Script for GitHub Actions
// Reviews only changed files in a Pull Request

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COMATE_LICENSE = process.env.COMATE_LICENSE || '';
const COMATE_USERNAME = process.env.COMATE_USERNAME || '';
const PR_FILES = process.env.PR_FILES || '';
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;

function log(msg) {
  console.log([comate-review] );
}

async function main() {
  if (!COMATE_LICENSE) {
    log('ERROR: COMATE_LICENSE not set. Add it as GitHub Secret.');
    process.exit(1);
  }

  // Parse PR event
  const eventData = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf8'));
  const prNumber = eventData.number;
  const repo = eventData.repository.full_name;
  log(Reviewing PR # in );

  // Get changed files list
  const files = PR_FILES.split('\n').filter(f => f.trim());
  log(Changed files: );
  
  // Filter to source files only
  const sourceFiles = files.filter(f =>
    f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.vue')
  );
  
  if (sourceFiles.length === 0) {
    log('No source files to review.');
    return;
  }
  log(Source files to review: );

  // Generate review report using zulu CLI (simulated)
  // Note: In CI, we use the Comate API or run analysis locally
  let report = # Code Review Report - PR #\n\n;
  report += - **Repository:** \n;
  report += - **PR:** #\n;
  report += - **Files reviewed:** \n;
  report += - **Timestamp:** \n\n;

  // Basic static analysis on each file
  let issuesFound = 0;
  for (const file of sourceFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const issues = analyzeFile(file, content);
    if (issues.length > 0) {
      issuesFound += issues.length;
      report += ## \${file}\\n\n;
      issues.forEach(issue => {
        report += - [] Line : \n;
      });
      report += '\n';
    }
  }

  if (issuesFound === 0) {
    report += '## Summary\n\n✅ No critical issues found.\n';
  } else {
    report += ## Summary\n\n⚠️ Found **** potential issue(s).\n;
  }

  fs.writeFileSync('review-report.md', report);
  log(Report written to review-report.md ( issues found));

  // Output summary for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, issues=\n);
  }
}

function analyzeFile(filePath, content) {
  const lines = content.split('\n');
  const issues = [];

  // Common patterns to check
  const patterns = [
    { regex: /any\s*[\[\{]/, severity: 'P2', message: 'Type "any" detected - consider specific type' },
    { regex: /console\.(log|debug|info)/, severity: 'P3', message: 'Console statement left in code' },
    { regex: /TODO|FIXME|HACK|XXX/, severity: 'P3', message: 'Technical debt marker found' },
    { regex: /@ts-ignore|@ts-nocheck/, severity: 'P2', message: 'TypeScript check suppressed' },
    { regex: /\.env\b(?!\.example)/, severity: 'P0', message: 'Possible .env file reference (security risk)' },
    { regex: /eval\s*\(/, severity: 'P0', message: 'eval() usage - security risk' },
    { regex: /new Function\s*\(/, severity: 'P0', message: 'Function constructor - security risk' },
    { regex: /innerHTML\s*=/, severity: 'P1', message: 'innerHTML assignment - XSS risk' },
    { regex: /catch\s*\(\s*\)/, severity: 'P2', message: 'Empty catch block - errors swallowed' },
    { regex: /Promise\.all\([^)]*\)(?!\.then|;|\s*\n)/, severity: 'P2', message: 'Promise.all without error handling' },
  ];

  lines.forEach((line, idx) => {
    patterns.forEach(p => {
      if (p.regex.test(line)) {
        issues.push({ line: idx + 1, severity: p.severity, message: p.message });
      }
    });
  });

  return issues;
}

main().catch(err => {
  log(FATAL: );
  process.exit(1);
});
