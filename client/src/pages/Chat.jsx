// client/src/pages/Chat.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DMProvider } from '../context/DMContext';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatBox from '../components/Chat/ChatBox';
import DMList from '../components/Chat/DMList';
import DMChat from '../components/Chat/DMChat';

const Chat = () => {
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' or 'dm'
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <DMProvider>
      <div className="flex h-screen bg-dark overflow-hidden">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-72' : 'w-0'} 
                         transition-all duration-300 overflow-hidden shrink-0`}>
          <div className="h-full flex flex-col bg-darker border-r border-light">
            {/* Tabs */}
            <div className="flex border-b border-light">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`flex-1 py-3 text-sm font-medium transition
                  ${activeTab === 'rooms'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                🏠 Rooms
              </button>
              <button
                onClick={() => setActiveTab('dm')}
                className={`flex-1 py-3 text-sm font-medium transition
                  ${activeTab === 'dm'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                💬 Direct
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'rooms' ? (
                <Sidebar
                  activeRoom={activeRoom}
                  onRoomSelect={setActiveRoom}
                  onTabChange={setActiveTab}
                />
              ) : (
                <DMList />
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden absolute top-4 left-4 z-50 text-white bg-primary 
                       rounded-lg p-2"
          >
            {showSidebar ? '✕' : '☰'}
          </button>

          {activeTab === 'rooms' ? (
            <ChatBox room={activeRoom} />
          ) : (
            <DMChat />
          )}
        </div>
      </div>
    </DMProvider>
  );
};

export default Chat;