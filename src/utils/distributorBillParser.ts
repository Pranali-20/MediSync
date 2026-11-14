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
  { key: 'medicineName', pattern: /\b(item|product|medicine|drug|description|particulars|name|prd\.?\s*name|item\s*desc)\b/i },
  { key: 'batchNumber', pattern: /\b(batch|lot|b\.?\s*no\.?|batch\s*no\.?|lot\s*no\.?)\b/i },
  { key: 'expiryDate', pattern: /\b(expiry|expires|exp\.?|use\s*before|exp\.?\s*dt|validity|exp\s*date)\b/i },
  { key: 'quantity', pattern: /\b(quantity|qty|units|packs|pcs|billed\s*qty|net\s*qty|total\s*qty|strips|nos)\b/i },
  { key: 'sellingPrice', pattern: /\b(mrp|m\.r\.p\.?|retail\s*price|max\s*retail\s*price)\b/i },
  { key: 'purchasePrice', pattern: /\b(rate|ptr|p\.t\.r\.?|pts|p\.t\.s\.?|unit\s*price|unit\s*rate|cost|basic\s*rate|price)\b/i },
  { key: 'amount', pattern: /\b(amount|net\s*amount|total\s*amount|taxable\s*value|value|net\s*val)\b/i },
];

const NUMBER_PATTERN = /(?:₹|Rs\.?|INR)?\s*-?\d[\d,]*(?:\.\d{1,4})?/gi;

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

// Strip non-medicine prefixes, codes, pack sizes, taxes from medicine name
export const cleanMedicineName = (rawName: string): string => {
  if (!rawName) return '';
  let name = String(rawName).trim();
  // Strip leading list numbering e.g. "1. ", "01 - ", "#3 ", "1) "
  name = name.replace(/^#?\d+[\.\-\)\s]+\s*/, '');
  // Strip HSN or SAC codes e.g. "HSN: 300490", "HSN 3004", "SAC 3004"
  name = name.replace(/\b(?:HSN|SAC)[:\s#-]*\d+\b/gi, '');
  // Strip tax or rate tags e.g. "@12%", "GST 12%", "12% GST", "CGST", "SGST", "IGST"
  name = name.replace(/\b(?:GST|CGST|SGST|IGST)\s*[:#-]?\s*\d*%?\b/gi, '');
  name = name.replace(/@\s*\d+%/g, '');
  // Strip embedded batch or exp tags e.g. "B.No: ...", "Batch ...", "Exp: ..."
  name = name.replace(/\b(?:BATCH|LOT|B\.?\s*NO|EXP|EXPIRY|MFG)[:\s#-]*[A-Z0-9/.-]+\b/gi, '');
  // Strip price tags if caught in name
  name = name.replace(/\b(?:MRP|RATE|PTR|PTS|COST)[:\s#-]*[\d.]+\b/gi, '');
  // Strip pack indicators: "10x10", "1x10's", "10TAB", "10'S", "10 CAP", "100ML", "10T", "15T", "10S"
  name = name.replace(/\b\d+\s*['xX*]\s*\d+\s*(?:TAB|CAP|S|ML|VIAL|STRIP)?\b/gi, '');
  name = name.replace(/\b\d+\s*['’]?[sS]\b/g, '');
  name = name.replace(/\b\d+\s*[tT]\b/g, ''); // e.g. 15T, 10T pack sizes
  // Remove punctuation at start or end
  name = name.replace(/^[,;:\\/|#\-_.\s]+/, '').replace(/[,;:\\/|#\-_.\s]+$/, '');
  // Collapse whitespace
  name = name.replace(/\s{2,}/g, ' ').trim();
  return name;
};

// Parse date strings in MM/YY, MM/YYYY, DD/MM/YYYY, or Month-Year (NOV/26) formats
export const expiryToDate = (value: string): string => {
  if (!value) return '';
  const text = value.trim();

  // 1. Month name formats: NOV/26, NOV-26, NOV 2026, 15-NOV-2026, etc.
  const monthNames: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const namedMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s/.-]*(\d{2,4})\b/i);
  if (namedMatch) {
    const mStr = namedMatch[1].toLowerCase();
    if (monthNames[mStr]) {
      const month = monthNames[mStr];
      let year = Number(namedMatch[2]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
      const lastDay = new Date(year, month, 0).getDate();
      return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 2. Standard numeric formats: MM/YY, MM/YYYY, DD/MM/YYYY, YYYY-MM-DD
  const dateMatch = text.match(/\b(?:\d{4}[/.-]\d{1,2}[/.-]\d{1,2})|\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})|\b(?:\d{1,2}[/.-]\d{2,4})\b/);
  if (!dateMatch) return '';

  const matched = dateMatch[0];
  const parts = matched.split(/[/.-]/).map((p) => p.trim());

  // Format: YYYY-MM-DD
  if (parts.length === 3 && parts[0].length === 4) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Format: MM/YY or MM/YYYY
  if (parts.length === 2) {
    let month = Number(parts[0]);
    let year = Number(parts[1]);
    if (month > 12 && year <= 12) {
      const temp = month;
      month = year;
      year = temp;
    }
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(year, month, 0).getDate();
      return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // Format: DD/MM/YYYY or DD/MM/YY
  if (parts.length === 3) {
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    let third = Number(parts[2]);
    if (third < 100) third += third >= 70 ? 1900 : 2000;
    const year = third;
    const month = second > 12 ? first : second;
    const day = second > 12 ? second : first;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
};

const numericValue = (value: string): number | undefined => {
  if (!value) return undefined;
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
};

const moneyFromText = (value: string): number | undefined => {
  if (!value) return undefined;
  const values = value.match(NUMBER_PATTERN);
  return values?.length ? numericValue(values[0]) : undefined;
};

// Check if a line is distributor metadata, invoice headers, addresses, taxes, or footers
export const isNonMedicineRow = (lineText: string): boolean => {
  if (!lineText || !lineText.trim()) return true;
  const t = lineText.toUpperCase();

  // 1. Invoice Type Markers
  if (/\b(TAX INVOICE|ORIGINAL FOR RECIPIENT|DUPLICATE FOR TRANSPORTER|BILL OF SUPPLY|RETAIL INVOICE|CASH MEMO|CREDIT MEMO|DELIVERY CHALLAN|ESTIMATE|QUOTATION)\b/.test(t)) {
    return true;
  }

  // 2. Distributor & Regulatory Keywords
  if (/\b(DISTRIBUTORS?|PHARMA(?:CEUTICALS?)?|AGENCIES|ENTERPRISES|HEALTHCARE|SURGICALS?|DRUG HOUSE|WHOLESALER|STOCKIST|C&F|PVT\.?\s*LTD|LIMITED|LLP)\b/.test(t) &&
      !/\b(TAB|CAP|SYRUP|INJ|OINT|GEL|DROPS|SUSP|MG|ML|GM)\b/.test(t)) {
    return true;
  }

  // 3. Identification & License Numbers
  if (/\b(GSTIN|GST NO|GST\/UIN|D\.?L\.?\s*NO|DRUG LIC|20B|21B|FSSAI|PAN NO|CIN NO|STATE CODE|PAN:)\b/.test(t)) {
    return true;
  }

  // 4. Contact & Address lines
  if (/\b(PHONE|TEL:|MOBILE|MOB:|EMAIL|WEBSITE|PIN CODE|ROAD|NAGAR|STREET|OPP\.|NEAR|PLOT NO|POST BOX)\b/.test(t) &&
      !/\b(TAB|CAP|MG|ML|INJ)\b/.test(t)) {
    return true;
  }

  // 5. Invoice Metadata lines
  if (/\b(INVOICE NO|INV NO|BILL NO|INVOICE DATE|INV DATE|DUE DATE|CHALLAN NO|L\.?R\.?\s*NO|VEHICLE NO|P\.?O\.?\s*NO|ORDER NO)\b/.test(t)) {
    return true;
  }

  // 6. Consignee / Buyer lines
  if (/\b(BILLED TO|SHIP TO|BUYER'?S? NAME|CUSTOMER NAME|PARTY NAME|CONSIGNEE|NAME & ADDRESS|PATIENT NAME)\b/.test(t)) {
    return true;
  }

  // 7. Table Header row (only if line has header keywords and does NOT contain actual medicine data / pricing)
  const hasValueIndicators = /\b(TAB|CAP|SYRUP|INJ|OINT|GEL|DROPS|SUSP|MG|ML|GM|VIAL|TABLET|CAPSULE)\b/i.test(t) ||
    /\b(QTY|RATE|MRP|PRICE|EXP|BATCH)[:\s#-]*\d+/i.test(lineText);
  if (!hasValueIndicators) {
    if ((/\b(ITEM|PRODUCT|DESCRIPTION|PARTICULARS)\b/.test(t) && /\b(QTY|RATE|PRICE|AMOUNT|BATCH)\b/.test(t)) ||
        (/\b(BATCH|B\.NO|LOT)\b/.test(t) && /\b(EXP|EXPIRY)\b/.test(t) && /\b(QTY|RATE|PRICE|MRP)\b/.test(t))) {
      return true;
    }
  }

  // 8. Totals, Taxes, Bank & Footer lines
  if (/\b(SUB TOTAL|SUBTOTAL|TOTAL ITEMS|TOTAL QTY|TOTAL PACKS|TAXABLE VALUE|TAXABLE AMOUNT|CGST|SGST|IGST|TOTAL GST|ROUND OFF|ROUNDING|GRAND TOTAL|NET PAYABLE|NET AMOUNT|TOTAL AMOUNT)\b/.test(t) &&
      !/\b(TAB|CAP|SYRUP|MG|ML|INJ)\b/.test(t)) {
    return true;
  }

  if (/\b(RUPEES IN WORDS|AMOUNT IN WORDS|FOR M\/S|AUTHORISED SIGNATORY|AUTHORIZED SIGNATORY|CHECKED BY|PREPARED BY|TERMS & CONDITIONS|GOODS ONCE SOLD|SUBJECT TO JURISDICTION)\b/.test(t)) {
    return true;
  }

  // Bank & payment transfer details
  if (/\b(BANK\b|BANK\s*:|A\/C\s*:|A\/C\s*NO|ACCOUNT\s*:|ACCOUNT\s*NO|IFSC\b|RTGS\b|NEFT\b|BRANCH\s*:|UPI\s*:|SWIFT\b)/.test(t)) {
    return true;
  }

  // Distributor signoff
  if (/\b(SIGNATURE|SIGNATORY|FOR\s+[A-Z\s]+(?:DISTRIBUTORS?|PHARMA|AGENCIES|ENTERPRISES|LTD|PVT))\b/.test(t)) {
    return true;
  }

  // 9. Line without any letters
  if (!/[a-zA-Z]/.test(t)) {
    return true;
  }

  return false;
};

// Header column detection for column-aligned invoices
const getHeaderColumns = (line: BillTextLine): Array<{ key: BillColumn; x: number }> => {
  const columns = line.segments.flatMap((segment) => {
    const match = HEADER_PATTERNS.find(({ pattern }) => pattern.test(segment.text));
    return match ? [{ key: match.key, x: segment.x }] : [];
  });
  const unique = columns.filter((column, index) =>
    columns.findIndex((other) => other.key === column.key) === index
  );

  return unique.length >= 2 && unique.some(({ key }) => key === 'medicineName' || key === 'quantity')
    ? unique.sort((a, b) => a.x - b.x)
    : [];
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
  const rawMed = values.medicineName || '';
  if (isNonMedicineRow(rawMed)) return null;

  const medicineName = cleanMedicineName(rawMed);
  if (!medicineName || medicineName.length < 2) return null;

  const quantity = numericValue(values.quantity || '');
  const amount = moneyFromText(values.amount || '');
  const rawPurchase = moneyFromText(values.purchasePrice || '');
  const purchasePrice = rawPurchase ?? (quantity && amount && quantity > 0 ? amount / quantity : undefined);
  if (!quantity || quantity <= 0 || !purchasePrice || purchasePrice <= 0) return null;

  const batchNumber = normalizeText(values.batchNumber || '').replace(/^(batch|lot|b\.?\s*no\.?)\s*:?\s*/i, '');
  const expiryDate = expiryToDate(values.expiryDate || '');
  const sellingPrice = moneyFromText(values.sellingPrice || '');

  return {
    medicineName,
    quantity,
    purchasePrice: Number(purchasePrice.toFixed(4)),
    sellingPrice: sellingPrice && sellingPrice > 0 ? Number(sellingPrice.toFixed(2)) : undefined,
    batchNumber,
    expiryDate,
  };
};

const parseKeyValueRow = (line: string): DistributorBillItem | null => {
  if (isNonMedicineRow(line)) return null;

  const labels: Array<{ key: BillColumn; regex: RegExp }> = [
    { key: 'quantity', regex: /\b(?:qty|quantity|units|packs|pcs)\s*[:#-]?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'purchasePrice', regex: /\b(?:unit\s*price|purchase\s*price|rate|ptr|p\.t\.r|pts|cost|basic|price)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'sellingPrice', regex: /\b(?:mrp|m\.r\.p|retail\s*price)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'amount', regex: /\b(?:amount|total|value|net)\s*[:#-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i },
    { key: 'batchNumber', regex: /\b(?:batch|lot|b\.?\s*no\.?)\s*[:#-]?\s*([a-z0-9/-]+)/i },
    { key: 'expiryDate', regex: /\b(?:expiry|expires|exp\.?|use\s*before|validity)\s*[:#-]?\s*([0-9./a-z-]+)/i },
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

  const rawMed = line.slice(0, firstFieldIndex);
  const medicineName = cleanMedicineName(rawMed);
  if (!medicineName || medicineName.length < 2) return null;

  const quantity = numericValue(matches.get('quantity') || '');
  const amount = numericValue(matches.get('amount') || '');
  const rawPrice = numericValue(matches.get('purchasePrice') || '');
  const purchasePrice = rawPrice ?? (quantity && amount && quantity > 0 ? amount / quantity : undefined);
  if (!quantity || quantity <= 0 || !purchasePrice || purchasePrice <= 0) return null;

  const sellingPrice = numericValue(matches.get('sellingPrice') || '');

  return {
    medicineName,
    quantity,
    purchasePrice: Number(purchasePrice.toFixed(4)),
    sellingPrice: sellingPrice && sellingPrice > 0 ? Number(sellingPrice.toFixed(2)) : undefined,
    batchNumber: normalizeText(matches.get('batchNumber') || ''),
    expiryDate: expiryToDate(matches.get('expiryDate') || ''),
  };
};

// Universal tabular line parser: handles space/tab separated rows regardless of column order
const parseTabularLine = (line: string): DistributorBillItem | null => {
  if (isNonMedicineRow(line)) return null;

  // 1. Look for explicit batch tags like "B.No: AG3401" or "Batch AG3401"
  let batchNumber = '';
  const explicitBatchMatch = line.match(/\b(?:batch|lot|b\.?\s*no\.?)\s*[:#-]?\s*([a-z0-9/-]+)/i);
  if (explicitBatchMatch) {
    batchNumber = explicitBatchMatch[1];
  }

  // 2. Look for expiry date anywhere in the line
  let expiryDate = '';
  let dateRawStr = '';
  const dateMatch = line.match(/\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s/.-]*\d{2,4})|(?:\d{4}[/.-]\d{1,2}[/.-]\d{1,2})|(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})|(?:\d{1,2}[/.-]\d{2,4})\b/i);
  if (dateMatch) {
    dateRawStr = dateMatch[0];
    expiryDate = expiryToDate(dateRawStr);
  }

  // 3. Find where metadata (HSN, Batch, Date, or trailing numbers) begins in the line
  let metadataStartIndex = -1;
  const hsnMatch = line.match(/\b(?:HSN\s*[:#-]?\s*)?(\d{6,8})\b/i);

  if (explicitBatchMatch && explicitBatchMatch.index !== undefined) {
    metadataStartIndex = explicitBatchMatch.index;
  } else if (hsnMatch && hsnMatch.index !== undefined && (!dateMatch || hsnMatch.index < (dateMatch.index ?? 999))) {
    metadataStartIndex = hsnMatch.index;
  } else if (dateMatch && dateMatch.index !== undefined) {
    // If there is an alphanumeric batch code before date e.g. "AG3401 11/26"
    const textBeforeDate = line.slice(0, dateMatch.index).trim();
    const tokensBeforeDate = textBeforeDate.split(/\s+/);
    const lastTokenBeforeDate = tokensBeforeDate[tokensBeforeDate.length - 1];
    if (tokensBeforeDate.length > 1 && /(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*[0-9])[A-Z0-9-]{3,12}/i.test(lastTokenBeforeDate)) {
      if (!batchNumber) batchNumber = lastTokenBeforeDate.toUpperCase();
      metadataStartIndex = textBeforeDate.lastIndexOf(lastTokenBeforeDate);
    } else {
      metadataStartIndex = dateMatch.index;
    }
  }

  let rawMedicineText = '';
  let afterMedicineText = '';

  if (metadataStartIndex > 0) {
    rawMedicineText = line.slice(0, metadataStartIndex);
    afterMedicineText = line.slice(metadataStartIndex);
  } else {
    // If no date or batch token was detected, separate trailing numbers
    const tokens = line.trim().split(/\s+/);
    let numCountFromEnd = 0;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const cleanTok = tokens[i].replace(/[₹,]/g, '');
      if (/^-?\d+(?:\.\d+)?$/.test(cleanTok)) {
        numCountFromEnd++;
      } else {
        break;
      }
    }
    const splitIdx = Math.max(1, tokens.length - Math.min(numCountFromEnd, 4));
    rawMedicineText = tokens.slice(0, splitIdx).join(' ');
    afterMedicineText = tokens.slice(splitIdx).join(' ');
  }

  const medicineName = cleanMedicineName(rawMedicineText);
  if (!medicineName || medicineName.length < 2 || !/[a-zA-Z]/.test(medicineName)) {
    return null;
  }

  // 4. Extract batch from afterMedicineText if still not found
  if (!batchNumber) {
    const batchSearch = afterMedicineText.match(/\b(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*[0-9])[A-Z0-9-]{3,12}\b/i);
    if (batchSearch) {
      batchNumber = batchSearch[0].toUpperCase();
    }
  }

  // 5. Extract all numeric quantities and rates
  let numbersText = afterMedicineText;
  if (batchNumber) numbersText = numbersText.replace(batchNumber, ' ');
  if (dateRawStr) numbersText = numbersText.replace(dateRawStr, ' ');

  const numberMatches = [...numbersText.matchAll(/(?:₹|Rs\.?|INR)?\s*-?\d[\d,]*(?:\.\d{1,4})?/gi)];
  if (numberMatches.length === 0) return null;

  const rawNumbers = numberMatches
    .map((m) => numericValue(m[0]))
    .filter((n): n is number => n !== undefined && !Number.isNaN(n) && n > 0);

  if (rawNumbers.length === 0) return null;

  // Filter out 6-8 digit HSN codes from pricing numbers
  const filteredNumbers = rawNumbers.filter((n) => !(n >= 100000 && n <= 99999999 && Number.isInteger(n)));
  const numbers = filteredNumbers.length > 0 ? filteredNumbers : rawNumbers;

  // 6. Resolve quantity, purchase price, MRP
  let quantity = 0;
  let purchasePrice = 0;
  let sellingPrice: number | undefined;

  if (numbers.length === 1) {
    quantity = numbers[0];
    purchasePrice = 10;
  } else if (numbers.length === 2) {
    const [n1, n2] = numbers;
    if (Number.isInteger(n1) && n1 > 0 && n1 <= 10000) {
      quantity = n1;
      purchasePrice = n2;
    } else if (Number.isInteger(n2) && n2 > 0 && n2 <= 10000) {
      quantity = n2;
      purchasePrice = n1;
    } else {
      quantity = Math.round(n1);
      purchasePrice = n2;
    }
  } else {
    const integerCandidates = numbers.filter((n) => Number.isInteger(n) && n > 0 && n <= 10000);
    if (integerCandidates.length > 0) {
      quantity = integerCandidates[0];
    } else {
      quantity = Math.round(numbers[0]);
    }

    const remaining = numbers.filter((n, idx) => idx !== numbers.indexOf(quantity));
    if (remaining.length >= 2) {
      const sorted = [...remaining].sort((a, b) => a - b);
      purchasePrice = sorted[0];
      sellingPrice = sorted[1];
    } else if (remaining.length === 1) {
      purchasePrice = remaining[0];
    }
  }

  if (quantity <= 0 || purchasePrice <= 0) return null;

  return {
    medicineName,
    quantity,
    purchasePrice: Number(purchasePrice.toFixed(4)),
    sellingPrice: sellingPrice && sellingPrice > 0 ? Number(sellingPrice.toFixed(2)) : undefined,
    batchNumber,
    expiryDate,
  };
};

export const parseDistributorBillLines = (lines: BillTextLine[]): DistributorBillItem[] => {
  const rows: DistributorBillItem[] = [];
  let columns: Array<{ key: BillColumn; x: number }> = [];
  let pendingMedicineName = '';

  lines.forEach((line) => {
    // Check if line establishes table column headers
    const header = getHeaderColumns(line);
    if (header.length >= 2) {
      columns = header;
      return;
    }

    const fullLineText = normalizeText(line.segments.map((s) => s.text).join(' '));
    if (!fullLineText) return;

    // Filter out obvious non-medicine headers / footers
    if (isNonMedicineRow(fullLineText)) {
      pendingMedicineName = '';
      return;
    }

    // Try multi-strategy parsing:
    // 1. Key-value labeled row
    let item = parseKeyValueRow(fullLineText);

    // 2. Structured column-aligned row
    if (!item && columns.length >= 2) {
      item = parseColumnRow(columnValues(line, columns));
    }

    // 3. Tabular row with freeform positions
    if (!item) {
      item = parseTabularLine(fullLineText);
    }

    // 4. Handle 2-line distributor items (Line 1: Item Name, Line 2: Batch, Exp, Qty, Rate)
    if (!item && pendingMedicineName) {
      const combinedLine = `${pendingMedicineName} ${fullLineText}`;
      item = parseTabularLine(combinedLine);
      if (item) {
        pendingMedicineName = '';
      }
    }

    if (item) {
      item.batchNumber = item.batchNumber ? normalizeText(item.batchNumber) : '';
      item.expiryDate = item.expiryDate ? item.expiryDate : '';
      rows.push(item);
      pendingMedicineName = '';
      return;
    }

    // If line has letters but no numbers, it might be the medicine name for the next line
    if (/[a-zA-Z]{3,}/.test(fullLineText) && !NUMBER_PATTERN.test(fullLineText)) {
      pendingMedicineName = cleanMedicineName(fullLineText);
    } else {
      pendingMedicineName = '';
    }
  });

  return rows;
};
