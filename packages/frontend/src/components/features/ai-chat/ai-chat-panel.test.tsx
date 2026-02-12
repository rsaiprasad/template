import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { useAiChatStore } from '@/stores/ai-chat-store';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock useAiChat hook to avoid WebSocket connections
const mockUseAiChat = {
  isConnected: true,
  isAuthenticated: true,
  connect: mock(() => {}),
  disconnect: mock(() => {}),
  sendText: mock(() => {}),
  cancel: mock(() => {}),
  startVoice: mock(() => Promise.resolve()),
  stopVoice: mock(() => {}),
  isRecording: false,
};

mock.module('@/hooks/use-ai-chat', () => ({
  useAiChat: () => mockUseAiChat,
  default: () => mockUseAiChat,
}));

// Import after mocking
const { AiChatPanel } = await import('./ai-chat-panel');

describe('AiChatPanel', () => {
  beforeEach(() => {
    useAiChatStore.setState({
      isOpen: true,
      isConnected: true,
      isAuthenticated: true,
      messages: [],
      aiStatus: 'idle',
      error: null,
      streamingContent: '',
    });
    mockUseAiChat.connect = mock(() => {});
    mockUseAiChat.cancel = mock(() => {});
  });

  it('closes panel when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiChatPanel mode="chat" />);
    await user.click(screen.getByRole('button', { name: 'Close AI Assistant' }));
    expect(useAiChatStore.getState().isOpen).toBe(false);
  });

  it('shows empty state message when connected with no messages', () => {
    renderWithProviders(<AiChatPanel mode="chat" />);
    expect(screen.getByText('Ask me anything about this dashboard.')).toBeInTheDocument();
  });

  it('shows "Connecting..." when not connected', () => {
    useAiChatStore.setState({ isConnected: false });
    renderWithProviders(<AiChatPanel mode="chat" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows error banner when error is set', () => {
    useAiChatStore.setState({ error: 'Connection failed' });
    renderWithProviders(<AiChatPanel mode="chat" />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders messages from store', () => {
    useAiChatStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ],
    });
    renderWithProviders(<AiChatPanel mode="chat" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('calls cancel when cancel button is clicked during thinking', async () => {
    useAiChatStore.setState({ aiStatus: 'thinking' });
    const user = userEvent.setup();
    renderWithProviders(<AiChatPanel mode="chat" />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockUseAiChat.cancel).toHaveBeenCalled();
  });

  it('shows Voice badge in voice mode', () => {
    renderWithProviders(<AiChatPanel mode="voice" />);
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });
});
