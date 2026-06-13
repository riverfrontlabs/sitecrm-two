import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuilderPage } from './BuilderPage';

describe('BuilderPage', () => {
  it('renders the builder shell with both panes', () => {
    render(<BuilderPage />);
    expect(screen.getByRole('heading', { name: 'Site Builder' })).toBeInTheDocument();
    expect(screen.getByText('Preview will appear here')).toBeInTheDocument();
  });
});
