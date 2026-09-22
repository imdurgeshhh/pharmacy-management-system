import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';
import useStore from '../../store/useStore';

describe('components/Sidebar.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSidebar = (isOpen = false, setIsOpen = vi.fn(), initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      </MemoryRouter>
    );
  };

  it('renders base navigation links for shopkeeper / employee without admin links', () => {
    useStore.setState({
      user: { id: 2, role: 'shopkeeper' },
      token: 'jwt',
    });

    renderSidebar();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Billing / POS' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Purchases' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suppliers' })).toBeInTheDocument();

    // Admin-only links must NOT appear
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Employees' })).not.toBeInTheDocument();
  });

  it('renders admin-only links (Reports, Employees) when user role is admin', () => {
    useStore.setState({
      user: { id: 1, role: 'admin' },
      token: 'jwt',
    });

    renderSidebar();

    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Employees' })).toBeInTheDocument();
  });

  it('calls setIsOpen(false) when mobile close button is clicked', () => {
    const handleSetIsOpen = vi.fn();
    renderSidebar(true, handleSetIsOpen);

    const closeBtn = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeBtn);

    expect(handleSetIsOpen).toHaveBeenCalledWith(false);
  });

  it('calls setIsOpen(false) on Escape key when sidebar is open', () => {
    const handleSetIsOpen = vi.fn();
    renderSidebar(true, handleSetIsOpen);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleSetIsOpen).toHaveBeenCalledWith(false);
  });
});
