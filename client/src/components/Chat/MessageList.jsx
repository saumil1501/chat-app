// client/src/components/Chat/MessageList.jsx
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../context/AuthContext';
import ThreadModal from './ThreadModal';
import toast from 'react-hot-toast';

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

const getFileType = (url) => {
  const ext = url.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'webm'].includes(ext)) return 'video';
  return 'file';
};

const MessageBubble = ({ message, isOwn, onEdit, onDelete, roomId }) => {
  const [showThread, setShowThread] = useState(false);
  const isFile = message.content.includes('[') && message.content.includes('](');

  return (
    <>
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
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(message._id)}
                  className="text-xs text-gray-400 hover:text-red-400 bg-light 
                             rounded px-2 py-1 transition"
                  title="Delete"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setShowThread(true)}
                  className="text-xs text-gray-400 hover:text-white bg-light 
                             rounded px-2 py-1 transition"
                  title="Reply in thread"
                >
                  💬
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
              {/* File or Text Message */}
              {isFile ? (
                // Render file preview
                (() => {
                  const match = message.content.match(/\[(.+?)\]\((.+?)\)/);
                  if (!match) return <p className="text-sm">{message.content}</p>;

                  const [_, fileName, fileUrl] = match;
                  const fileType = getFileType(fileUrl);

                  return (
                    <div>
                      {fileType === 'image' && (
                        <img
                          src={fileUrl}
                          alt={fileName}
                          className="rounded-lg max-w-xs max-h-64 mb-2 cursor-pointer hover:opacity-80"
                          onClick={() => window.open(fileUrl, '_blank')}
                        />
                      )}
                      {fileType === 'video' && (
                        <video
                          src={fileUrl}
                          controls
                          className="rounded-lg max-w-xs max-h-64 mb-2"
                        />
                      )}
                      {fileType === 'file' && (
                        <a
                          href={fileUrl}
                          download={fileName}
                          className="flex items-center gap-2 text-primary hover:text-secondary transition"
                        >
                          <span>📥</span>
                          <span className="underline text-sm">{fileName}</span>
                        </a>
                      )}
                    </div>
                  );
                })()
              ) : (
                // Render text message
                <p className="text-sm leading-relaxed break-words">{message.content}</p>
              )}

              {/* Timestamp and status */}
              <div
                className={`flex items-center gap-1 mt-1 
                            ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <span className="text-xs opacity-60">{formatTime(message.createdAt)}</span>
                {message.isEdited && (
                  <span className="text-xs opacity-50">(edited)</span>
                )}
                {isOwn && <span className="text-xs opacity-60">✓✓</span>}
              </div>
            </div>
          </div>

          {/* Thread count button (shown if there are replies) */}
          {message.threadCount > 0 && (
            <button
              onClick={() => setShowThread(true)}
              className="mt-1 text-xs text-primary hover:text-secondary transition ml-1"
            >
              💬 {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Thread Modal - only show if roomId is defined */}
      {roomId && (
        <ThreadModal
          messageId={message._id}
          isOpen={showThread}
          onClose={() => setShowThread(false)}
          roomId={roomId}
        />
      )}
    </>
  );
};

const MessageList = ({ messages, onEditMessage, onDeleteMessage, loading, roomId }) => {
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
                isOwn={
                  message.sender?._id === user?._id ||
                  message.sender === user?._id
                }
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                roomId={roomId}          // ✅ Important: pass roomId
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