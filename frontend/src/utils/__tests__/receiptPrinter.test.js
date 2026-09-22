import { describe, it, expect, vi, beforeEach } from 'vitest';
import autoTable from 'jspdf-autotable';
import { generateInvoicePDF } from '../receiptPrinter';

let recordedTexts = [];
const mockSave = vi.fn();

vi.mock('jspdf', () => {
  class MockJsPDF {
    constructor() {
      this.setFillColor = vi.fn();
      this.rect = vi.fn();
      this.roundedRect = vi.fn();
      this.setTextColor = vi.fn();
      this.setFontSize = vi.fn();
      this.setFont = vi.fn();
      this.text = vi.fn((str, x, y, opts) => recordedTexts.push({ str, x, y, opts }));
      this.save = mockSave;
      this.internal = {
        pageSize: {
          width: 595.28,
          height: 841.89,
        },
      };
      this.lastAutoTable = {
        finalY: 200,
      };
    }
  }
  return {
    default: MockJsPDF,
    jsPDF: MockJsPDF,
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

describe('utils/receiptPrinter.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordedTexts = [];
  });

  const mockCustomer = {
    name: 'Jane Doe',
    phone: '+91 9988776655',
    gst: '29ABCDE1234F1Z5',
    doctor: 'A. K. Roy',
    prescription: 'RX-908',
    bill_date: '2026-03-15',
  };

  const mockRows = [
    {
      name: 'Amoxicillin 500mg',
      qty: 2,
      mrp: 50.0,
      disc_pct: 10,
      disc_amt: 10.0,
      gst_pct: 12,
      tax_amt: 12.0,
      net_amt: 102.0,
    },
    {
      name: 'Paracetamol 650mg',
      qty: 10,
      mrp: 30.0,
      disc_pct: 0,
      disc_amt: 0.0,
      gst_pct: 5,
      tax_amt: 15.0,
      net_amt: 315.0,
    },
  ];

  const mockSummary = {
    subtotal: 400.0,
    totalDiscount: 10.0,
    totalGST: 27.0,
    grandTotal: 417.0,
  };

  it('generates PDF invoice with mapped line items and saves with Invoice_{billNo}.pdf', () => {
    generateInvoicePDF(mockCustomer, mockRows, mockSummary, 'Cash', '10042');

    expect(mockSave).toHaveBeenCalledWith('Invoice_10042.pdf');

    // Verify autoTable call
    expect(autoTable).toHaveBeenCalledTimes(1);
    const tableOptions = autoTable.mock.calls[0][1];

    expect(tableOptions.head).toEqual([
      ['#', 'Medicine', 'HSN', 'Qty', 'MRP', 'Disc%', 'Disc Amt', 'GST%', 'Tax Amt', 'Net Amt'],
    ]);

    expect(tableOptions.body).toHaveLength(2);
    expect(tableOptions.body[0]).toEqual([
      1,
      'Amoxicillin 500mg',
      '3004',
      2,
      '₹50.00',
      '10%',
      '₹10.00',
      '12%',
      '₹12.00',
      '₹102.00',
    ]);
    expect(tableOptions.body[1]).toEqual([
      2,
      'Paracetamol 650mg',
      '3004',
      10,
      '₹30.00',
      '0%',
      '₹0.00',
      '5%',
      '₹15.00',
      '₹315.00',
    ]);
  });

  it('handles empty customer fields with default fallbacks ("Walk-in Customer", "—")', () => {
    const bareCustomer = {};
    generateInvoicePDF(bareCustomer, [], { subtotal: 0, totalDiscount: 0, totalGST: 0, grandTotal: 0 }, 'UPI', '10043');

    const texts = recordedTexts.map(t => t.str);

    expect(texts).toContain('Name: Walk-in Customer');
    expect(texts).toContain('Phone: —');
    expect(texts).toContain('Payment: UPI');
    expect(texts).toContain('Bill No: 10043');
    expect(texts).toContain('Grand Total: ₹0.00');
  });

  it('renders optional doctor and prescription fields when provided', () => {
    generateInvoicePDF(mockCustomer, mockRows, mockSummary, 'Card', '10044');

    const texts = recordedTexts.map(t => t.str);

    expect(texts).toContain('GST: 29ABCDE1234F1Z5');
    expect(texts).toContain('Doctor: Dr. A. K. Roy');
    expect(texts).toContain('Rx No.: RX-908');
  });

  it('supports custom shop details override', () => {
    const customShop = {
      name: 'Custom Meds Pvt Ltd',
      address: '77 Bannerghatta Rd',
      gstin: '29ZZZZZ9999Z1Z1',
      phone: '+91 80 12345678',
    };

    generateInvoicePDF(mockCustomer, mockRows, mockSummary, 'Cash', '10045', customShop);

    const texts = recordedTexts.map(t => t.str);

    expect(texts).toContain('Custom Meds Pvt Ltd');
    expect(texts).toContain('77 Bannerghatta Rd');
    expect(texts).toContain('GSTIN: 29ZZZZZ9999Z1Z1  |  Ph: +91 80 12345678');
  });

  it('formats large quantities and currency amounts with two decimal places', () => {
    const largeRows = [
      {
        name: 'Bulk Saline Bottles',
        qty: 5000,
        mrp: 125.75,
        disc_pct: 15,
        disc_amt: 94312.5,
        gst_pct: 18,
        tax_amt: 113175.0,
        net_amt: 647612.5,
      },
    ];

    const largeSummary = {
      subtotal: 628750.0,
      totalDiscount: 94312.5,
      totalGST: 113175.0,
      grandTotal: 647612.5,
    };

    generateInvoicePDF(mockCustomer, largeRows, largeSummary, 'Credit', '10046');

    const tableOptions = autoTable.mock.calls[0][1];
    expect(tableOptions.body[0][3]).toBe(5000);
    expect(tableOptions.body[0][4]).toBe('₹125.75');

    const texts = recordedTexts.map(t => t.str);
    expect(texts).toContain('Grand Total: ₹647612.50');
  });

  it('renders CGST and SGST split, Amount in Words, and Pharmacist signatory for same-state transaction', () => {
    const fullShop = {
      name: 'LifeCare Chemists',
      address: '22 Park Street, Kolkata',
      gstin: '19AAAAA0000A1Z5',
      phone: '9876543210',
      email: 'lifecare@kolkata.in',
      dl_no: 'DL-WB-2025-888',
      pharmacist_name: 'Debashis Roy',
      pharmacist_reg_no: 'WB-PH-9922'
    };

    const sameStateCustomer = {
      name: 'Amit Ghosh',
      phone: '9830098300',
      gst: '19BBBBB1111B1Z2'
    };

    const testSummary = {
      subtotal: 1000.0,
      totalDiscount: 100.0,
      totalGST: 100.0,
      grandTotal: 1000.0
    };

    generateInvoicePDF(sameStateCustomer, mockRows, testSummary, 'UPI', '10047', fullShop);

    const texts = recordedTexts.map(t => t.str);
    expect(texts).toContain('CGST:');
    expect(texts).toContain('SGST:');
    expect(texts).toContain('₹50.00'); // 100.0 / 2
    expect(texts).toContain('D.L. No.: DL-WB-2025-888');
    expect(texts).toContain('Amount in Words:');
    expect(texts).toContain('One Thousand Rupees Only');
    expect(texts).toContain('Dispensed by: Debashis Roy | Reg No: WB-PH-9922');
  });

  it('renders IGST when store and customer GSTINs have different state codes', () => {
    const chhattisgarhShop = {
      name: 'Apex Health CG',
      address: 'Pandri, Raipur, CG',
      gstin: '22AAAAA0000A1Z5',
      phone: '9876543210'
    };

    const maharashtraCustomer = {
      name: 'Rajesh Patil',
      phone: '9822098220',
      gst: '27MMMMM2222M1Z9'
    };

    const testSummary = {
      subtotal: 500.0,
      totalDiscount: 0,
      totalGST: 60.0,
      grandTotal: 560.0
    };

    generateInvoicePDF(maharashtraCustomer, mockRows, testSummary, 'Card', '10048', chhattisgarhShop);

    const texts = recordedTexts.map(t => t.str);
    expect(texts).toContain('IGST:');
    expect(texts).toContain('₹60.00');
    expect(texts).not.toContain('CGST:');
    expect(texts).not.toContain('SGST:');
  });
});

