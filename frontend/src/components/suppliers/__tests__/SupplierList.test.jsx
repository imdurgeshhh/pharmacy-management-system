import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SupplierList from '../SupplierList';
import useStore from '../../../store/useStore';
import api from '../../../config/axios';

describe('components/suppliers/SupplierList.jsx', () => {
  beforeEach(() => {
    useStore.setState({
      user: { id: 1, role: 'admin' },
      token: 'valid-token',
    });
  });

  it('fetches and renders suppliers list from API', async () => {
    render(<SupplierList />);

    await waitFor(() => {
      expect(screen.getByText('Apex Pharma Distributors')).toBeInTheDocument();
      expect(screen.getByText('MediSupply Global')).toBeInTheDocument();
    });

    expect(screen.getByText('Rajesh Sharma')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
  });

  it('filters suppliers in the table based on search input', async () => {
    const user = userEvent.setup();
    render(<SupplierList />);

    await waitFor(() => {
      expect(screen.getByText('Apex Pharma Distributors')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search suppliers/i);
    await user.type(searchInput, 'MediSupply');

    expect(screen.getByText('MediSupply Global')).toBeInTheDocument();
    expect(screen.queryByText('Apex Pharma Distributors')).not.toBeInTheDocument();
  });

  it('opens add supplier modal when "Add Supplier" button is clicked', async () => {
    render(<SupplierList />);

    await waitFor(() => {
      expect(screen.getByText('Apex Pharma Distributors')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Add Supplier/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Supplier')).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Person/i)).toBeInTheDocument();
  });

  it('shows empty state when no suppliers are returned from API', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] });

    render(<SupplierList />);

    await waitFor(() => {
      expect(screen.getByText(/No suppliers registered/i)).toBeInTheDocument();
    });
  });
});
