import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srsPath = path.join(rootDir, 'docs', 'SRS.md');
const csvPath = path.join(rootDir, 'docs', 'traceability.csv');

if (!fs.existsSync(srsPath)) {
  console.error(`Error: SRS file not found at ${srsPath}`);
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`Error: Traceability CSV not found at ${csvPath}`);
  process.exit(1);
}

const srsContent = fs.readFileSync(srsPath, 'utf8');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Regex for SRS requirement IDs
const idPattern = /\b(FR-[A-Z]+-[0-9]{3}|NFR-[A-Z0-9]+-[0-9]{2}|BR-[0-9]{2}|AT-[0-9]{2}|UC-[0-9]{2})\b/g;

// Extract IDs from SRS
const srsMatches = srsContent.match(idPattern) || [];
const srsIds = Array.from(new Set(srsMatches)).sort();

// Parse CSV rows
const csvLines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
const header = csvLines[0].split(',');
const idColIndex = header.indexOf('id');

if (idColIndex === -1) {
  console.error("Error: 'id' column not found in traceability.csv header");
  process.exit(1);
}

const csvIds = [];
const csvDuplicates = [];
const seenCsvIds = new Set();

for (let i = 1; i < csvLines.length; i++) {
  // Simple CSV parser supporting unquoted or quoted values
  const line = csvLines[i];
  const parts = [];
  let inQuotes = false;
  let current = '';

  for (let c = 0; c < line.length; c++) {
    const char = line[c];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  const id = parts[idColIndex]?.trim().replace(/^"|"$/g, '');
  if (id) {
    if (seenCsvIds.has(id)) {
      csvDuplicates.push(id);
    }
    seenCsvIds.add(id);
    csvIds.push(id);
  }
}

// Counts by type
const counts = {
  FR: 0,
  NFR: 0,
  BR: 0,
  AT: 0,
  UC: 0,
};

for (const id of srsIds) {
  const prefix = id.split('-')[0];
  if (counts[prefix] !== undefined) {
    counts[prefix]++;
  }
}

console.log('--- Traceability Validation Report ---');
console.log(`Total unique IDs extracted from docs/SRS.md: ${srsIds.length}`);
console.log(`Total IDs found in docs/traceability.csv:    ${csvIds.length}`);
console.log('Breakdown by type:');
console.log(`  FR:  ${counts.FR} (expected: 77)`);
console.log(`  NFR: ${counts.NFR} (expected: 15)`);
console.log(`  BR:  ${counts.BR} (expected: 18)`);
console.log(`  AT:  ${counts.AT} (expected: 15)`);
console.log(`  UC:  ${counts.UC} (expected: 4)`);

let hasError = false;

if (csvDuplicates.length > 0) {
  console.error(`FAIL: Duplicate IDs found in CSV: ${csvDuplicates.join(', ')}`);
  hasError = true;
}

const missingFromCsv = srsIds.filter(id => !seenCsvIds.has(id));
if (missingFromCsv.length > 0) {
  console.error(`FAIL: IDs present in SRS but missing from CSV: ${missingFromCsv.join(', ')}`);
  hasError = true;
}

const extraInCsv = csvIds.filter(id => !srsIds.includes(id));
if (extraInCsv.length > 0) {
  console.error(`FAIL: IDs present in CSV but not found in SRS: ${extraInCsv.join(', ')}`);
  hasError = true;
}

const expectedCounts = { FR: 77, NFR: 15, BR: 18, AT: 15, UC: 4 };
for (const [type, expected] of Object.entries(expectedCounts)) {
  if (counts[type] !== expected) {
    console.error(`FAIL: Count mismatch for ${type}: got ${counts[type]}, expected ${expected}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\nResult: VALIDATION FAILED');
  process.exit(1);
} else {
  console.log('\nResult: VALIDATION SUCCESSFUL - All 129 requirement IDs match exactly 1:1');
}

