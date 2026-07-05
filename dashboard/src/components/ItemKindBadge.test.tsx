import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import ItemKindBadge from './ItemKindBadge';
import { render } from '../test/setup';

describe('ItemKindBadge', () => {
  it('renders type badge with correct styling', () => {
    render(<ItemKindBadge kind="type" />);
    
    const badge = screen.getByText('type');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary', 'bg-opacity-10', 'text-primary');
  });

  it('renders schema badge with correct styling', () => {
    render(<ItemKindBadge kind="schema" />);
    
    const badge = screen.getByText('schema');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-valid', 'bg-opacity-10', 'text-valid');
  });

  it('has correct accessibility label', () => {
    render(<ItemKindBadge kind="type" />);
    
    const badge = screen.getByText('type');
    expect(badge).toHaveAttribute('aria-label', 'Kind: type');
  });
});
