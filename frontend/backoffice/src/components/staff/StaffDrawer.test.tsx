import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Form } from 'antd';
import StaffDrawer from './StaffDrawer';

// Mock matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const Wrapper = ({ mode }: { mode: 'create' | 'edit' }) => {
  const [form] = Form.useForm();
  return (
    <StaffDrawer
      open={true}
      mode={mode}
      loading={false}
      updatingPassword={false}
      showAdminResetPassword={false}
      form={form}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onSwitchToEdit={vi.fn()}
      onUpdatePassword={vi.fn()}
    />
  );
};

describe('StaffDrawer', () => {
  it('should render Username field in create mode', () => {
    render(<Wrapper mode="create" />);
    // Check if Username label exists
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should not render Username field in edit mode', () => {
    render(<Wrapper mode="edit" />);
    expect(screen.queryByText('Username')).not.toBeInTheDocument();
  });
});
