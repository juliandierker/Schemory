import { vi } from 'vitest';
import React from 'react';
import { render as tlRender, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

// Mock fetch globally for all tests
vi.stubGlobal('fetch', vi.fn());

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

// Custom render function
// @ts-ignore - type inference issue with testing-library
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function render(element: React.ReactElement): any {
  return tlRender(element, { wrapper: TestWrapper });
}

// Re-export commonly used functions
export { screen, waitFor };
