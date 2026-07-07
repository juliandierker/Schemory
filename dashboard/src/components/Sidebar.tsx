import { NavLink } from 'react-router-dom';
import {
  TeamsIcon,
  TerminalIcon,
  FilesIcon
} from './icons';

// Navigation items
const navItems = [
  { path: '/', label: 'Teams', icon: TeamsIcon },
  { path: '/items', label: 'Files', icon: FilesIcon },
  { path: '/cli', label: 'CLI', icon: TerminalIcon },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ isCollapsed = false, onNavigate, isMobile = false }: SidebarProps) {
  if (isMobile) {
    // Mobile version - just navigation content
    return (
      <nav className="h-full">
        <ul className="space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                onClick={onNavigate}
                className={({ isActive }: { isActive: boolean }) => `
                  flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary text-white' 
                    : 'text-sidebar-text hover:text-sidebar-text-active hover:bg-hover'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // Desktop version
  return (
    <aside className={`fixed left-0 top-16 bottom-0 bg-sidebar-bg border-r border-sidebar-border z-40 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <nav className="h-full p-4">
        <ul className="space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                onClick={onNavigate}
                className={({ isActive }: { isActive: boolean }) => `
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary text-white' 
                    : 'text-sidebar-text hover:text-sidebar-text-active hover:bg-hover'}
                `}
              >
                <Icon className="w-5 h-5" />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        
        {/* Footer for desktop sidebar */}
        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border bg-sidebar-bg">
            <div className="text-xs text-sidebar-text text-opacity-70">
              Schemory v0.1.0
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}