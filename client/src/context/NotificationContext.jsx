// client/src/context/NotificationContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { socket } = useSocket();

  const addNotification = useCallback((notification) => {
    const id = Math.random();
    setNotifications((prev) => [...prev, { ...notification, id }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  // Socket listener for mentions
  const handleMentioned = (data) => {
    addNotification({
      type: 'mention',
      title: `${data.mentionedBy} mentioned you`,
      message: data.content,
      icon: '🔔',
    });
  };

  useEffect(() => {
    if (socket) {
      socket.on('notification:mentioned', handleMentioned);
      return () => socket.off('notification:mentioned', handleMentioned);
    }
  }, [socket]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};