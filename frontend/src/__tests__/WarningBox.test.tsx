import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WarningBox from '../components/WarningBox';

describe('WarningBox', () => {
  it('should not render when warnings array is empty', () => {
    const { container } = render(<WarningBox warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render warnings when provided', () => {
    const warnings = [
      'Warning 1: Something to watch out for',
      'Warning 2: Another issue',
    ];

    render(<WarningBox warnings={warnings} />);

    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('Warning 1: Something to watch out for')).toBeInTheDocument();
    expect(screen.getByText('Warning 2: Another issue')).toBeInTheDocument();
  });

  it('should have proper ARIA role', () => {
    const warnings = ['Test warning'];
    render(<WarningBox warnings={warnings} />);

    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
  });

  it('should display warning icon', () => {
    const warnings = ['Test warning'];
    render(<WarningBox warnings={warnings} />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should render multiple warnings as list items', () => {
    const warnings = ['Warning 1', 'Warning 2', 'Warning 3'];
    render(<WarningBox warnings={warnings} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });
});

// Made with Bob