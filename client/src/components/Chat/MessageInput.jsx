// client/src/components/Chat/MessageInput.jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import FileUpload from './FileUpload';


const MessageInput = ({ roomId, onSendMessage, editingMessage, onCancelEdit }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { socket } = useSocket();

  const handleFileUpload = (file) => {
    // Create a file message
    const fileMessage = `📎 [${file.fileName}](${file.url})`;
    onSendMessage(fileMessage);
  };

  

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTyping = useCallback(() => {
    if (!socket || !roomId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { roomId });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', { roomId });
    }, 1500);
  }, [socket, roomId, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSendMessage(message.trim());
    setMessage('');

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socket?.emit('typing:stop', { roomId });
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape' && editingMessage) {
      onCancelEdit();
      setMessage('');
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="p-4 border-t border-light">
      {/* Edit mode indicator */}
      {editingMessage && (
        <div className="text-sm text-yellow-500 mb-2">
          Editing message...
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        {/* Emoji button */}
        <button
          type="button"
          className="text-2xl text-gray-400 hover:text-white transition shrink-0 mb-1"
        >
          😊
        </button>

        {/* File Upload */}
        <FileUpload onFileUpload={handleFileUpload} roomId={roomId} />

        {/* Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={roomId ? "Type a message... (Enter to send)" : "Select a room"}
            disabled={!roomId}
            rows={1}
            className="w-full bg-light border border-gray-600 rounded-xl px-4 py-3 
                       text-white placeholder-gray-500 focus:outline-none 
                       focus:border-primary resize-none transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || !roomId}
          className="bg-primary hover:bg-secondary text-white rounded-xl p-3 
                     transition disabled:opacity-50 disabled:cursor-not-allowed
                     shrink-0 flex items-center justify-center"
        >
          <svg className="w-5 h-5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>

      <p className="text-xs text-gray-500 mt-2 ml-12">
        Press <kbd className="bg-light px-1 rounded">Enter</kbd> to send
      </p>
    </div>
  );
};

export default MessageInput;