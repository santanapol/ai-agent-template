import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('BmiCalculator', () => {
  it('shows BMI and category after submitting valid values', async () => {
    const user = userEvent.setup();
    render(<App />);

    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '170');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '70');

    await user.click(screen.getByRole('button', { name: /คำนวณ/ }));

    expect(screen.getByTestId('bmi-result')).toBeInTheDocument();
    expect(screen.getByText('24.2')).toBeInTheDocument();
    expect(screen.getByText('ปกติ')).toBeInTheDocument();
  });
});
