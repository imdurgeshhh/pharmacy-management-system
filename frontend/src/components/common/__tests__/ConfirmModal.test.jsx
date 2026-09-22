import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../ConfirmModal';

describe('components/common/ConfirmModal.jsx', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmModal isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders alertdialog with title, message, and custom button labels', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Medicine"
        message="Are you sure you want to remove this item permanently?"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Delete Medicine')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to remove this item permanently?')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmModal isOpen={true} onConfirm={handleConfirm} onCancel={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmModal isOpen={true} onConfirm={vi.fn()} onCancel={handleCancel} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmModal isOpen={true} onConfirm={vi.fn()} onCancel={handleCancel} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows "Processing…" when loading is true', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        loading={true}
        confirmLabel="Delete"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Processing…' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('renders different variant styles without error (warning, primary)', () => {
    const { rerender } = render(
      <ConfirmModal isOpen={true} variant="warning" title="Warning Modal" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Warning Modal')).toBeInTheDocument();

    rerender(
      <ConfirmModal isOpen={true} variant="primary" title="Primary Modal" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Primary Modal')).toBeInTheDocument();
  });
});
