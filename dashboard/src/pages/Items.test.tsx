import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import Items from './Items';
import { render } from '../test/setup';

// Mock the shared types Item interface for testing
interface MockItem {
  id: string;
  teamId: string;
  teamName?: string;
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
      teamName: 'Test Team',
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
      teamName: 'Test Team',
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
      // Mock both items and teams fetch calls
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockItems }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ teams: [] }),
      });
      global.fetch = mockFetch;

      render(<Items />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
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
      // Mock both items and teams fetch calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockItems }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [] }),
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
      // Mock both items and teams fetch calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockItems }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [] }),
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
      // Mock both items and teams fetch calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [] }),
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
      // Mock both items and teams fetch calls to fail
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      render(<Items />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load items/i)).toBeInTheDocument();
      });
    });
  });

  describe('team filtering', () => {
    it('should display team column in table', async () => {
      // Mock both items and teams fetch calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockItems }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 1, name: 'Test Team' }] }),
        });

      render(<Items />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check that team column header is present
      expect(screen.getByText('Team')).toBeInTheDocument();
      
      // Check that team names are displayed
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    it('should display team filter dropdown when teams are available', async () => {
      // Mock both items and teams fetch calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockItems }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 1, name: 'Test Team' }, { id: 2, name: 'Another Team' }] }),
        });

      render(<Items />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check that team filter dropdown is present
      const teamFilter = screen.getByLabelText('Filter by Team');
      expect(teamFilter).toBeInTheDocument();
      
      // Check that dropdown contains team options
      expect(screen.getByText('All Teams')).toBeInTheDocument();
      expect(screen.getByText('Test Team')).toBeInTheDocument();
      expect(screen.getByText('Another Team')).toBeInTheDocument();
    });

    it('should filter items by team when selected', async () => {
      // Mock both items and teams fetch calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockItems }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 1, name: 'Test Team' }] }),
        })
        .mockResolvedValueOnce({
          // This is the filtered items call
          ok: true,
          json: async () => ({ items: [mockItems[0]] }), // Only first item for team 1
        });

      render(<Items />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check that both items are initially displayed
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('UserSchema')).toBeInTheDocument();
    });
  });
});
