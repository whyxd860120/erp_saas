// Comate Full Review Script for GitHub Actions
// Runs full codebase review (scheduled or manual trigger)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COMATE_LICENSE = process.env.COMATE_LICENSE || '';
const COMATE_USERNAME = process.env.COMATE_USERNAME || '';

function log(msg) {
  console.log([comate-full-review] );
}

function findFiles(dir, exts, baseDir = dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || 
          entry.name === 'dist' || entry.name === '.next' ||
          entry.name === 'coverage') continue;
      results = results.concat(findFiles(fullPath, exts, baseDir));
    } else {
      if (exts.some(e => entry.name.endsWith(e))) {
        results.push(relPath);
      }
    }
  }
  return results;
}

async function main() {
  if (!COMATE_LICENSE) {
    log('ERROR: COMATE_LICENSE not set.');
    process.exit(1);
  }

  log('Starting full codebase review...');

  // Find all source files
  const sourceFiles = findFiles(process.cwd(), ['.ts', '.js', '.vue']);
  log(Found  source files);

  // Analyze all files
  let report = # Full Code Review Report\n\n;
  report += - **Timestamp:** \n;
  report += - **Total files scanned:** \n\n;

  const allIssues = [];
  const severityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const issues = analyzeFile(file, content);
    allIssues.push(...issues.map(i => ({ ...i, file })));
  }

  // Sort by severity
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Group by severity
  const bySeverity = {};
  for (const issue of allIssues) {
    (bySeverity[issue.severity] ||= []).push(issue);
  }

  for (const [severity, issues] of Object.entries(bySeverity)) {
    report += ##  Issues ()\n\n;
    issues.slice(0, 50).forEach(issue => {
      report += - \${issue.file}:\ - \n;
    });
    if (issues.length > 50) {
      report += - ... and  more\n;
    }
    report += '\n';
  }

  const p0Count = (bySeverity.P0 || []).length;
  const p1Count = (bySeverity.P1 || []).length;
  const p2Count = (bySeverity.P2 || []).length;
  const p3Count = (bySeverity.P3 || []).length;

  report += ## Summary\n\n;
  report += | Severity | Count |\n|----------|-------|\n;
  report += | 🔴 P0 Critical |  |\n;
  report += | 🟠 P1 High |  |\n;
  report += | 🟡 P2 Medium |  |\n;
  report += | 🔵 P3 Low |  |\n;
  report += | **Total** | **** |\n\n;

  if (p0Count > 0) {
    report += ⚠️ ** critical issue(s) found!** Immediate attention required.\n;
  } else if (p1Count > 0) {
    report += 📋 ** high-priority issue(s)** should be addressed soon.\n;
  } else {
    report += ✅ No critical or high-priority issues found.\n;
  }

  fs.writeFileSync('review-report.md', report);
  log(Review complete. Report: review-report.md);
  log(P0=, P1=, P2=, P3=);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, p0=\n);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, p1=\n);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 	otal=\n);
  }
}

function analyzeFile(filePath, content) {
  const lines = content.split('\n');
  const issues = [];

  const patterns = [
    { regex: /any\s*[\[\{]/, severity: 'P2', message: 'Type "any" detected' },
    { regex: /console\.(log|debug|info)/, severity: 'P3', message: 'Console statement in code' },
    { regex: /TODO|FIXME|HACK|XXX/, severity: 'P3', message: 'Technical debt marker' },
    { regex: /@ts-ignore|@ts-nocheck/, severity: 'P2', message: 'TypeScript check suppressed' },
    { regex: /\.env\b(?!\.example)/, severity: 'P0', message: 'Possible .env reference (security)' },
    { regex: /eval\s*\(/, severity: 'P0', message: 'eval() usage (security risk)' },
    { regex: /new Function\s*\(/, severity: 'P0', message: 'Function constructor (security)' },
    { regex: /innerHTML\s*=/, severity: 'P1', message: 'innerHTML assignment (XSS risk)' },
    { regex: /catch\s*\(\s*\)/, severity: 'P2', message: 'Empty catch block' },
    { regex: /hardcoded.*password|password\s*=\s*['"][^'"]+['"]/i, severity: 'P0', message: 'Hardcoded password detected' },
    { regex: /secret\s*=\s*['"][^'"]+['"]/i, severity: 'P0', message: 'Hardcoded secret detected' },
    { regex: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'P0', message: 'Hardcoded API key detected' },
    { regex: /\\s*:/, severity: 'P0', message: ' injection risk (MongoDB)' },
    { regex: /sql\s*[\+]|concat\s*\(/i, severity: 'P1', message: 'Possible SQL injection (string concat)' },
    { regex: /return\s+true\s*;?\s*\}/m, severity: 'P1', message: 'Function always returns true (check logic)' },
    { regex: /increment:\s*\d+/i, severity: 'P1', message: 'Non-atomic increment (race condition possible)' },
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
