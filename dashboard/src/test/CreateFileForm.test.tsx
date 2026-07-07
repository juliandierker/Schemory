import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './setup';
import userEvent from '@testing-library/user-event';
import CreateFileForm from '../components/CreateFileForm';

describe('CreateFileForm component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with all fields', () => {
    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByLabelText('Filename')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create File' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('has TypeScript Type and JSON Schema options', () => {
    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={() => {}}
      />
    );

    const select = screen.getByLabelText('Type') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options).toHaveLength(2);
    expect(select.options[0]).toHaveValue('type');
    expect(select.options[1]).toHaveValue('schema');
  });

  it('disables submit button when filename is empty', async () => {
    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={() => {}}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Create File' });
    expect(submitButton).toBeDisabled();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation error when filename is empty on submit', async () => {
    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={() => {}}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Create File' });
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Filename is required')).toBeInTheDocument();
    });
  });

  it('shows validation error when content is empty on submit', async () => {
    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={() => {}}
      />
    );

    const filenameInput = screen.getByLabelText('Filename');
    await userEvent.type(filenameInput, 'test-file');
    
    const submitButton = screen.getByRole('button', { name: 'Create File' });
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Content is required')).toBeInTheDocument();
    });
  });

  it('calls onSuccess when form is submitted successfully', async () => {
    const onSuccess = vi.fn();
    
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        item: {
          id: '1',
          teamId: '1',
          name: 'test-file',
          kind: 'type',
          content: 'const test = "content";',
          version: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    }));

    render(
      <CreateFileForm
        teamId={1}
        onSuccess={onSuccess}
        onCancel={() => {}}
      />
    );

    const filenameInput = screen.getByLabelText('Filename');
    await userEvent.type(filenameInput, 'test-file');
    
    const contentInput = screen.getByLabelText('Content');
    await userEvent.type(contentInput, 'const test = "content";');
    
    const submitButton = screen.getByRole('button', { name: 'Create File' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: { message: 'Failed to create file' },
      }),
    }));

    render(
      <CreateFileForm
        teamId={1}
        onSuccess={() => {}}
        onCancel={() => {}}
      />
    );

    const filenameInput = screen.getByLabelText('Filename');
    await userEvent.type(filenameInput, 'test-file');
    
    const contentInput = screen.getByLabelText('Content');
    await userEvent.type(contentInput, 'const test = "content";');
    
    const submitButton = screen.getByRole('button', { name: 'Create File' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create file')).toBeInTheDocument();
    });
  });
});