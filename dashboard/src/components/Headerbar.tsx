import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HeaderbarProps {
  onCreateTeam?: () => void;
  onCreateFile?: () => void;
}

// Simple SVG icons for minimalistic design
const LogoIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 12C12 14.2091 10.2091 16 8 16C5.79086 16 4 14.2091 4 12C4 9.79086 5.79086 8 8 8C10.2091 8 12 9.79086 12 12Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2C12 2 14 4 16 6C18 8 20 10 20 12C20 14 18 16 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PlusIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SunIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 20V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M22 12L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M2 12L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19.07 4.93L17.65 6.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6.35 17.65L4.93 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19.07 19.07L17.65 17.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6.35 6.35L4.93 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MoonIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79C21 17.44 17.44 21 12.79 21C8.14 21 4.56 17.44 4.56 12.79C4.56 8.14 8.14 4.56 12.79 4.56C15.86 4.56 18.44 6.14 19.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronDownIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Headerbar({ onCreateTeam, onCreateFile }: HeaderbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { logout, sessionToken } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user initials for avatar (placeholder)
  const getUserInitial = () => {
    // Extract user info from session token or use placeholder
    if (sessionToken) {
      // Simple hash-based initial for demo purposes
      const hash = sessionToken.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return letters[hash % letters.length];
    }
    return 'U';
  };

  const handleCreateTeam = () => {
    onCreateTeam?.();
    setIsDropdownOpen(false);
  };

  const handleCreateFile = () => {
    onCreateFile?.();
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-header-bg border-b border-header-border h-16">
      <div className="max-w-full mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center bg-primary rounded-lg">
            <LogoIcon className="text-white" />
          </div>
          <span className="text-xl font-display font-bold text-text">Schemory</span>
        </div>

        {/* Right side: Theme toggle, Create dropdown, User menu */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-hover transition-colors text-text-secondary hover:text-text"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          {/* Create dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 rounded-full hover:bg-hover transition-colors text-text-secondary hover:text-text flex items-center space-x-1"
              aria-label="Create new"
              aria-expanded={isDropdownOpen}
            >
              <PlusIcon />
              <span className="text-sm font-medium">Create</span>
              <ChevronDownIcon />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={handleCreateTeam}
                  className="w-full px-4 py-2 text-left text-text hover:bg-hover transition-colors flex items-center space-x-2 text-sm"
                >
                  <PlusIcon />
                  <span>Create Team</span>
                </button>
                <button
                  onClick={handleCreateFile}
                  className="w-full px-4 py-2 text-left text-text hover:bg-hover transition-colors flex items-center space-x-2 text-sm"
                >
                  <PlusIcon />
                  <span>Create File</span>
                </button>
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-display font-medium text-sm hover:brightness-110 transition-all"
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              {getUserInitial()}
            </button>

            {/* User dropdown menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 text-sm">
                  <div className="font-medium text-text">User</div>
                  <div className="text-text-secondary text-xs">
                    {sessionToken ? `${sessionToken.slice(0, 8)}...` : 'Not logged in'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-error hover:bg-hover transition-colors flex items-center space-x-2 text-sm mt-2"
                >
                  <LogoutIcon />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}