import React, { useContext, useState } from 'react'
import Sidebar from '../components/Sidebar';
import ChatContainer from '../components/ChatContainer';
import RightSidebar from '../components/RightSidebar';
import { ChatContext } from '../context/ChatContext';
import ErrorBoundary from '../components/ErrorBoundary';
import ChangelogPanel from '../components/ChangelogPanel'; // MODIFIED: Import ChangelogPanel

function HomePage() {
  const { selectedUser } = useContext(ChatContext);
  const [showChangelog, setShowChangelog] = useState(false); // MODIFIED: State for changelog visibility

  return (
    <div className='border w-full h-screen sm:px-[15%] sm:py-[5%]'>
      <div className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl overflow-hidden h-[100%] grid grid-cols-1 relative ${selectedUser ? 'md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]' : 'md:grid-cols-2'}`}>
        <ErrorBoundary>
          <Sidebar onShowChangelog={() => setShowChangelog(true)} /> {/* MODIFIED: Pass callback */}
        </ErrorBoundary>
        <ErrorBoundary>
          <ChatContainer />
        </ErrorBoundary>
        <ErrorBoundary>
          <RightSidebar />
        </ErrorBoundary>
      </div>

      {/* MODIFIED: Add Changelog Panel */}
      <ChangelogPanel
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </div>
  )
}

export default HomePage;