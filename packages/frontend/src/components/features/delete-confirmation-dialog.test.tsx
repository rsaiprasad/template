import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';

describe('DeleteConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: mock(() => {}),
    title: 'Delete User',
    description: 'Are you sure you want to delete this user?',
    confirmLabel: 'Delete',
    isDeleting: false,
    onConfirm: mock(() => {}),
  };

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = mock(() => {});
    render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = mock(() => {});
    render(<DeleteConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when closed', () => {
    render(<DeleteConfirmationDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete User')).toBeNull();
  });
});
