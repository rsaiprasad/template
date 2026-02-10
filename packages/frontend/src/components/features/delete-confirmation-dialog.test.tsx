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

  it('renders title and description when open', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Delete User')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this user?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

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
