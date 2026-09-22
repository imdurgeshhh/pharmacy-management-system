import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToExcel, exportToPDF } from '../exportData';

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn((data) => ({ '!data': data })),
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

const mockSave = vi.fn();
const mockText = vi.fn();
const jsPdfConstructorSpy = vi.fn();

vi.mock('jspdf', () => {
  class MockJsPDF {
    constructor(...args) {
      jsPdfConstructorSpy(...args);
      this.setFillColor = vi.fn();
      this.rect = vi.fn();
      this.setTextColor = vi.fn();
      this.setFontSize = vi.fn();
      this.setFont = vi.fn();
      this.text = mockText;
      this.save = mockSave;
      this.internal = {
        pageSize: {
          width: 842,
        },
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

describe('utils/exportData.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToExcel', () => {
    const columns = [
      { key: 'name', label: 'Medicine Name' },
      { key: 'batch', label: 'Batch No' },
      { key: 'price', label: 'Price (₹)' },
    ];

    it('correctly maps columns and row data to worksheet array', () => {
      const data = [
        { name: 'Paracetamol', batch: 'B101', price: 25.5 },
        { name: 'Amoxicillin', batch: 'B102', price: 50.0 },
      ];

      exportToExcel(data, columns, 'Inventory_Report');

      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(1);
      const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];

      // Header row
      expect(sheetData[0]).toEqual(['Medicine Name', 'Batch No', 'Price (₹)']);
      // Data rows
      expect(sheetData[1]).toEqual(['Paracetamol', 'B101', 25.5]);
      expect(sheetData[2]).toEqual(['Amoxicillin', 'B102', 50.0]);

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        'Inventory_Report.xlsx'
      );
    });

    it('handles empty data gracefully without throwing', () => {
      exportToExcel([], columns, 'Empty_Report');

      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
        ['Medicine Name', 'Batch No', 'Price (₹)'],
      ]);
      expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'Empty_Report.xlsx');
    });

    it('uses default filename "export.xlsx" when filename is omitted', () => {
      exportToExcel([], columns);
      expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'export.xlsx');
    });

    it('handles special characters and Unicode in cell values correctly', () => {
      const data = [
        { name: 'Dolo 650™ & Paracetamol (₹10.50)', batch: 'β-102_@#$', price: '₹10.50' },
        { name: 'हिन्दी दवा / 中文药', batch: 'UNICODE-99', price: '₹99.00' },
      ];

      exportToExcel(data, columns, 'Unicode_Report');

      const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
      expect(sheetData[1][0]).toBe('Dolo 650™ & Paracetamol (₹10.50)');
      expect(sheetData[1][1]).toBe('β-102_@#$');
      expect(sheetData[2][0]).toBe('हिन्दी दवा / 中文药');
    });

    it('fills empty string for missing or undefined keys', () => {
      const data = [{ name: 'Paracetamol' /* batch and price missing */ }];
      exportToExcel(data, columns, 'Missing_Keys');

      const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
      expect(sheetData[1]).toEqual(['Paracetamol', '', '']);
    });
  });

  describe('exportToPDF', () => {
    const columns = [
      { key: 'item', label: 'Item Name' },
      { key: 'total', label: 'Total (INR)' },
    ];

    it('initializes jsPDF landscape A4 and saves with correct filename', () => {
      const data = [{ item: 'Paracetamol', total: 250 }];
      exportToPDF(data, columns, 'Monthly Sales', 'sales_2026');

      expect(jsPdfConstructorSpy).toHaveBeenCalledWith({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      expect(mockText).toHaveBeenCalledWith('Monthly Sales', 20, 24);
      expect(mockSave).toHaveBeenCalledWith('sales_2026.pdf');
    });

    it('passes table headers and mapped body to autoTable', () => {
      const data = [
        { item: 'Aspirin', total: 100 },
        { item: 'Ibuprofen', total: 180 },
      ];
      exportToPDF(data, columns, 'Summary', 'summary_doc', [10, 20, 30]);

      expect(autoTable).toHaveBeenCalledTimes(1);
      const callArgs = autoTable.mock.calls[0][1];
      expect(callArgs.head).toEqual([['Item Name', 'Total (INR)']]);
      expect(callArgs.body).toEqual([
        ['Aspirin', 100],
        ['Ibuprofen', 180],
      ]);
      expect(callArgs.headStyles.fillColor).toEqual([10, 20, 30]);
    });

    it('handles empty data and default arguments in exportToPDF', () => {
      exportToPDF();

      expect(mockSave).toHaveBeenCalledWith('report.pdf');

      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [[]],
          body: [],
        })
      );
    });

    it('handles unicode characters in PDF export safely', () => {
      const data = [{ item: 'Cetirizine 10mg – ₹45.00', total: '₹45.00' }];
      exportToPDF(data, columns, 'Unicode Test', 'unicode_pdf');

      const callArgs = autoTable.mock.calls[0][1];
      expect(callArgs.body[0][0]).toBe('Cetirizine 10mg – ₹45.00');
    });
  });
});
