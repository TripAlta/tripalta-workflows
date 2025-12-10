#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    results: '',
    coverage: '',
    threshold: '80',
    framework: 'auto'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--results':
        result.results = args[++i] || '';
        break;
      case '--coverage':
        result.coverage = args[++i] || '';
        break;
      case '--threshold':
        result.threshold = args[++i] || '80';
        break;
      case '--framework':
        result.framework = args[++i] || 'auto';
        break;
    }
  }

  return result;
}

// Parse JUnit XML test results
function parseJUnitXML(content) {
  let total = 0, passed = 0, failed = 0, skipped = 0;

  // Match testsuite elements
  const testsuiteMatches = content.matchAll(/<testsuite[^>]*tests="(\d+)"[^>]*(?:failures="(\d+)")?[^>]*(?:errors="(\d+)")?[^>]*(?:skipped="(\d+)")?/g);

  for (const match of testsuiteMatches) {
    const suiteTotal = parseInt(match[1] || 0);
    const suiteFailures = parseInt(match[2] || 0);
    const suiteErrors = parseInt(match[3] || 0);
    const suiteSkipped = parseInt(match[4] || 0);

    total += suiteTotal;
    failed += suiteFailures + suiteErrors;
    skipped += suiteSkipped;
  }

  // If no testsuite found, try testsuites root element
  if (total === 0) {
    const rootMatch = content.match(/<testsuites[^>]*tests="(\d+)"[^>]*(?:failures="(\d+)")?[^>]*(?:errors="(\d+)")?[^>]*(?:skipped="(\d+)")?/);
    if (rootMatch) {
      total = parseInt(rootMatch[1] || 0);
      failed = parseInt(rootMatch[2] || 0) + parseInt(rootMatch[3] || 0);
      skipped = parseInt(rootMatch[4] || 0);
    }
  }

  passed = total - failed - skipped;
  return { total, passed, failed, skipped };
}

// Parse Jest JSON results
function parseJestJSON(content) {
  try {
    const data = JSON.parse(content);
    return {
      total: data.numTotalTests || 0,
      passed: data.numPassedTests || 0,
      failed: data.numFailedTests || 0,
      skipped: data.numPendingTests || 0
    };
  } catch {
    return { total: 0, passed: 0, failed: 0, skipped: 0 };
  }
}

// Parse test results from path
function parseTestResults(resultsPath, framework) {
  let total = 0, passed = 0, failed = 0, skipped = 0;

  if (!resultsPath || !fs.existsSync(resultsPath)) {
    console.warn(`Warning: Test results path not found: ${resultsPath}`);
    return { total: 0, passed: 0, failed: 0, skipped: 0 };
  }

  const stat = fs.statSync(resultsPath);
  const files = stat.isDirectory()
    ? fs.readdirSync(resultsPath)
        .filter(f => f.endsWith('.xml') || f.endsWith('.json'))
        .map(f => path.join(resultsPath, f))
    : [resultsPath];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    let results;

    if (file.endsWith('.xml')) {
      results = parseJUnitXML(content);
    } else if (file.endsWith('.json')) {
      results = parseJestJSON(content);
    } else {
      continue;
    }

    total += results.total;
    passed += results.passed;
    failed += results.failed;
    skipped += results.skipped;
  }

  return { total, passed, failed, skipped };
}

// Parse coverage report
function parseCoverage(coveragePath) {
  if (!coveragePath || coveragePath === 'undefined' || !fs.existsSync(coveragePath)) {
    return null;
  }

  const content = fs.readFileSync(coveragePath, 'utf-8');

  // Jest JSON coverage summary
  if (coveragePath.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      if (data.total) {
        return {
          lines: data.total.lines?.pct?.toFixed(2) || null,
          branches: data.total.branches?.pct?.toFixed(2) || null,
          functions: data.total.functions?.pct?.toFixed(2) || null,
          statements: data.total.statements?.pct?.toFixed(2) || null
        };
      }
    } catch {
      return null;
    }
  }

  // JaCoCo XML coverage
  if (coveragePath.endsWith('.xml')) {
    const coverage = {};

    const lineMatch = content.match(/<counter type="LINE"[^>]*covered="(\d+)"[^>]*missed="(\d+)"/);
    if (lineMatch) {
      const covered = parseInt(lineMatch[1]);
      const missed = parseInt(lineMatch[2]);
      coverage.lines = ((covered / (covered + missed)) * 100).toFixed(2);
    }

    const branchMatch = content.match(/<counter type="BRANCH"[^>]*covered="(\d+)"[^>]*missed="(\d+)"/);
    if (branchMatch) {
      const covered = parseInt(branchMatch[1]);
      const missed = parseInt(branchMatch[2]);
      coverage.branches = ((covered / (covered + missed)) * 100).toFixed(2);
    }

    const methodMatch = content.match(/<counter type="METHOD"[^>]*covered="(\d+)"[^>]*missed="(\d+)"/);
    if (methodMatch) {
      const covered = parseInt(methodMatch[1]);
      const missed = parseInt(methodMatch[2]);
      coverage.functions = ((covered / (covered + missed)) * 100).toFixed(2);
    }

    return Object.keys(coverage).length > 0 ? coverage : null;
  }

  return null;
}

// Generate progress bar
function generateProgressBar(percentage, length = 30) {
  const filled = Math.round((length * percentage) / 100);
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

// Generate markdown summary
function generateSummary(results, coverage, threshold) {
  const passRate = results.total > 0
    ? ((results.passed / results.total) * 100).toFixed(2)
    : 0;
  const passedThreshold = parseFloat(passRate) >= parseFloat(threshold);

  const statusEmoji = passedThreshold ? '\u2705' : '\u274C';
  const statusText = passedThreshold ? 'PASSED' : 'FAILED';

  let summary = `# ${statusEmoji} Test Summary - ${statusText}\n\n`;

  // Test Results Table
  summary += `## Test Results\n\n`;
  summary += `| Metric | Count | Percentage |\n`;
  summary += `|--------|-------|------------|\n`;
  summary += `| \u2705 Passed | ${results.passed} | ${passRate}% |\n`;
  summary += `| \u274C Failed | ${results.failed} | ${results.total > 0 ? ((results.failed / results.total) * 100).toFixed(2) : 0}% |\n`;
  summary += `| \u23ED\uFE0F Skipped | ${results.skipped} | ${results.total > 0 ? ((results.skipped / results.total) * 100).toFixed(2) : 0}% |\n`;
  summary += `| \uD83D\uDCCA **Total** | **${results.total}** | **100%** |\n\n`;

  // Pass Rate Progress Bar
  const bar = generateProgressBar(parseFloat(passRate));
  summary += `### Pass Rate: ${passRate}%\n`;
  summary += `\`${bar}\` ${passRate}% / ${threshold}% required\n\n`;

  // Coverage (if available)
  if (coverage) {
    summary += `## Code Coverage\n\n`;
    summary += `| Type | Coverage |\n`;
    summary += `|------|----------|\n`;
    if (coverage.lines) summary += `| Lines | ${coverage.lines}% |\n`;
    if (coverage.branches) summary += `| Branches | ${coverage.branches}% |\n`;
    if (coverage.functions) summary += `| Functions | ${coverage.functions}% |\n`;
    if (coverage.statements) summary += `| Statements | ${coverage.statements}% |\n`;
    summary += `\n`;
  }

  // Threshold Status
  summary += `## Threshold Check\n\n`;
  summary += `| Requirement | Status |\n`;
  summary += `|-------------|--------|\n`;
  summary += `| Pass rate \u2265 ${threshold}% | ${passedThreshold ? '\u2705 Met' : '\u274C Not Met'} |\n`;

  return { summary, passedThreshold, passRate };
}

// Write GitHub Actions outputs
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

// Main execution
const args = parseArgs();
const results = parseTestResults(args.results, args.framework);
const coverage = parseCoverage(args.coverage);
const { summary, passedThreshold, passRate } = generateSummary(results, coverage, args.threshold);

// Write to GitHub Step Summary
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  fs.appendFileSync(summaryPath, summary);
}

// Set outputs for other steps
setOutput('total', results.total);
setOutput('passed', results.passed);
setOutput('failed', results.failed);
setOutput('skipped', results.skipped);
setOutput('pass_rate', passRate);
setOutput('threshold_met', passedThreshold);

// Console output
console.log(summary);
console.log(`\n\uD83D\uDCCA Pass Rate: ${passRate}%`);
console.log(`\uD83D\uDCCB Threshold: ${args.threshold}%`);
console.log(`${passedThreshold ? '\u2705 BUILD PASSED' : '\u274C BUILD FAILED'}`);

// Exit with failure if threshold not met
if (!passedThreshold) {
  console.error(`\n\u274C ERROR: Pass rate (${passRate}%) is below threshold (${args.threshold}%)`);
  process.exit(1);
}
