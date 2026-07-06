import { ReactNode, useState } from 'react';
import Headerbar from './Headerbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  onCreateTeam?: () => void;
  onCreateFile?: () => void;
}

export default function Layout({ children, onCreateTeam, onCreateFile }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <Headerbar onCreateTeam={onCreateTeam} onCreateFile={onCreateFile} />

      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} />

      {/* Main content area with padding for fixed header and sidebar */}
      <main 
        className={`pt-16 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}
        style={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        {children}
      </main>

      {/* Mobile sidebar toggle button (hidden on desktop) */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary rounded-lg text-white"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {isSidebarCollapsed ? (
            <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          )}
          <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}