// client/src/pages/Chat.jsx
import { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatBox from '../components/Chat/ChatBox';

const Chat = () => {
  const [activeRoom, setActiveRoom] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-72' : 'w-0'} 
                       transition-all duration-300 overflow-hidden shrink-0`}>
        <Sidebar
          activeRoom={activeRoom}
          onRoomSelect={setActiveRoom}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="md:hidden absolute top-4 left-4 z-50 text-white bg-primary 
                     rounded-lg p-2"
        >
          {showSidebar ? '✕' : '☰'}
        </button>

        <ChatBox room={activeRoom} />
      </div>
    </div>
  );
};

export default Chat;