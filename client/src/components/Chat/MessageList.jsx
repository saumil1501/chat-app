// client/src/components/Chat/MessageList.jsx
import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const MessageBubble = ({ message, isOwn, onEdit, onDelete }) => {
  return (
    <div className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isOwn && (
        <img
          src={message.sender?.avatar}
          alt={message.sender?.username}
          className="w-8 h-8 rounded-full object-cover shrink-0 mb-1"
        />
      )}

      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Username */}
        {!isOwn && (
          <span className="text-xs text-gray-400 mb-1 ml-1">
            {message.sender?.username}
          </span>
        )}

        <div className="flex items-end gap-2">
          {/* Action buttons (visible on hover) - for own messages */}
          {isOwn && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition mb-1">
              <button
                onClick={() => onEdit(message)}
                className="text-xs text-gray-400 hover:text-white bg-light 
                           rounded px-2 py-1 transition"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(message._id)}
                className="text-xs text-gray-400 hover:text-red-400 bg-light 
                           rounded px-2 py-1 transition"
              >
                🗑️
              </button>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isOwn
                ? 'bg-primary text-white rounded-br-none'
                : 'bg-light text-gray-100 rounded-bl-none'
            }`}
          >
            <p className="text-sm leading-relaxed break-words">{message.content}</p>
            <div className={`flex items-center gap-1 mt-1 
                            ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs opacity-60">{formatTime(message.createdAt)}</span>
              {message.isEdited && (
                <span className="text-xs opacity-50">(edited)</span>
              )}
              {isOwn && <span className="text-xs opacity-60">✓✓</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageList = ({ messages, onEditMessage, onDeleteMessage, loading }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent 
                          rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date}>
          {/* Date Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-light" />
            <span className="text-xs text-gray-400 bg-darker px-3 py-1 rounded-full">
              {date}
            </span>
            <div className="flex-1 h-px bg-light" />
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {msgs.map((message) => (
              <MessageBubble
                key={message._id}
                message={message}
                isOwn={message.sender?._id === user?._id ||
                       message.sender === user?._id}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
              />
            ))}
          </div>
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-400">No messages yet. Say hello!</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;