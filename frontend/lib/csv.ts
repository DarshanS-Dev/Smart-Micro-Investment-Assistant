export interface ParsedCsvRow {
  date: string;
  merchant: string;
  amount: number;
}

export interface ParsedCsv {
  rows: ParsedCsvRow[];
  errors: string[];
}

/**
 * Minimal CSV parser for the expected `date, merchant, amount` shape.
 * Runs client-side purely to power the preview table + the "non-empty,
 * looks like a CSV" pre-flight check before we hit the network — the
 * backend remains the source of truth for ingestion and round-up math.
 */
export function parseTransactionsCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ["The file is empty."] };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf("date");
  const merchantIdx = header.indexOf("merchant");
  const amountIdx = header.indexOf("amount");

  const hasHeader = dateIdx !== -1 && merchantIdx !== -1 && amountIdx !== -1;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const [dIdx, mIdx, aIdx] = hasHeader ? [dateIdx, merchantIdx, amountIdx] : [0, 1, 2];

  const rows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  dataLines.forEach((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const rowNum = hasHeader ? i + 2 : i + 1;

    if (cols.length < 3) {
      errors.push(`Row ${rowNum}: expected 3 columns, found ${cols.length}.`);
      return;
    }

    const date = cols[dIdx];
    const merchant = cols[mIdx];
    const amount = Number.parseFloat(cols[aIdx]);

    if (!date || Number.isNaN(Date.parse(date))) {
      errors.push(`Row ${rowNum}: invalid date "${date}".`);
      return;
    }
    if (!merchant) {
      errors.push(`Row ${rowNum}: missing merchant.`);
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      errors.push(`Row ${rowNum}: invalid amount "${cols[aIdx]}".`);
      return;
    }

    rows.push({ date, merchant, amount });
  });

  return { rows, errors };
}

/** Mirrors backend roundup.compute_roundup — round up to nearest unit. */
export function computeRoundupPreview(amount: number, unit = 10): number {
  const next = Math.ceil(amount / unit) * unit;
  return Math.round((next - amount) * 100) / 100;
}
