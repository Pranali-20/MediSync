// Runtime validation coverage for distributor invoice extraction.
import { describe, expect, it } from 'vitest';
import { parseDistributorBillLines } from './distributorBillParser';

describe('parseDistributorBillLines', () => {
  it('maps differently positioned invoice columns and retains batch and expiry values', () => {
    const lines = [
      { segments: [
        { text: 'Product Description', x: 10 },
        { text: 'Batch No', x: 220 },
        { text: 'Expiry Date', x: 300 },
        { text: 'Qty', x: 370 },
        { text: 'Rate', x: 420 },
        { text: 'Amount', x: 490 },
      ] },
      { segments: [
        { text: 'Amoxicillin 500 mg', x: 10 },
        { text: 'AB123', x: 220 },
        { text: '12/2028', x: 300 },
        { text: '10', x: 370 },
        { text: '25.00', x: 420 },
        { text: '250.00', x: 490 },
      ] },
    ];

    expect(parseDistributorBillLines(lines)).toEqual([{
      medicineName: 'Amoxicillin 500 mg',
      quantity: 10,
      purchasePrice: 25,
      batchNumber: 'AB123',
      expiryDate: '2028-12-31',
    }]);
  });

  it('recognizes labeled fields when a bill uses a key-value row instead of a table', () => {
    const lines = [{
      segments: [{
        text: 'Paracetamol 500 mg Qty: 20 Rate: 4.50 MRP: 6.00 Batch: P123 Expiry: 08/2028',
        x: 0,
      }],
    }];

    expect(parseDistributorBillLines(lines)).toEqual([{
      medicineName: 'Paracetamol 500 mg',
      quantity: 20,
      purchasePrice: 4.5,
      sellingPrice: 6,
      batchNumber: 'P123',
      expiryDate: '2028-08-31',
    }]);
  });

  it('derives unit cost from line amount and quantity without inventing batch or expiry data', () => {
    const lines = [
      { segments: [{ text: 'Medicine', x: 0 }, { text: 'Qty', x: 250 }, { text: 'Total Amount', x: 330 }] },
      { segments: [{ text: 'Cetirizine', x: 0 }, { text: '5', x: 250 }, { text: '100.00', x: 330 }] },
    ];

    expect(parseDistributorBillLines(lines)).toEqual([{
      medicineName: 'Cetirizine',
      quantity: 5,
      purchasePrice: 20,
      batchNumber: '',
      expiryDate: '',
    }]);
  });

  it('filters out distributor headers, addresses, GSTIN, and footer totals, accepting only genuine medicines', () => {
    const lines = [
      { segments: [{ text: 'SHREE PHARMA DISTRIBUTORS - TAX INVOICE', x: 0 }] },
      { segments: [{ text: 'Plot 45, Industrial Area, GSTIN: 27AAAAA0000A1Z5, DL No: 20B/1234', x: 0 }] },
      { segments: [{ text: 'Billed to: MediSync Pharmacy, Date: 12/11/2026, Inv No: INV-9901', x: 0 }] },
      { segments: [{ text: 'Item Description  HSN  Batch  Exp  Qty  Rate  MRP  Amount', x: 0 }] },
      { segments: [{ text: '1. Augmentin 625 Duo  300490  AG3401  11/26  10  145.00  185.00  1450.00', x: 0 }] },
      { segments: [{ text: '2. Dolo 650mg Tab  300490  DL9021  08/27  30  24.50  32.00  735.00', x: 0 }] },
      { segments: [{ text: 'Sub Total: 2185.00  CGST: 131.10  SGST: 131.10  Grand Total: 2447.20', x: 0 }] },
      { segments: [{ text: 'Bank: HDFC Bank, A/C: 1234567890, IFSC: HDFC0001234', x: 0 }] },
      { segments: [{ text: 'For Shree Pharma Distributors - Authorised Signatory', x: 0 }] },
    ];

    const parsed = parseDistributorBillLines(lines);
    expect(parsed.length).toBe(2);
    expect(parsed[0].medicineName).toBe('Augmentin 625 Duo');
    expect(parsed[0].quantity).toBe(10);
    expect(parsed[0].batchNumber).toBe('AG3401');
    expect(parsed[0].expiryDate).toBe('2026-11-30');

    expect(parsed[1].medicineName).toBe('Dolo 650mg Tab');
    expect(parsed[1].quantity).toBe(30);
    expect(parsed[1].batchNumber).toBe('DL9021');
    expect(parsed[1].expiryDate).toBe('2027-08-31');
  });

  it('accurately parses distributor invoices with pack sizes and month abbreviation expiries', () => {
    const lines = [
      { segments: [{ text: 'SUN PHARMA WHOLESALE DISTRIBUTORS', x: 0 }] },
      { segments: [{ text: 'GSTIN: 27AABCS1429B1Z8  DL NO: 20B/4590', x: 0 }] },
      { segments: [{ text: 'Item Desc  Pack  Batch  Exp  Qty  PTR  MRP  Amount', x: 0 }] },
      { segments: [{ text: 'PAN D CAP  10S  B23091  12/27  20  98.40  145.00  1968.00', x: 0 }] },
      { segments: [{ text: 'AZITHRAL 500  5T  AZ552  OCT-26  15  89.50  120.00  1342.50', x: 0 }] },
      { segments: [{ text: 'TELMA 40 TAB  15T  TL8821  MAY/28  50  122.00  165.00  6100.00', x: 0 }] },
      { segments: [{ text: 'Total Value: 9410.50  Round Off: -0.50  Net Payable: 9410.00', x: 0 }] },
    ];

    const items = parseDistributorBillLines(lines);
    expect(items.length).toBe(3);

    expect(items[0].medicineName).toBe('PAN D CAP');
    expect(items[0].quantity).toBe(20);
    expect(items[0].batchNumber).toBe('B23091');
    expect(items[0].expiryDate).toBe('2027-12-31');

    expect(items[1].medicineName).toBe('AZITHRAL 500');
    expect(items[1].quantity).toBe(15);
    expect(items[1].batchNumber).toBe('AZ552');
    expect(items[1].expiryDate).toBe('2026-10-31');

    expect(items[2].medicineName).toBe('TELMA 40 TAB');
    expect(items[2].quantity).toBe(50);
    expect(items[2].batchNumber).toBe('TL8821');
    expect(items[2].expiryDate).toBe('2028-05-31');
  });

  it('strips manufacturer prefixes and codes (like IPCA, DRL, JB-R, SANO) showing strictly clean product names', () => {
    const lines = [
      { segments: [{ text: 'Item Description  Batch  Exp  Qty  Rate  MRP', x: 0 }] },
      { segments: [{ text: 'IPCA Zerodol-SP Tablets  ZD2401  NOV/26  10  85.50  115.00', x: 0 }] },
      { segments: [{ text: '30049069 IPCA Zerodol-SP Tablets 10s  ZD2402  NOV/26  20  85.50  115.00', x: 0 }] },
      { segments: [{ text: '30049034 DRL- OMEZ D SR CAP  OM5120  12/27  15  110.00  155.00', x: 0 }] },
      { segments: [{ text: '30049022 JB-R METROGYL 400 TAB 20TAB  MT991  OCT-26  25  28.75  38.50', x: 0 }] },
      { segments: [{ text: '30041090 SANO SOFRAMYCIN SKIN CREA 30GM  SF881  AUG/28  10  53.50  72.00', x: 0 }] },
      { segments: [{ text: '30049039 MANK LECOPE-M TAB 15TAB  LM301  MAY/27  30  62.00  88.00', x: 0 }] },
    ];

    const items = parseDistributorBillLines(lines);
    expect(items.length).toBe(6);

    // IPCA Zerodol-SP Tablets -> Zerodol-SP Tablets
    expect(items[0].medicineName).toBe('Zerodol-SP Tablets');
    expect(items[0].manufacturer).toBe('IPCA Laboratories');
    expect(items[0].quantity).toBe(10);
    expect(items[0].batchNumber).toBe('ZD2401');

    // 30049069 IPCA Zerodol-SP Tablets 10s -> Zerodol-SP Tablets
    expect(items[1].medicineName).toBe('Zerodol-SP Tablets');
    expect(items[1].manufacturer).toBe('IPCA Laboratories');
    expect(items[1].quantity).toBe(20);

    // 30049034 DRL- OMEZ D SR CAP -> OMEZ D SR CAP
    expect(items[2].medicineName).toBe('OMEZ D SR CAP');
    expect(items[2].manufacturer).toBe("Dr. Reddy's Laboratories");

    // 30049022 JB-R METROGYL 400 TAB 20TAB -> METROGYL 400 TAB
    expect(items[3].medicineName).toBe('METROGYL 400 TAB');
    expect(items[3].manufacturer).toBe('J.B. Chemicals & Pharmaceuticals');

    // 30041090 SANO SOFRAMYCIN SKIN CREA 30GM -> SOFRAMYCIN SKIN CREA 30GM
    expect(items[4].medicineName).toBe('SOFRAMYCIN SKIN CREA 30GM');
    expect(items[4].manufacturer).toBe('Sanofi India');

    // 30049039 MANK LECOPE-M TAB 15TAB -> LECOPE-M TAB
    expect(items[5].medicineName).toBe('LECOPE-M TAB');
    expect(items[5].manufacturer).toBe('Mankind Pharma');
  });
});



