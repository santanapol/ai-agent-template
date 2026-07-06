import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommissionForm } from './CommissionForm';

describe('CommissionForm - Frontend Unit Test', () => {
  it('should display error when rate exceeds 100', () => {
    // Arrange
    render(<CommissionForm />);
    const rateInput = screen.getByLabelText(/Rate %/i);
    const submitBtn = screen.getByRole('button', { name: /Publish/i });

    // Act
    fireEvent.change(rateInput, { target: { value: '150' } });
    fireEvent.click(submitBtn);

    // Assert
    expect(screen.getByText(/Rate cannot exceed 100/i)).toBeInTheDocument();
  });
});
