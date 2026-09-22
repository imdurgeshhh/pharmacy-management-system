import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedicinePicker from '../MedicinePicker';

describe('components/pos/MedicinePicker.jsx', () => {
  const mockInventory = [
    { id: 1, label: 'Paracetamol 500mg', mrp: 25.0, stock_qty: 100 },
    { id: 2, label: 'Paracetamol 650mg', mrp: 30.0, stock_qty: 30 },
    { id: 3, label: 'Amoxicillin 250mg', mrp: 40.0, stock_qty: 50 },
    { id: 4, label: 'Cetirizine 10mg', mrp: 0, stock_qty: 0 },
  ];

  it('renders input with placeholder and accessibility label', () => {
    render(
      <MedicinePicker
        value=""
        onChange={vi.fn()}
        onSelect={vi.fn()}
        inventory={mockInventory}
      />
    );

    const input = screen.getByLabelText('Medicine name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Medicine name…');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters inventory matches when user types search term', () => {
    render(
      <MedicinePicker
        value="para"
        onChange={vi.fn()}
        onSelect={vi.fn()}
        inventory={mockInventory}
      />
    );

    const input = screen.getByLabelText('Medicine name');
    fireEvent.focus(input);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // "para" matches Paracetamol and Pantoprazole
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Paracetamol 500mg');
    expect(options[0]).toHaveTextContent('₹25.00');
    expect(options[1]).toHaveTextContent('Paracetamol 650mg');
  });

  it('calls onSelect when an option is clicked and closes dropdown', () => {
    const handleSelect = vi.fn();
    render(
      <MedicinePicker
        value="Amox"
        onChange={vi.fn()}
        onSelect={handleSelect}
        inventory={mockInventory}
      />
    );

    const input = screen.getByLabelText('Medicine name');
    fireEvent.focus(input);

    const option = screen.getByRole('option', { name: /Amoxicillin 250mg/i });
    fireEvent.mouseDown(option);

    expect(handleSelect).toHaveBeenCalledWith(mockInventory[2]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown when Escape key is pressed', () => {
    render(
      <MedicinePicker
        value="para"
        onChange={vi.fn()}
        onSelect={vi.fn()}
        inventory={mockInventory}
      />
    );

    const input = screen.getByLabelText('Medicine name');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('handles item with zero MRP without crashing or rendering price tag', () => {
    render(
      <MedicinePicker
        value="Cetirizine"
        onChange={vi.fn()}
        onSelect={vi.fn()}
        inventory={mockInventory}
      />
    );

    const input = screen.getByLabelText('Medicine name');
    fireEvent.focus(input);

    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('Cetirizine 10mg');
    expect(option).not.toHaveTextContent('₹0.00');
  });

  it('supports keyboard navigation with ArrowDown, ArrowUp, and Enter', () => {
    const handleSelect = vi.fn();
    render(
      <MedicinePicker
        value="para"
        onChange={vi.fn()}
        onSelect={handleSelect}
        inventory={mockInventory}
      />
    );

    const input = screen.getByLabelText('Medicine name');
    fireEvent.focus(input);

    // Press ArrowDown to highlight the second option (Paracetamol 650mg)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(mockInventory[1]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
