import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '../state/useUIStore';
import { ToastContainer } from '../components/feedback/Toast';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { SnyprAIChat } from '../components/chat/SnyprAIChat';
import { VoiceAssistant } from '../features/voice-assistant/components/VoiceAssistant';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      <Sidebar />

      {/* Main area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        }`}
      >
        <Topbar />
        <main className="flex-1 p-5 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <GlobalSearchModal />
      <VoiceAssistant />
      <SnyprAIChat />
      <ToastContainer />
    </div>
  );
};
