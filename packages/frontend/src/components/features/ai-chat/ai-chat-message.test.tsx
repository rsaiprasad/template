import { beforeEach, describe, expect, it } from 'bun:test';
import type { ChatMessage } from '@/stores/ai-chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { AiChatMessage } from './ai-chat-message';

const mockUser = {
  uid: 'u1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null as string | null,
  firstName: 'Test',
  lastName: 'User',
  permissions: ['ai:use'],
  isSuperAdmin: false,
};

const userMessage: ChatMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'Hello AI',
  timestamp: new Date('2025-01-15T10:30:00').getTime(),
};

const assistantMessage: ChatMessage = {
  id: 'msg-2',
  role: 'assistant',
  content: 'Hello! How can I help?',
  timestamp: new Date('2025-01-15T10:30:05').getTime(),
};

describe('AiChatMessage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('renders without error when user has photoURL', () => {
    // Radix AvatarImage requires image onload in a real browser;
    // happy-dom doesn't fire load events, so we verify no crash and
    // the Avatar wrapper still renders.
    useAuthStore.setState({
      user: { ...mockUser, photoURL: 'https://example.com/photo.jpg' },
    });
    const { container } = renderWithProviders(<AiChatMessage message={userMessage} />);
    expect(container.querySelector('span.relative')).not.toBeNull();
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
  });

  it('does not render img for assistant messages even when user has photoURL', () => {
    useAuthStore.setState({
      user: { ...mockUser, photoURL: 'https://example.com/photo.jpg' },
    });
    const { container } = renderWithProviders(<AiChatMessage message={assistantMessage} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders bold formatting in messages', () => {
    const boldMessage: ChatMessage = {
      id: 'msg-3',
      role: 'assistant',
      content: 'This is **bold** text',
      timestamp: Date.now(),
    };
    renderWithProviders(<AiChatMessage message={boldMessage} />);
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });

  it('renders tool call status indicators', () => {
    const toolMessage: ChatMessage = {
      id: 'msg-4',
      role: 'assistant',
      content: 'Let me check that.',
      timestamp: Date.now(),
      toolCalls: [
        { name: 'listUsers', status: 'done' },
        { name: 'getUser', status: 'calling' },
      ],
    };
    renderWithProviders(<AiChatMessage message={toolMessage} />);
    expect(screen.getByText('Looking up users')).toBeInTheDocument();
    expect(screen.getByText('Fetching user details...')).toBeInTheDocument();
  });
});
