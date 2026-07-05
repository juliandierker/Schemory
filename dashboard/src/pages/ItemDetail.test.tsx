import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import ItemDetail from './ItemDetail';
import { render } from '../test/setup';

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

describe('ItemDetail', () => {
  const mockItem: MockItem = {
    id: 'item-123',
    teamId: 'team-456',
    name: 'User',
    kind: 'type',
    content: 'interface User {\n  id: string;\n  name: string;\n}',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with valid item data', () => {
    it('renders item content in monospace block', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      render(<ItemDetail />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Content should be rendered in pre element
      const preElement = screen.getByText(/interface User/);
      expect(preElement).toBeInTheDocument();
      expect(preElement.tagName.toLowerCase()).toBe('pre');
    });

    it('displays item metadata', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      render(<ItemDetail />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('type')).toBeInTheDocument();
      expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
      expect(screen.getByText('item-123')).toBeInTheDocument();
      expect(screen.getByText('team-456')).toBeInTheDocument();
    });

    it('has back link to items list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      render(<ItemDetail />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const backLink = screen.getByText(/All Items/);
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/items');
    });
  });

  describe('404 not found', () => {
    it('renders item not found state for 404 response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found or user lacks access',
          },
        }),
      });

      render(<ItemDetail />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Item Not Found')).toBeInTheDocument();
      expect(
        screen.getByText(/Item not found or user lacks access/i)
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading state before fetch resolves', () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ item: mockItem }),
              });
            }, 100);
          })
      );

      render(<ItemDetail />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails with non-404 error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<ItemDetail />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to load item/i)).toBeInTheDocument();
    });
  });
});
