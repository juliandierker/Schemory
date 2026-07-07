import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import logoLightUrl from '../assets/logo-full.svg';
import logoDarkUrl from '../assets/logo-full-dark.svg';
import {
  PlusIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  LogoutIcon
} from './icons';

interface HeaderbarProps {
  onCreateTeam?: () => void;
  onCreateFile?: () => void;
}

export default function Headerbar({ onCreateTeam, onCreateFile }: HeaderbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { logout, sessionToken, user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  // Get user initials for avatar
  const getUserInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    if (sessionToken) {
      // Fallback: use first character after sk_ prefix
      const cleanToken = sessionToken.startsWith('sk_') ? sessionToken.slice(3) : sessionToken;
      return cleanToken.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleNavigateToCli = () => {
    navigate('/cli');
    setIsUserMenuOpen(false);
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
        <div className="flex items-center">
          <img
            src={theme === 'dark' ? logoDarkUrl : logoLightUrl}
            alt="Schemory"
            className="h-8 w-auto"
          />
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
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface-elevated border border-border rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={handleNavigateToCli}
                  className="w-full px-4 py-2 text-left hover:bg-hover transition-colors text-sm"
                >
                  <div className="font-medium text-text">{user?.email || 'User'}</div>
                  <div className="text-text-secondary text-xs">Click to view CLI commands</div>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-error hover:bg-hover transition-colors flex items-center space-x-2 text-sm mt-2 border-t border-border pt-2"
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