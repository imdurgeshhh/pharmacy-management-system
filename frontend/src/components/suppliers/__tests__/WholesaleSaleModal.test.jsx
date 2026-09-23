import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WholesaleSaleModal from '../WholesaleSaleModal';
import api from '../../../config/axios';

describe('components/suppliers/WholesaleSaleModal.jsx', () => {
  it('renders modal form fields when isOpen is true', () => {
    render(
      <WholesaleSaleModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSale={vi.fn()}
        loading={false}
      />
    );

    expect(screen.getByText('Add Wholesale Sale')).toBeInTheDocument();
    expect(screen.getByLabelText(/Medicine Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity Sold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price Per Unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GST Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shopkeeper \/ Pharmacy Buyer/i)).toBeInTheDocument();
  });

  it('updates estimated total preview when quantity and price are entered', () => {
    render(
      <WholesaleSaleModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSale={vi.fn()}
        loading={false}
      />
    );

    const qtyInput = screen.getByLabelText(/Quantity Sold/i);
    const priceInput = screen.getByLabelText(/Price Per Unit/i);

    fireEvent.change(qtyInput, { target: { name: 'quantity', value: '20' } });
    fireEvent.change(priceInput, { target: { name: 'price_per_unit', value: '50' } });

    // 20 * 50 = 1000 => ₹1,000.00
    expect(screen.getByText(/₹1,000.00/i)).toBeInTheDocument();
  });

  it('validates GST number format and shows error message for invalid GST', () => {
    render(
      <WholesaleSaleModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSale={vi.fn()}
        loading={false}
      />
    );

    const gstInput = screen.getByLabelText(/GST Number/i);
    fireEvent.change(gstInput, { target: { name: 'gst_number', value: 'INVALID_GST' } });

    expect(screen.getByText(/Invalid GST format/i)).toBeInTheDocument();
  });

  it('submits form with valid values and calls onSaveSale', async () => {
    const user = userEvent.setup();
    const handleSaveSale = vi.fn().mockResolvedValue(true);

    render(
      <WholesaleSaleModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSale={handleSaveSale}
        loading={false}
      />
    );

    fireEvent.change(screen.getByLabelText(/Medicine Name/i), { target: { name: 'medicine_name', value: 'Paracetamol 500mg' } });
    fireEvent.change(screen.getByLabelText(/Quantity Sold/i), { target: { name: 'quantity', value: '100' } });
    fireEvent.change(screen.getByLabelText(/Price Per Unit/i), { target: { name: 'price_per_unit', value: '15' } });
    fireEvent.change(screen.getByLabelText(/GST Number/i), { target: { name: 'gst_number', value: '29AAAAA0000A1Z5' } });
    fireEvent.change(screen.getByLabelText(/Shopkeeper \/ Pharmacy Buyer/i), { target: { name: 'shopkeeper_name', value: 'Kunal Pharmacy' } });

    const submitBtn = screen.getByRole('button', { name: /Save Sale/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSaveSale).toHaveBeenCalledWith(
        expect.objectContaining({
          medicine_name: 'Paracetamol 500mg',
          quantity: '100',
          price_per_unit: '15',
          gst_number: '29AAAAA0000A1Z5',
          shopkeeper_name: 'Kunal Pharmacy',
        })
      );
    });
  });

  it('blocks submission when GST is invalid', async () => {
    const handleSaveSale = vi.fn();

    render(
      <WholesaleSaleModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSale={handleSaveSale}
        loading={false}
      />
    );

    fireEvent.change(screen.getByLabelText(/Medicine Name/i), { target: { name: 'medicine_name', value: 'Amoxicillin' } });
    fireEvent.change(screen.getByLabelText(/Quantity Sold/i), { target: { name: 'quantity', value: '10' } });
    fireEvent.change(screen.getByLabelText(/Price Per Unit/i), { target: { name: 'price_per_unit', value: '20' } });
    fireEvent.change(screen.getByLabelText(/Shopkeeper \/ Pharmacy Buyer/i), { target: { name: 'shopkeeper_name', value: 'Test Shop' } });
    fireEvent.change(screen.getByLabelText(/GST Number/i), { target: { name: 'gst_number', value: 'BAD_GST_123' } });

    const submitBtn = screen.getByRole('button', { name: /Save Sale/i });
    fireEvent.click(submitBtn);

    expect(handleSaveSale).not.toHaveBeenCalled();
    expect(screen.getByText(/Please enter a valid 15-character Indian GST number/i)).toBeInTheDocument();
  });

  it('auto-fetches price per unit when a medicine is selected from inventory suggestions', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: [
        { id: 1, name: 'Paracetamol 500mg', mrp: 28.5, total_stock: 50 }
      ]
    });

    render(
      <WholesaleSaleModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSale={vi.fn()}
        loading={false}
      />
    );

    const medInput = screen.getByLabelText(/Medicine Name/i);
    fireEvent.change(medInput, { target: { name: 'medicine_name', value: 'Para' } });
    fireEvent.focus(medInput);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const opt = screen.getByRole('option');
    expect(opt).toHaveTextContent('Paracetamol 500mg');
    expect(opt).toHaveTextContent('₹28.50');

    fireEvent.mouseDown(opt);

    const priceInput = screen.getByLabelText(/Price Per Unit/i);
    expect(priceInput).toHaveValue(28.5);
    expect(screen.getByText(/Auto-fetched from stock entry/i)).toBeInTheDocument();
  });
});
