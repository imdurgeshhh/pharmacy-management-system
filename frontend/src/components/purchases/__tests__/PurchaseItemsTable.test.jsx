import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PurchaseItemsTable from '../PurchaseItemsTable';

describe('components/purchases/PurchaseItemsTable.jsx', () => {
  const mockEntries = [
    {
      medicine_name: 'Paracetamol 500mg',
      batch_number: 'B-101',
      expiry_date: '2026-12-31',
      qty: 50,
      price: 15.0,
      gst_pct: 12,
      tax_amt: 90.0,
      disc_pct: 5,
      disc_amt: 37.5,
      final: 802.5,
    },
    {
      medicine_name: 'Azithromycin 500mg',
      batch_number: 'B-102',
      expiry_date: '2026-08-31',
      qty: 20,
      price: 85.0,
      gst_pct: 12,
      tax_amt: 204.0,
      disc_pct: 0,
      disc_amt: 0,
      final: 1904.0,
    },
  ];

  it('renders empty placeholder when entries array is empty', () => {
    render(<PurchaseItemsTable entries={[]} />);

    expect(screen.getByText('No entries yet — add medicines above.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders table columns, rows, and total quantity calculations', () => {
    render(<PurchaseItemsTable entries={mockEntries} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('Azithromycin 500mg')).toBeInTheDocument();

    // Total quantity = 50 + 20 = 70
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText(/medicines/i)).toBeInTheDocument();
  });

  it('calls onStartEdit when edit button is clicked on a row', () => {
    const handleStartEdit = vi.fn();
    render(<PurchaseItemsTable entries={mockEntries} onStartEdit={handleStartEdit} />);

    const editBtns = screen.getAllByLabelText(/Edit entry/i);
    fireEvent.click(editBtns[0]);

    expect(handleStartEdit).toHaveBeenCalledWith(0);
  });

  it('triggers delete flow via ConfirmModal and calls onDeleteRow upon confirmation', () => {
    const handleDeleteRow = vi.fn();
    render(<PurchaseItemsTable entries={mockEntries} onDeleteRow={handleDeleteRow} />);

    const deleteBtns = screen.getAllByLabelText(/Delete entry/i);
    fireEvent.click(deleteBtns[1]); // Row index 1

    // Confirm modal should appear
    expect(screen.getByText('Remove Item Entry?')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Remove Item' });
    fireEvent.click(confirmBtn);

    expect(handleDeleteRow).toHaveBeenCalledWith(1);
  });

  it('triggers clear all flow via ConfirmModal and calls onClearAll upon confirmation', () => {
    const handleClearAll = vi.fn();
    render(<PurchaseItemsTable entries={mockEntries} onClearAll={handleClearAll} />);

    const clearAllBtn = screen.getByRole('button', { name: /Clear All/i });
    fireEvent.click(clearAllBtn);

    const modal = screen.getByRole('alertdialog');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Clear All Entries?')).toBeInTheDocument();
    const confirmBtn = modal.querySelector('button.bg-red-600') || screen.getAllByRole('button', { name: /Clear All/i })[1];
    fireEvent.click(confirmBtn);

    expect(handleClearAll).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when "Save Stock Entry" button is clicked', () => {
    const handleSave = vi.fn();
    render(<PurchaseItemsTable entries={mockEntries} onSave={handleSave} />);

    const saveBtn = screen.getByRole('button', { name: /Save Stock Entry/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('disables save button and shows "Saving…" when saving prop is true', () => {
    const handleSave = vi.fn();
    render(<PurchaseItemsTable entries={mockEntries} onSave={handleSave} saving={true} />);

    const saveBtn = screen.getByRole('button', { name: /Saving…/i });
    expect(saveBtn).toBeDisabled();

    fireEvent.click(saveBtn);
    expect(handleSave).not.toHaveBeenCalled();
  });
});
