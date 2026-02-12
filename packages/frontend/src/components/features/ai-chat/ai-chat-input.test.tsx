import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiChatInput } from './ai-chat-input';

const defaultProps = {
  mode: 'chat' as const,
  isConnected: true,
  isAuthenticated: true,
  isRecording: false,
  onSendText: mock(() => {}),
  onStartVoice: mock(() => Promise.resolve()),
  onStopVoice: mock(() => {}),
};

describe('AiChatInput', () => {
  beforeEach(() => {
    defaultProps.onSendText = mock(() => {});
    defaultProps.onStartVoice = mock(() => Promise.resolve());
    defaultProps.onStopVoice = mock(() => {});
  });

  describe('chat mode', () => {
    it('disables input and send when not connected', () => {
      renderWithProviders(<AiChatInput {...defaultProps} isConnected={false} />);
      expect(screen.getByPlaceholderText('Connecting...')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    });

    it('calls onSendText and clears input on send', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiChatInput {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      expect(defaultProps.onSendText).toHaveBeenCalledWith('Hello');
      expect(textarea).toHaveValue('');
    });

    it('sends on Enter key', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiChatInput {...defaultProps} />);
      await user.type(screen.getByPlaceholderText('Type a message...'), 'Hello{Enter}');
      expect(defaultProps.onSendText).toHaveBeenCalledWith('Hello');
    });

    it('does not send on Shift+Enter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiChatInput {...defaultProps} />);
      await user.type(screen.getByPlaceholderText('Type a message...'), 'Hello{Shift>}{Enter}{/Shift}');
      expect(defaultProps.onSendText).not.toHaveBeenCalled();
    });

    it('does not send empty or whitespace-only text', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiChatInput {...defaultProps} />);
      await user.type(screen.getByPlaceholderText('Type a message...'), '   {Enter}');
      expect(defaultProps.onSendText).not.toHaveBeenCalled();
    });
  });

  describe('voice mode', () => {
    it('renders voice button instead of textarea', () => {
      renderWithProviders(<AiChatInput {...defaultProps} mode="voice" />);
      expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
    });

    it('calls onStartVoice when not recording', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiChatInput {...defaultProps} mode="voice" />);
      await user.click(screen.getByRole('button', { name: 'Start recording' }));
      expect(defaultProps.onStartVoice).toHaveBeenCalled();
    });

    it('calls onStopVoice when recording', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AiChatInput {...defaultProps} mode="voice" isRecording={true} />);
      await user.click(screen.getByRole('button', { name: 'Stop recording' }));
      expect(defaultProps.onStopVoice).toHaveBeenCalled();
    });
  });
});
