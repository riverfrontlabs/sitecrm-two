import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Title" />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('renders the hint and links it via aria-describedby', () => {
    render(<Input label="URL" hint="Must start with https://" />);
    const input = screen.getByLabelText('URL');
    const hint = screen.getByText('Must start with https://');
    expect(input).toHaveAttribute('aria-describedby', hint.id);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the field invalid and announces the error', () => {
    render(<Input label="URL" hint="Must start with https://" error="That is not a valid URL." />);
    const input = screen.getByLabelText('URL');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // The error replaces the hint and is announced assertively.
    expect(screen.queryByText('Must start with https://')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('That is not a valid URL.');
  });
});
