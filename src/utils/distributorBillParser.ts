export interface DistributorBillItem {
  medicineName: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  batchNumber: string;
  expiryDate: string;
}

export interface BillTextSegment {
  text: string;
  x: number;
}

export interface BillTextLine {
  segments: BillTextSegment[];
}

type BillColumn = 'medicineName' | 'quantity' | 'purchasePrice' | 'sellingPrice' | 'batchNumber' | 'expiryDate' | 'amount';

const HEADER_PATTERNS: Array<{ key: BillColumn; pattern: RegExp }> = [
  { key: 'medicineName', pattern: /\b(item|product|medicine|drug|description|particulars|name)\b/i },
  { key: 'batchNumber', pattern: /\b(batch|lot)\b/i },
  { key: 'expiryDate', pattern: /\b(expiry|expires|exp\.?|use before)\b/i },
  { key: 'quantity', pattern: /\b(quantity|qty|units|packs|pcs)\b/i },
  { key: 'sellingPrice', pattern: /\b(mrp|retail price|selling price)\b/i },
  { key: 'purchasePrice', pattern: /\b(rate|ptr|pts|purchase price|unit price|cost|price)\b/i },
  { key: 'amount', pattern: /\b(amount|total|value|net amount)\b/i },
];

const DATE_PATTERN = /\b(?:0?[1-9]|1[0-2])[\/.-](?:\d{2}|\d{4})\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/;
const NUMBER_PATTERN = /(?:₹|Rs\.?|INR)?\s*-?\d[\d,]*(?:\.\d{1,4})?/gi;

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

export const cleanMedicineName = (rawName: string): string => {
  if (!rawName) return '';
  return rawName
    .replace(/^\s*\d+[.)-]\s*/, '') // Remove leading list numbers e.g. "1. ", "01- "
    .replace(/\b(?:HSN|SAC)\s*[:#-]?\s*\d+\b/gi, '') // Remove HSN / SAC codes
    .replace(/\b(?:GST|CGST|SGST|IGST)\s*[:#-]?\s*\d+%?\b/gi, '') // Remove GST mentions
    .replace(/\b(?:BATCH|LOT|B\.?\s*NO)\s*[:#-]?\s*[A-Z0-9-]+\b/gi, '') // Remove Batch tags if caught in name
    .replace(/\b(?:EXP|EXPIRY)\s*[:#-]?\s*[0-9/.-]+\b/gi, '') // Remove Exp tags if caught in name
    .replace(/\b(?:MRP|RATE|PTR|PTS)\s*[:#-]?\s*[\d.]+\b/gi, '') // Remove price labels
    .replace(/\b\d+\s*['xX*]\s*\d+\s*(?:TAB|CAP|S|ML|VIAL)?\b/gi, '') // Remove pack sizes
    .replace(/[,;:\\/|-]+$/, '') // Remove trailing punctuation
    .replace(/\s+/g, ' ')
    .trim();
};

const numericValue = (value: string) => {
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
};

const moneyFromText = (value: string) => {
  const values = value.match(NUMBER_PATTERN);
  return values?.length ? numericValue(values[0]) : undefined;
};

const expiryToDate = (value: string) => {
  const match = value.match(DATE_PATTERN);
  if (!match) return '';

  const parts = match[0].split(/[\/.-]/);
  if (parts.length === 2) {
    const month = Number(parts[0]);
    let year = Number(parts[1]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month < 1 || month > 12) return '';
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const [first, second, third] = parts.map(Number);
  const year = third < 100 ? third + (third >= 70 ? 1900 : 2000) : third;
  const month = second > 12 ? first : second;
  const day = second > 12 ? second : first;
  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
};

const getHeaderColumns = (line: BillTextLine) => {
  const columns = line.segments.flatMap((segment) => {
    const match = HEADER_PATTERNS.find(({ pattern }) => pattern.test(segment.text));
    return match ? [{ key: match.key, x: segment.x }] : [];
  });
  const unique = columns.filter((column, index) =>
    columns.findIndex((other) => other.key === column.key) === index
  );

  return unique.length >= 3 && unique.some(({ key }) => key === 'medicineName') ? unique.sort((a, b) => a.x - b.x) : [];
};

const columnValues = (line: BillTextLine, columns: Array<{ key: BillColumn; x: number }>) => {
  const values: Partial<Record<BillColumn, string>> = {};
  const boundaries = columns.map((column, index) => ({
    ...column,
    minX: index === 0 ? -Infinity : (columns[index - 1].x + column.x) / 2,
    maxX: index === columns.length - 1 ? Infinity : (column.x + columns[index + 1].x) / 2,
  }));

  line.segments.forEach((segment) => {
    const column = boundaries.find(({ minX, maxX }) => segment.x >= minX && segment.x < maxX);
    if (column) {
      values[column.key] = normalizeText(`${values[column.key] || ''} ${segment.text}`);
    }
  });
  return values;
};

const parseColumnRow = (values: Partial<Record<BillColumn, string>>): DistributorBillItem | null => {
  const medicineName = cleanMedicineName(values.medicineName || '');
  if (!medicineName || /^(sub)?total|grand total|tax|invoice|page\s+\d/i.test(medicineName)) return null;

  const quantity = numericValue(values.quantity || '');
  const amount = moneyFromText(values.amount || '');
  const purchasePrice = moneyFromText(values.purchasePrice || '') ?? (quantity && amount ? amount / quantity : undefined);
  if (!quantity || quantity <= 0 || !purchasePrice || purchasePrice <= 0) return null;

  const batchNumber = normalizeText(values.batchNumber || '').replace(/^(batch|lot)\s*(no\.?)?\s*:?\s*/i, '');
  const expiryDate = expiryToDate(values.expiryDate || '');
  const sellingPrice = moneyFromText(values.sellingPrice || '');

  return {
    medicineName,
    quantity,
    purchasePrice: Number(purchasePrice.toFixed(4)),
    sellingPrice,
    batchNumber,
    expiryDate,
  };
};

const parseKeyValueRow = (line: string): DistributorBillItem | null => {
  const labels: Array<{ key: BillColumn; regex: RegExp }> = [
    { key: 'quantity', regex: /\b(?:qty|quantity|units|packs)\s*[:#-]?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'purchasePrice', regex: /\b(?:unit price|purchase price|rate|ptr|pts|cost|price)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'sellingPrice', regex: /\b(?:mrp|retail price)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'amount', regex: /\b(?:amount|total|value)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'batchNumber', regex: /\b(?:batch|lot)\s*(?:no\.?)?\s*[:#-]?\s*([a-z0-9/-]+)/i },
    { key: 'expiryDate', regex: /\b(?:expiry|expires|exp\.?|use before)\s*[:#-]?\s*([0-9./-]+)/i },
  ];

  const matches = new Map<BillColumn, string>();
  let firstFieldIndex = line.length;
  labels.forEach(({ key, regex }) => {
    const match = regex.exec(line);
    if (match) {
      matches.set(key, match[1]);
      firstFieldIndex = Math.min(firstFieldIndex, match.index);
    }
  });
  if (matches.size < 2) return null;

  const medicineName = cleanMedicineName(line.slice(0, firstFieldIndex));
  const quantity = numericValue(matches.get('quantity') || '');
  const amount = numericValue(matches.get('amount') || '');
  const purchasePrice = numericValue(matches.get('purchasePrice') || '') ?? (quantity && amount ? amount / quantity : undefined);
  if (!medicineName || !quantity || quantity <= 0 || !purchasePrice || purchasePrice <= 0) return null;

  return {
    medicineName,
    quantity,
    purchasePrice: Number(purchasePrice.toFixed(4)),
    sellingPrice: numericValue(matches.get('sellingPrice') || ''),
    batchNumber: normalizeText(matches.get('batchNumber') || ''),
    expiryDate: expiryToDate(matches.get('expiryDate') || ''),
  };
};

const parseUnlabelledRow = (line: string): DistributorBillItem | null => {
  const cleanedLine = line.replace(/^\s*\d+[.)-]\s*/, '');
  const dateMatch = cleanedLine.match(DATE_PATTERN);
  const dateIndex = dateMatch?.index ?? -1;
  const beforeDate = dateIndex >= 0 ? cleanedLine.slice(0, dateIndex) : cleanedLine;
  const tokens = [...beforeDate.matchAll(NUMBER_PATTERN)];
  if (tokens.length < 2) return null;

  const medicineName = cleanMedicineName(beforeDate.slice(0, tokens[0].index));
  if (!medicineName || medicineName.length < 2) return null;
  const numbers = tokens.map((token) => numericValue(token[0])).filter((value): value is number => value !== undefined);
  const batchMatch = cleanedLine.match(/\b(?:batch|lot)\s*(?:no\.?)?\s*[:#-]?\s*([a-z0-9/-]+)/i);
  const quantity = numbers.find((number) => Number.isInteger(number) && number > 0 && number <= 100000);
  if (!quantity) return null;

  const prices = numbers.filter((number) => number > 0 && number !== quantity && number <= 10000000);
  if (!prices.length) return null;
  const amount = prices[prices.length - 1];
  const purchasePrice = prices.length > 1 && amount > quantity ? (prices[0] < amount ? prices[0] : amount / quantity) : amount;

  return {
    medicineName,
    quantity,
    purchasePrice: Number(purchasePrice.toFixed(4)),
    batchNumber: batchMatch?.[1] || '',
    expiryDate: dateMatch ? expiryToDate(dateMatch[0]) : '',
  };
};

export const parseDistributorBillLines = (lines: BillTextLine[]): DistributorBillItem[] => {
  const rows: DistributorBillItem[] = [];
  let columns: Array<{ key: BillColumn; x: number }> = [];
  let lastItem: DistributorBillItem | undefined;

  lines.forEach((line) => {
    const header = getHeaderColumns(line);
    if (header.length) {
      columns = header;
      return;
    }

    const text = normalizeText(line.segments.map((segment) => segment.text).join(' '));
    if (!text) return;

    const parsed = parseKeyValueRow(text) ||
      (columns.length ? parseColumnRow(columnValues(line, columns)) : parseUnlabelledRow(text));
    if (parsed) {
      rows.push(parsed);
      lastItem = parsed;
      return;
    }

    if (lastItem) {
      const batch = text.match(/\b(?:batch|lot)\s*(?:no\.?)?\s*[:#-]?\s*([a-z0-9/-]+)/i);
      const expiry = text.match(/\b(?:expiry|expires|exp\.?|use before)\s*[:#-]?\s*([0-9./-]+)/i);
      const mrp = text.match(/\b(?:mrp|retail price)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
      if (batch) lastItem.batchNumber = batch[1];
      if (expiry) lastItem.expiryDate = expiryToDate(expiry[1]) || lastItem.expiryDate;
      if (mrp) lastItem.sellingPrice = numericValue(mrp[1]) || lastItem.sellingPrice;
    }
  });

  return rows;
};
