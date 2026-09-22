import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_BASE } from '../../mocks/handlers';
import POS from '../../pages/POS';
import useStore from '../../store/useStore';
import * as receiptPrinter from '../../utils/receiptPrinter';

vi.mock('../../utils/receiptPrinter', () => ({
  generateInvoicePDF: vi.fn(),
}));

describe('Integration: POS Flow (MedicinePicker -> Table -> Checkout API)', () => {
  beforeEach(() => {
    useStore.setState({
      user: { id: 1, name: 'Shopkeeper User', role: 'shopkeeper' },
      token: 'valid-jwt-token',
    });
    vi.clearAllMocks();
  });

  it('loads inventory from API and allows selecting medicine via MedicinePicker', async () => {
    const user = userEvent.setup();
    render(<POS />);

    // Wait for inventory to be fetched by POS component
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Medicine name…/i)).toBeInTheDocument();
    });

    const pickerInput = screen.getByPlaceholderText(/Medicine name…/i);
    await user.type(pickerInput, 'Para');

    // MedicinePicker dropdown should display matching items
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const option = screen.getByRole('option', { name: /Paracetamol 500mg/i });
    fireEvent.mouseDown(option);

    // Selected item appears in medicine table
    await waitFor(() => {
      expect(screen.getByDisplayValue('Paracetamol 500mg')).toBeInTheDocument();
    });
  });

  it('submits checkout request to /sales API and triggers invoice generation', async () => {
    let salesPayload = null;
    server.use(
      http.post(`${API_BASE}/sales`, async ({ request }) => {
        salesPayload = await request.json();
        return HttpResponse.json({
          success: true,
          sale_id: 888,
          bill_no: 'BILL-888',
        });
      })
    );

    const user = userEvent.setup();
    render(<POS />);

    // Wait for inventory load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Medicine name…/i)).toBeInTheDocument();
    });

    // Pick a medicine
    const pickerInput = screen.getByPlaceholderText(/Medicine name…/i);
    await user.type(pickerInput, 'Amox');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Amoxicillin 250mg/i })).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByRole('option', { name: /Amoxicillin 250mg/i }));

    // Enter customer details
    const nameInput = screen.getByPlaceholderText(/Walk-in/i);
    await user.type(nameInput, 'Rajesh Kumar');

    // Test Print / Download PDF
    const pdfBtn = screen.getByRole('button', { name: /Print \/ Download PDF/i });
    await user.click(pdfBtn);
    expect(receiptPrinter.generateInvoicePDF).toHaveBeenCalled();

    // Submit Checkout
    const checkoutBtn = screen.getByRole('button', { name: /Save Bill/i });
    await user.click(checkoutBtn);

    await waitFor(() => {
      expect(salesPayload).not.toBeNull();
    });

    expect(salesPayload.customer_name).toBe('Rajesh Kumar');
    expect(salesPayload.items).toHaveLength(1);
  });

  it('handles API error during checkout gracefully with alert notification', async () => {
    server.use(
      http.post(`${API_BASE}/sales`, () => {
        return HttpResponse.json({ error: 'Insufficient stock for Paracetamol' }, { status: 400 });
      })
    );

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const user = userEvent.setup();
    render(<POS />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Medicine name…/i)).toBeInTheDocument();
    });

    const pickerInput = screen.getByPlaceholderText(/Medicine name…/i);
    await user.type(pickerInput, 'Para');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Paracetamol 500mg/i })).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByRole('option', { name: /Paracetamol 500mg/i }));

    const checkoutBtn = screen.getByRole('button', { name: /Save Bill/i });
    await user.click(checkoutBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/Insufficient stock/i));
    });
  });
});
