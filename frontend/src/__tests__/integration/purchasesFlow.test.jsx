import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_BASE } from '../../mocks/handlers';
import Purchases from '../../pages/Purchases';
import useStore from '../../store/useStore';

describe('Integration: Purchases Flow (Items Table -> Schedule Validation -> API Submission)', () => {
  beforeEach(() => {
    useStore.setState({
      user: { id: 1, name: 'Admin', role: 'admin' },
      token: 'jwt-token',
    });
    vi.clearAllMocks();

    server.use(
      http.get(`${API_BASE}/inventory`, () => {
        return HttpResponse.json([
          { id: 1, name: 'Paracetamol 500mg', mrp: 20, schedule: 'NONE' },
          { id: 2, name: 'Amoxicillin 250mg', mrp: 50, schedule: 'H' },
        ]);
      }),
      http.get(`${API_BASE}/suppliers`, () => {
        return HttpResponse.json([
          { id: 10, name: 'Apex Pharma Distributors', gst_number: '27AABCU9603R1ZM' },
        ]);
      })
    );
  });

  it('blocks submission when entries list is empty', async () => {
    render(<Purchases />);

    expect(screen.getByText('No entries yet — add medicines above.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Stock Entry/i })).not.toBeInTheDocument();
  });

  it('adds an existing medicine entry with catalog schedule badge', async () => {
    const user = userEvent.setup();
    render(<Purchases />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type medicine name…/i)).toBeInTheDocument();
    });

    const medInput = screen.getByPlaceholderText(/Type medicine name…/i);
    await user.type(medInput, 'Amoxicillin 250mg');

    // Click matching option in autocomplete
    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    });
    const optionBtn = screen.getByRole('option', { name: /Amoxicillin 250mg/i });
    await user.click(optionBtn);

    // Should indicate Catalog Schedule
    await waitFor(() => {
      expect(screen.getAllByText(/Schedule H/i).length).toBeGreaterThan(0);
    });

    const batchInput = screen.getByLabelText(/Batch number/i);
    await user.type(batchInput, 'BATCH-H-001');

    const qtyInput = screen.getByLabelText(/Qty/i);
    await user.type(qtyInput, '50');

    const priceInput = screen.getByLabelText(/Purchase price/i);
    await user.clear(priceInput);
    await user.type(priceInput, '45');

    // Add to List button should be enabled
    const addBtn = screen.getByRole('button', { name: /Add to List/i });
    expect(addBtn).not.toBeDisabled();
    await user.click(addBtn);

    // Verify item appears in PurchaseItemsTable with Schedule H badge
    await waitFor(() => {
      expect(screen.getByText('BATCH-H-001')).toBeInTheDocument();
      expect(screen.getByText('Stock Entry List (1)')).toBeInTheDocument();
    });
  });

  it('requires Drug Schedule for a brand-new medicine and sends schedule in API payload', async () => {
    let capturedPayload = null;
    server.use(
      http.post(`${API_BASE}/purchases`, async ({ request }) => {
        capturedPayload = await request.json();
        return HttpResponse.json({
          success: true,
          purchaseId: 777,
        });
      })
    );

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<Purchases />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type medicine name…/i)).toBeInTheDocument();
    });

    // Pick Supplier
    const suppBtn = screen.getByRole('button', { name: /Choose supplier/i });
    await user.click(suppBtn);
    const suppOption = await screen.findByRole('option', { name: /Apex Pharma Distributors/i });
    await user.click(suppOption);

    const confirmSuppBtn = screen.getByRole('button', { name: /Confirm Supplier/i });
    await user.click(confirmSuppBtn);

    // Type a brand new medicine
    const medInput = screen.getByPlaceholderText(/Type medicine name…/i);
    await user.type(medInput, 'Brand New Antibiotic 500mg');

    const batchInput = screen.getByLabelText(/Batch number/i);
    await user.type(batchInput, 'BATCH-NEW-99');

    const qtyInput = screen.getByLabelText(/Qty/i);
    await user.type(qtyInput, '20');

    const priceInput = screen.getByLabelText(/Purchase price/i);
    await user.type(priceInput, '150');

    // Without schedule selected, Add to List is disabled and warning shows
    const addBtn = screen.getByRole('button', { name: /Add to List/i });
    expect(addBtn).toBeDisabled();
    expect(screen.getByText(/Required for new medicine/i)).toBeInTheDocument();

    // Select Schedule H1
    const scheduleSelect = screen.getByLabelText(/Drug Schedule/i);
    await user.selectOptions(scheduleSelect, 'H1');

    // Now Add to List is enabled
    expect(addBtn).not.toBeDisabled();
    await user.click(addBtn);

    // Item is in the table with Schedule H1
    await waitFor(() => {
      expect(screen.getByText('BATCH-NEW-99')).toBeInTheDocument();
      expect(screen.getByText('Schedule H1')).toBeInTheDocument();
    });

    // Save Stock Entry
    const saveStockBtn = screen.getByRole('button', { name: /Save Stock Entry/i });
    await user.click(saveStockBtn);

    await waitFor(() => {
      expect(capturedPayload).not.toBeNull();
    });

    expect(capturedPayload.items).toHaveLength(1);
    expect(capturedPayload.items[0].medicine_name).toBe('Brand New Antibiotic 500mg');
    expect(capturedPayload.items[0].schedule).toBe('H1');
    expect(capturedPayload.items[0].batch_number).toBe('BATCH-NEW-99');
    expect(capturedPayload.items[0].qty).toBe(20);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('saved to stock'));
  });
});
