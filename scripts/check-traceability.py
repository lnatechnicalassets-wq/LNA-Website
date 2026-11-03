import csv
import re
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
srs_path = root_dir / 'docs' / 'SRS.md'
csv_path = root_dir / 'docs' / 'traceability.csv'

if not srs_path.exists():
    print(f"Error: SRS file not found at {srs_path}", file=sys.stderr)
    sys.exit(1)

if not csv_path.exists():
    print(f"Error: Traceability CSV not found at {csv_path}", file=sys.stderr)
    sys.exit(1)

srs_content = srs_path.read_text(encoding='utf-8')

# Regex for SRS requirement IDs
id_pattern = r'\b(FR-[A-Z]+-[0-9]{3}|NFR-[A-Z0-9]+-[0-9]{2}|BR-[0-9]{2}|AT-[0-9]{2}|UC-[0-9]{2})\b'
srs_matches = re.findall(id_pattern, srs_content)
srs_ids = sorted(list(set(srs_matches)))

csv_ids = []
csv_duplicates = []
seen_csv_ids = set()

with open(csv_path, 'r', encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    if 'id' not in reader.fieldnames:
        print("Error: 'id' column not found in traceability.csv header", file=sys.stderr)
        sys.exit(1)
    for row in reader:
        item_id = row['id'].strip()
        if item_id in seen_csv_ids:
            csv_duplicates.append(item_id)
        seen_csv_ids.add(item_id)
        csv_ids.append(item_id)

counts = {'FR': 0, 'NFR': 0, 'BR': 0, 'AT': 0, 'UC': 0}
for i in srs_ids:
    prefix = i.split('-')[0]
    if prefix in counts:
        counts[prefix] += 1

print('--- Traceability Validation Report ---')
print(f'Total unique IDs extracted from docs/SRS.md: {len(srs_ids)}')
print(f'Total IDs found in docs/traceability.csv:    {len(csv_ids)}')
print('Breakdown by type:')
print(f"  FR:  {counts['FR']} (expected: 77)")
print(f"  NFR: {counts['NFR']} (expected: 15)")
print(f"  BR:  {counts['BR']} (expected: 18)")
print(f"  AT:  {counts['AT']} (expected: 15)")
print(f"  UC:  {counts['UC']} (expected: 4)")

has_error = False

if csv_duplicates:
    print(f"FAIL: Duplicate IDs found in CSV: {', '.join(csv_duplicates)}", file=sys.stderr)
    has_error = True

missing_from_csv = [i for i in srs_ids if i not in seen_csv_ids]
if missing_from_csv:
    print(f"FAIL: IDs present in SRS but missing from CSV: {', '.join(missing_from_csv)}", file=sys.stderr)
    has_error = True

extra_in_csv = [i for i in csv_ids if i not in srs_ids]
if extra_in_csv:
    print(f"FAIL: IDs present in CSV but not found in SRS: {', '.join(extra_in_csv)}", file=sys.stderr)
    has_error = True

expected_counts = {'FR': 77, 'NFR': 15, 'BR': 18, 'AT': 15, 'UC': 4}
for item_type, expected in expected_counts.items():
    if counts[item_type] != expected:
        print(f"FAIL: Count mismatch for {item_type}: got {counts[item_type]}, expected {expected}", file=sys.stderr)
        has_error = True

if has_error:
    print("\nResult: VALIDATION FAILED", file=sys.stderr)
    sys.exit(1)
else:
    print("\nResult: VALIDATION SUCCESSFUL - All 129 requirement IDs match exactly 1:1")

