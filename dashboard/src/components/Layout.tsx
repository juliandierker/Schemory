import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Headerbar from './Headerbar';
import Sidebar from './Sidebar';
import { MenuIcon, CloseIcon } from './icons';
import { CreateActionsContext } from '../context/CreateActionsContext';

interface LayoutProps {
  children: ReactNode;
  onCreateTeam?: () => void;
  onCreateFile?: () => void;
}

export default function Layout({ children, onCreateTeam, onCreateFile }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <CreateActionsContext.Provider value={{ onCreateTeam, onCreateFile }}>
      <div className="min-h-screen bg-surface">
        {/* Header */}
        <Headerbar />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isSidebarCollapsed} onNavigate={closeMobileSidebar} />
      </div>

      {/* Mobile Sidebar Overlay (full-screen modal) */}
      {isMobileSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar (slide-in modal) */}
      <div className={`lg:hidden fixed top-0 left-0 w-72 h-full bg-sidebar-bg border-r border-sidebar-border shadow-xl z-50 transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 border-b border-sidebar-border">
          <span className="font-display font-semibold text-sidebar-text">Menu</span>
          <button onClick={closeMobileSidebar} className="p-2 text-sidebar-text hover:bg-hover rounded-md">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
          <Sidebar isCollapsed={false} onNavigate={closeMobileSidebar} isMobile={true} />
        </div>
      </div>

      {/* Main content area with padding for fixed header and sidebar */}
      <main 
        className={`pt-16 transition-all duration-300 ${isMobileSidebarOpen ? 'lg:ml-0' : ''} ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
        style={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        {children}
      </main>

      {/* Mobile sidebar toggle button (hidden on desktop) */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary rounded-lg text-white"
      >
        <MenuIcon />
      </button>
    </div>
    </CreateActionsContext.Provider>
  );
}