// client/src/context/DMContext.jsx
import { createContext, useContext, useState } from 'react';

const DMContext = createContext();

export const DMProvider = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [dmConversations, setDmConversations] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);

  return (
    <DMContext.Provider value={{
      selectedUser,
      setSelectedUser,
      dmConversations,
      setDmConversations,
      dmMessages,
      setDmMessages,
    }}>
      {children}
    </DMContext.Provider>
  );
};

export const useDM = () => {
  const context = useContext(DMContext);
  if (!context) throw new Error('useDM must be used within DMProvider');
  return context;
};