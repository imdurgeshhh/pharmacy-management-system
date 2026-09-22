import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WholesaleSalesTable from '../WholesaleSalesTable';
import * as exportData from '../../../utils/exportData';

vi.mock('../../../utils/exportData', () => ({
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}));

describe('components/suppliers/WholesaleSalesTable.jsx', () => {
  const mockSales = [
    {
      id: 1,
      medicine_name: 'Paracetamol 500mg',
      shopkeeper_name: 'Green Health Pharmacy',
      gst_number: '29AAAAA0000A1Z5',
      quantity: 100,
      price_per_unit: 15.0,
      total_amount: 1500.0,
      sale_date: '2026-03-10',
    },
    {
      id: 2,
      medicine_name: 'Amoxicillin 250mg',
      shopkeeper_name: 'Metro Meds',
      gst_number: '29BBBBB1111B2Z6',
      quantity: 50,
      price_per_unit: 40.0,
      total_amount: 2000.0,
      sale_date: '2026-03-11',
    },
  ];

  it('renders summary cards with correct total sales count and total revenue', () => {
    render(<WholesaleSalesTable sales={mockSales} onOpenAddModal={vi.fn()} onDeleteSale={vi.fn()} />);

    expect(screen.getByText('Total Sales Amount')).toBeInTheDocument();
    // Revenue = 1500 + 2000 = 3500 => ₹3,500.00
    expect(screen.getByText('₹3,500.00')).toBeInTheDocument();
  });

  it('renders table rows with medicine name and buyer info', () => {
    render(<WholesaleSalesTable sales={mockSales} onOpenAddModal={vi.fn()} onDeleteSale={vi.fn()} />);

    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('Green Health Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('29AAAAA0000A1Z5')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    expect(screen.getByText('Metro Meds')).toBeInTheDocument();
  });

  it('filters table rows according to search query prop', () => {
    render(
      <WholesaleSalesTable
        sales={mockSales}
        search="Metro"
        onSearchChange={vi.fn()}
        onOpenAddModal={vi.fn()}
        onDeleteSale={vi.fn()}
      />
    );

    expect(screen.getByText('Metro Meds')).toBeInTheDocument();
    expect(screen.queryByText('Green Health Pharmacy')).not.toBeInTheDocument();
  });

  it('triggers exportToExcel when Excel menu option is clicked', async () => {
    const user = userEvent.setup();
    render(<WholesaleSalesTable sales={mockSales} onOpenAddModal={vi.fn()} onDeleteSale={vi.fn()} />);

    const downloadBtn = screen.getByRole('button', { name: /Download List/i });
    await user.click(downloadBtn);

    const excelOption = screen.getByRole('menuitem', { name: /Excel \(\.xlsx\)/i });
    await user.click(excelOption);

    expect(exportData.exportToExcel).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ medicine_name: 'Paracetamol 500mg' })]),
      expect.any(Array),
      'Wholesale_Sales'
    );
  });

  it('triggers exportToPDF when PDF menu option is clicked', async () => {
    const user = userEvent.setup();
    render(<WholesaleSalesTable sales={mockSales} onOpenAddModal={vi.fn()} onDeleteSale={vi.fn()} />);

    const downloadBtn = screen.getByRole('button', { name: /Download List/i });
    await user.click(downloadBtn);

    const pdfOption = screen.getByRole('menuitem', { name: /PDF \(\.pdf\)/i });
    await user.click(pdfOption);

    expect(exportData.exportToPDF).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ medicine_name: 'Paracetamol 500mg' })]),
      expect.any(Array),
      'Wholesale Sales Report',
      'Wholesale_Sales_Report',
      expect.any(Array)
    );
  });

  it('opens ConfirmModal when delete row is clicked and calls onDeleteSale on confirmation', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(
      <WholesaleSalesTable
        sales={mockSales}
        onOpenAddModal={vi.fn()}
        onDeleteSale={handleDelete}
        isAdmin={true}
      />
    );

    const deleteBtns = screen.getAllByLabelText('Delete this entry');
    await user.click(deleteBtns[0]); // delete record 1

    expect(screen.getByText('Delete Wholesale Sale?')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Delete Sale' });
    await user.click(confirmBtn);

    expect(handleDelete).toHaveBeenCalledWith(1);
  });
});
