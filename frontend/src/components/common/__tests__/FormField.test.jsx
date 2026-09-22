import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormField from '../FormField';

describe('components/common/FormField.jsx', () => {
  it('renders standard text input with label and placeholder', () => {
    render(
      <FormField
        label="Medicine Name"
        name="medicine_name"
        value="Aspirin"
        onChange={vi.fn()}
        placeholder="Enter name"
        required
      />
    );

    expect(screen.getByLabelText(/Medicine Name/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Enter name');
    expect(input).toHaveValue('Aspirin');
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByText('*')).toBeInTheDocument(); // required indicator
  });

  it('triggers onChange when typing into controlled input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <FormField
        label="Batch Number"
        name="batch"
        value=""
        onChange={handleChange}
        placeholder="Batch..."
      />
    );

    const input = screen.getByPlaceholderText('Batch...');
    await user.type(input, 'B');

    expect(handleChange).toHaveBeenCalled();
  });

  it('renders error message with alert role and sets aria-invalid', () => {
    render(
      <FormField
        label="Stock Quantity"
        name="qty"
        value="-5"
        onChange={vi.fn()}
        error="Quantity cannot be negative"
      />
    );

    const input = screen.getByLabelText(/Stock Quantity/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Quantity cannot be negative');
  });

  it('renders hint text when no error is present', () => {
    render(
      <FormField
        label="GSTIN"
        name="gst"
        value=""
        onChange={vi.fn()}
        hint="15-character alphanumeric GST ID"
      />
    );

    expect(screen.getByText('15-character alphanumeric GST ID')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles password type with visibility toggle button', async () => {
    const user = userEvent.setup();

    render(
      <FormField
        label="Password"
        type="password"
        name="password"
        value="Secret123!"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText('Show password');
    await user.click(toggleBtn);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Hide password'));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders as textarea when as="textarea"', () => {
    render(
      <FormField
        as="textarea"
        label="Address"
        name="address"
        value="123 Health Street"
        onChange={vi.fn()}
        rows={4}
      />
    );

    const textarea = screen.getByLabelText(/Address/i);
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea).toHaveValue('123 Health Street');
    expect(textarea).toHaveAttribute('rows', '4');
  });

  it('renders as select dropdown with options when as="select"', () => {
    render(
      <FormField as="select" label="Category" name="category" value="tablet" onChange={vi.fn()}>
        <option value="tablet">Tablet</option>
        <option value="syrup">Syrup</option>
        <option value="injection">Injection</option>
      </FormField>
    );

    const select = screen.getByLabelText(/Category/i);
    expect(select.tagName.toLowerCase()).toBe('select');
    expect(select).toHaveValue('tablet');
    expect(screen.getByRole('option', { name: 'Syrup' })).toBeInTheDocument();
  });
});
