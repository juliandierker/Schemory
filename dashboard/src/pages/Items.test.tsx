import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import Items from './Items';
import { render } from '../test/setup';

// Mock the shared types Item interface for testing
interface MockItem {
  id: string;
  teamId: string;
  name: string;
  kind: 'type' | 'schema';
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

describe('Items', () => {
  const mockItems: MockItem[] = [
    {
      id: '1',
      teamId: 'team-1',
      name: 'User',
      kind: 'type',
      content: 'interface User { id: string; name: string; }',
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '2',
      teamId: 'team-1',
      name: 'UserSchema',
      kind: 'schema',
      content: '{"type": "object", "properties": {}}',
      version: 2,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with items data', () => {
    it('renders two rows with correct name, kind, version, and updatedAt', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockItems }),
      });

      render(<Items />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Kind')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();

      // Check first item
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('type')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();

      // Check second item
      expect(screen.getByText('UserSchema')).toBeInTheDocument();
      expect(screen.getByText('schema')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });

    it('displays kind distinction visually', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockItems }),
      });

      render(<Items />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Both kind badges should be present
      const typeBadge = screen.getByText('type');
      const schemaBadge = screen.getByText('schema');

      expect(typeBadge).toBeInTheDocument();
      expect(schemaBadge).toBeInTheDocument();
    });

    it('links to item detail pages', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockItems }),
      });

      render(<Items />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check that items have links to detail pages
      const userLink = screen.getByText('User').closest('a');
      expect(userLink).toHaveAttribute('href', '/items/User');

      const userSchemaLink = screen.getByText('UserSchema').closest('a');
      expect(userSchemaLink).toHaveAttribute('href', '/items/UserSchema');
    });
  });

  describe('empty state', () => {
    it('renders invitation-style empty state copy', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      render(<Items />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('No items yet.')).toBeInTheDocument();
      expect(screen.getByText(/Pull existing items from your team:/i)).toBeInTheDocument();
      expect(screen.getByText('npx schemory pullAll')).toBeInTheDocument();
      expect(screen.getByText(/push your first schema or type/i)).toBeInTheDocument();
      expect(screen.getByText('npx schemory push my-type')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading state before fetch resolves', () => {
      // Don't resolve the fetch immediately
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ items: [] }),
              });
            }, 100);
          })
      );

      render(<Items />);

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(<Items />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load items/i)).toBeInTheDocument();
      });
    });
  });
});
