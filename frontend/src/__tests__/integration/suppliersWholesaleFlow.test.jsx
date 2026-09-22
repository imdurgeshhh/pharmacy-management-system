import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_BASE } from '../../mocks/handlers';
import Suppliers from '../../pages/Suppliers';
import useStore from '../../store/useStore';

describe('Integration: Suppliers Wholesale Flow (Modal -> API -> Table)', () => {
  beforeEach(() => {
    useStore.setState({
      user: { id: 1, name: 'Admin', role: 'admin' },
      token: 'jwt',
    });
  });

  it('adds a new wholesale sale and reflects the updated entry in WholesaleSalesTable', async () => {
    let salesList = [
      {
        id: 1,
        medicine_name: 'Paracetamol 500mg',
        quantity: 100,
        price_per_unit: 18.5,
        total_amount: 1850,
        gst_number: '29AAAAA0000A1Z5',
        shopkeeper_name: 'City Care Chemist',
        sale_date: '2026-03-01',
      },
    ];

    server.use(
      http.get(`${API_BASE}/wholesale/sales`, () => {
        return HttpResponse.json(salesList);
      }),
      http.post(`${API_BASE}/wholesale/sales`, async ({ request }) => {
        const body = await request.json();
        const newSale = {
          id: 2,
          medicine_name: body.medicine_name,
          quantity: Number(body.quantity),
          price_per_unit: Number(body.price_per_unit),
          total_amount: Number(body.quantity) * Number(body.price_per_unit),
          gst_number: body.gst_number,
          shopkeeper_name: body.shopkeeper_name,
          sale_date: body.sale_date,
        };
        salesList.push(newSale);
        return HttpResponse.json(newSale, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(<Suppliers />);

    // Wait for initial sale in table
    await waitFor(() => {
      expect(screen.getByText('City Care Chemist')).toBeInTheDocument();
    });

    // Click "Add Sale" button
    const addBtn = screen.getByRole('button', { name: /Add Sale/i });
    await user.click(addBtn);

    // Modal should be open
    expect(screen.getByText('Add Wholesale Sale')).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByLabelText(/Medicine Name/i), 'Cough Syrup 100ml');
    await user.type(screen.getByLabelText(/Quantity Sold/i), '50');
    await user.type(screen.getByLabelText(/Price Per Unit/i), '60');
    await user.type(screen.getByLabelText(/Shopkeeper \/ Pharmacy Buyer/i), 'Apex Medico');

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Sale/i });
    fireEvent.click(saveBtn);

    // Verify modal closes and new entry appears in table
    await waitFor(() => {
      expect(screen.getByText('Apex Medico')).toBeInTheDocument();
      expect(screen.getByText('Cough Syrup 100ml')).toBeInTheDocument();
    });
  });
});
