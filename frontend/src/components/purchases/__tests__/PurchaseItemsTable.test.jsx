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

  it('renders MRP input field right next to Qty, accepts decimal input, and includes MRP in submitted data', () => {
    const handleSave = vi.fn();
    const onUpdateMrp = vi.fn();
    render(<PurchaseItemsTable entries={mockEntries} onSave={handleSave} onUpdateMrp={onUpdateMrp} />);

    // Verify MRP column header exists
    expect(screen.getByRole('columnheader', { name: 'MRP' })).toBeInTheDocument();

    // Verify MRP input fields render for each row
    const mrpInputs = screen.getAllByRole('spinbutton', { name: /MRP for/i });
    expect(mrpInputs).toHaveLength(mockEntries.length);

    // Enter decimal MRP value (e.g. 125.25)
    fireEvent.change(mrpInputs[0], { target: { value: '125.25' } });
    expect(mrpInputs[0]).toHaveValue(125.25);
    expect(onUpdateMrp).toHaveBeenCalledWith(0, '125.25');

    // Click Save Stock Entry
    const saveBtn = screen.getByRole('button', { name: /Save Stock Entry/i });
    fireEvent.click(saveBtn);

    // Verify handleSave received the updated purchase items including the entered mrp
    expect(handleSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          medicine_name: 'Paracetamol 500mg',
          mrp: '125.25',
        }),
        expect.objectContaining({
          medicine_name: 'Azithromycin 500mg',
        }),
      ])
    );
  });

  it('pre-fills MRP field when entry already has an mrp value', () => {
    const entriesWithMrp = [
      {
        ...mockEntries[0],
        mrp: 140.50,
      }
    ];
    render(<PurchaseItemsTable entries={entriesWithMrp} />);
    const mrpInput = screen.getByRole('spinbutton', { name: /MRP for Paracetamol 500mg/i });
    expect(mrpInput).toHaveValue(140.50);
  });
});
