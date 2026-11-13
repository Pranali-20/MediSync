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
});
