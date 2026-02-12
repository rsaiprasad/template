import { beforeEach, describe, expect, it } from 'bun:test';
import { useAiChatStore } from '@/stores/ai-chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiChatWidget } from './ai-chat-widget';

const mockUser = {
  uid: 'u1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  firstName: 'Test',
  lastName: 'User',
  permissions: ['ai:use'],
  isSuperAdmin: false,
};

describe('AiChatWidget', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    useAiChatStore.getState().reset();
  });

  it('renders nothing when user lacks ai:use permission', () => {
    useAuthStore.setState({
      user: { ...mockUser, permissions: [], isSuperAdmin: false },
    });
    const { container } = renderWithProviders(<AiChatWidget />);
    expect(container.innerHTML).toBe('');
  });

  it('renders FAB button when user is super admin without ai:use', () => {
    useAuthStore.setState({
      user: { ...mockUser, permissions: [], isSuperAdmin: true },
    });
    renderWithProviders(<AiChatWidget />);
    expect(screen.getByRole('button', { name: 'Open AI Assistant' })).toBeInTheDocument();
  });

  it('calls toggleOpen when FAB is clicked', async () => {
    renderWithProviders(<AiChatWidget />);
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Open AI Assistant' });
    await user.click(button);
    expect(useAiChatStore.getState().isOpen).toBe(true);
  });
});
