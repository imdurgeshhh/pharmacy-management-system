import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';
import useStore from '../../store/useStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@clerk/react', () => ({
  useClerk: () => ({
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('components/Header.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { id: 1, name: 'Kunal Sharma', role: 'admin' },
      token: 'jwt-123',
    });
  });

  const renderHeader = (props = {}) => {
    return render(
      <BrowserRouter>
        <Header toggleSidebar={vi.fn()} {...props} />
      </BrowserRouter>
    );
  };

  it('renders logged-in user name and role badge', () => {
    renderHeader();

    expect(screen.getByText('Kunal Sharma')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders employee badge with employee_id when user is an employee', () => {
    useStore.setState({
      user: { id: 2, name: 'Rahul Roy', role: 'employee', employee_id: 'EMP-902' },
      token: 'jwt-456',
    });

    renderHeader();

    expect(screen.getByText('Rahul Roy')).toBeInTheDocument();
    expect(screen.getByText('EMP-902')).toBeInTheDocument();
  });

  it('calls toggleSidebar when mobile menu button is clicked', () => {
    const handleToggle = vi.fn();
    renderHeader({ toggleSidebar: handleToggle });

    const menuBtn = screen.getByLabelText('Open sidebar menu');
    fireEvent.click(menuBtn);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('toggles dark mode class on document element when theme toggle is clicked', () => {
    renderHeader();

    const themeBtn = screen.getByLabelText(/Switch to (dark|light) mode/i);
    fireEvent.click(themeBtn);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('calls logout in useStore and navigates to /login when logout button is clicked', () => {
    const logoutSpy = vi.spyOn(useStore.getState(), 'logout');
    renderHeader();

    const logoutBtn = screen.getByLabelText('Log out');
    fireEvent.click(logoutBtn);

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('opens profile dropdown on click and displays Store Details option for admin', () => {
    renderHeader();

    const profileTrigger = screen.getByLabelText('User profile menu');
    fireEvent.click(profileTrigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText(/Store Details \/ Pharmacy Profile/i)).toBeInTheDocument();
  });

  it('does not display Store Details option when user is a shopkeeper or employee', () => {
    useStore.setState({
      user: { id: 3, name: 'Simran Kaur', role: 'shopkeeper' },
      token: 'jwt-789',
    });

    renderHeader();

    const profileTrigger = screen.getByLabelText('User profile menu');
    fireEvent.click(profileTrigger);

    expect(screen.queryByText(/Store Details \/ Pharmacy Profile/i)).not.toBeInTheDocument();
  });
});
