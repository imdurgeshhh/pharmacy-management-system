import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StoreSettingsModal from '../StoreSettingsModal';
import useStore from '../../store/useStore';
import api from '../../config/axios';

vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('components/StoreSettingsModal.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { id: 1, name: 'Admin User', role: 'admin' },
    });
  });

  it('renders nothing if user is not admin', () => {
    useStore.setState({
      user: { id: 2, name: 'Shopkeeper User', role: 'shopkeeper' },
    });

    const { container } = render(
      <StoreSettingsModal isOpen={true} onClose={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches store settings and pre-fills form fields on open', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        shop_name: 'City Care Chemist',
        address: '45 Ring Road, Raipur',
        phone: '9876543210',
        email: 'care@citychemist.in',
        dl_no: 'DL-20B-12345',
        gstin: '22AAAAA0000A1Z5',
        pharmacist_name: 'Kavita Verma',
        pharmacist_reg_no: 'CG-PH-5544',
      },
    });

    render(<StoreSettingsModal isOpen={true} onClose={vi.fn()} />);

    expect(api.get).toHaveBeenCalledWith('/store');

    await waitFor(() => {
      expect(screen.getByDisplayValue('City Care Chemist')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45 Ring Road, Raipur')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
      expect(screen.getByDisplayValue('DL-20B-12345')).toBeInTheDocument();
      expect(screen.getByDisplayValue('22AAAAA0000A1Z5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Kavita Verma')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CG-PH-5544')).toBeInTheDocument();
    });
  });

  it('validates required fields before submitting', async () => {
    api.get.mockResolvedValueOnce({ data: {} });

    render(<StoreSettingsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Save Store Details/i)).toBeInTheDocument();
    });

    const saveBtn = screen.getByText(/Save Store Details/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pharmacy \/ Store Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Complete Address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile \/ Phone Number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Drug Licence Number is required/i)).toBeInTheDocument();
    });

    expect(api.put).not.toHaveBeenCalled();
  });

  it('validates 10-digit mobile number format', async () => {
    api.get.mockResolvedValueOnce({ data: {} });

    render(<StoreSettingsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. Apex Health/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Apex Health/i), {
      target: { value: 'Apex Meds' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Shop No, Building/i), {
      target: { value: 'Main Road' },
    });
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile/i), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 20B\/21B/i), {
      target: { value: 'DL-999' },
    });

    fireEvent.click(screen.getByText(/Save Store Details/i));

    await waitFor(() => {
      expect(screen.getByText(/Mobile must be a valid 10-digit number/i)).toBeInTheDocument();
    });

    expect(api.put).not.toHaveBeenCalled();
  });

  it('submits valid data to PUT /store and displays success message', async () => {
    api.get.mockResolvedValueOnce({ data: {} });
    api.put.mockResolvedValueOnce({
      data: {
        shop_name: 'Apex Pharma',
        address: 'Sector 5, Raipur',
        phone: '9988776655',
        dl_no: 'DL-777',
      },
    });

    const handleSaved = vi.fn();
    render(<StoreSettingsModal isOpen={true} onClose={vi.fn()} onSaved={handleSaved} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. Apex Health/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Apex Health/i), {
      target: { value: 'Apex Pharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Shop No, Building/i), {
      target: { value: 'Sector 5, Raipur' },
    });
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile/i), {
      target: { value: '9988776655' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 20B\/21B/i), {
      target: { value: 'DL-777' },
    });

    fireEvent.click(screen.getByText(/Save Store Details/i));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/store', expect.objectContaining({
        shop_name: 'Apex Pharma',
        address: 'Sector 5, Raipur',
        phone: '9988776655',
        dl_no: 'DL-777',
      }));
      expect(screen.getByText(/Store & Pharmacy details saved successfully!/i)).toBeInTheDocument();
      expect(handleSaved).toHaveBeenCalled();
    });
  });
});
