import React, { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children?: ReactNode;
  teamId?: string;
  teamName?: string;
  onCreateTeam?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, teamId, teamName, onCreateTeam }) => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header onCreateTeam={onCreateTeam} />

      <div className="flex">
        {/* Sidebar - only show when in a team context */}
        {teamId && teamName && (
          <Sidebar teamId={teamId} teamName={teamName} />
        )}

        {/* Main content */}
        <main className={`flex-1 ${teamId ? 'ml-0 lg:ml-64' : ''}`}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
