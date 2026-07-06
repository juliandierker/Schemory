// Centralized icon components using lucide-react
// This replaces the inline SVG icons for better maintainability and consistency

import {
  LayoutDashboard,
  Users,
  Terminal,
  Book,
  FileText,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Navigation icons
export const DashboardIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <LayoutDashboard className={className} size={size} />
);

export const TeamsIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <Users className={className} size={size} />
);

export const TerminalIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <Terminal className={className} size={size} />
);

export const BookIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <Book className={className} size={size} />
);

export const FilesIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <FileText className={className} size={size} />
);

// Header icons
export const LogoIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <LayoutDashboard className={className} size={size} />
);

export const UserIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <Users className={className} size={size} />
);

export const PlusIcon = ({ className = 'w-4 h-4', size }: IconProps) => (
  <Plus className={className} size={size} />
);

export const SunIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <Sun className={className} size={size} />
);

export const MoonIcon = ({ className = 'w-5 h-5', size }: IconProps) => (
  <Moon className={className} size={size} />
);

export const ChevronDownIcon = ({ className = 'w-4 h-4', size }: IconProps) => (
  <ChevronDown className={className} size={size} />
);

export const LogoutIcon = ({ className = 'w-4 h-4', size }: IconProps) => (
  <LogOut className={className} size={size} />
);

// Layout icons
export const MenuIcon = ({ className = 'w-6 h-6', size }: IconProps) => (
  <Menu className={className} size={size} />
);

export const CloseIcon = ({ className = 'w-6 h-6', size }: IconProps) => (
  <X className={className} size={size} />
);

// Additional icons for potential future use
export const CodeIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 18L22 12L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const JsonIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 6L22 12L16 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const TypeScriptIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);