import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reports from '../../pages/Reports';
import Suppliers from '../../pages/Suppliers';
import useStore from '../../store/useStore';
import * as exportUtils from '../../utils/exportData';

vi.mock('../../utils/exportData', () => ({
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}));

describe('Integration: Export Pipeline across Reports.jsx and Suppliers.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { id: 1, name: 'Admin', role: 'admin' },
      token: 'jwt-token',
    });
  });

  describe('Reports.jsx Export Integration', () => {
    it('produces correctly shaped Excel data from real wholesale-purchase report state', async () => {
      render(<Reports />);

      await waitFor(() => {
        expect(screen.getByText('Apex Pharma Distributors')).toBeInTheDocument();
      });

      const excelBtn = screen.getByRole('button', { name: /Export Excel/i });
      fireEvent.click(excelBtn);

      expect(exportUtils.exportToExcel).toHaveBeenCalledTimes(1);
      const [data, columns, filename] = exportUtils.exportToExcel.mock.calls[0];

      expect(filename).toBe('Wholesale_Purchase_Report');
      expect(columns).toEqual(
        expect.arrayContaining([
          { key: 'date', label: 'Date' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'item', label: 'Item / Medicine' },
          { key: 'qty', label: 'Quantity' },
          { key: 'rate', label: 'Rate (INR)' },
          { key: 'total', label: 'Total (INR)' },
        ])
      );
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('supplier', 'Apex Pharma Distributors');
      expect(data[0]).toHaveProperty('item', 'Paracetamol 500mg');
    });

    it('produces correctly shaped PDF data when switched to Wholesale Sale tab', async () => {
      const user = userEvent.setup();
      render(<Reports />);

      // Switch to Wholesale Sale tab
      const wholesaleSaleTab = screen.getByRole('tab', { name: /Wholesale Sale/i });
      await user.click(wholesaleSaleTab);

      await waitFor(() => {
        expect(screen.getByText('City Care Chemist')).toBeInTheDocument();
      });

      // Click "Export PDF"
      const pdfBtn = screen.getByRole('button', { name: /Export PDF/i });
      await user.click(pdfBtn);

      expect(exportUtils.exportToPDF).toHaveBeenCalledTimes(1);
      const [data, columns, title, filename, accentRgb] = exportUtils.exportToPDF.mock.calls[0];

      expect(title).toBe('Wholesale Sales Report');
      expect(filename).toBe('Wholesale_Sales_Report');
      expect(accentRgb).toEqual([59, 130, 246]);
      expect(columns).toEqual(
        expect.arrayContaining([
          { key: 'date', label: 'Date' },
          { key: 'buyer', label: 'Buyer' },
          { key: 'item', label: 'Item / Medicine' },
        ])
      );
      expect(data[0]).toHaveProperty('buyer', 'City Care Chemist');
    });
  });

  describe('Suppliers.jsx Export Integration', () => {
    it('produces correctly shaped Excel data from real Suppliers wholesale sales state', async () => {
      const user = userEvent.setup();
      render(<Suppliers />);

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText('City Care Chemist')).toBeInTheDocument();
      });

      // Open Download menu
      const downloadBtn = screen.getByRole('button', { name: /Download List/i });
      await user.click(downloadBtn);

      // Select Excel option
      const excelOption = screen.getByRole('menuitem', { name: /Excel \(\.xlsx\)/i });
      await user.click(excelOption);

      expect(exportUtils.exportToExcel).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            medicine_name: 'Paracetamol 500mg',
            shopkeeper_name: 'City Care Chemist',
          }),
        ]),
        expect.any(Array),
        'Wholesale_Sales'
      );
    });

    it('produces correctly shaped PDF data from real Suppliers directory state', async () => {
      const user = userEvent.setup();
      render(<Suppliers />);

      // Switch to Supplier Directory tab
      const suppliersTab = screen.getByRole('tab', { name: /Supplier Directory/i });
      await user.click(suppliersTab);

      // Wait for supplier list to load
      await waitFor(() => {
        expect(screen.getByText('Apex Pharma Distributors')).toBeInTheDocument();
      });

      // Click PDF Export button on SupplierList
      const pdfBtn = screen.getByRole('button', { name: 'PDF' });
      await user.click(pdfBtn);

      expect(exportUtils.exportToPDF).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Apex Pharma Distributors',
            contact_person: 'Rajesh Sharma',
          }),
        ]),
        expect.any(Array),
        'Suppliers Directory',
        'Suppliers_Directory',
        [16, 185, 129]
      );
    });
  });
});
