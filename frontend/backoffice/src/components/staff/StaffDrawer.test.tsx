import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form } from 'antd';
import StaffDrawer, { type DrawerMode } from './StaffDrawer';

interface WrapperProps {
  mode: DrawerMode;
  isSaving?: boolean;
  showAdminResetPassword?: boolean;
}

const Wrapper: React.FC<WrapperProps> = ({ mode, isSaving = false, showAdminResetPassword = false }) => {
  const [form] = Form.useForm();
  return (
    <StaffDrawer
      open={true}
      mode={mode}
      loading={false}
      isSaving={isSaving}
      updatingPassword={false}
      showAdminResetPassword={showAdminResetPassword}
      form={form}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onSwitchToEdit={vi.fn()}
      onUpdatePassword={vi.fn()}
    />
  );
};

import React from 'react';

describe('StaffDrawer', () => {
  describe('mode: create', () => {
    it('renders Username and Password fields', () => {
      render(<Wrapper mode="create" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('shows Create Profile button', () => {
      render(<Wrapper mode="create" />);
      expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument();
    });

    it('disables Create Profile button while saving', () => {
      render(<Wrapper mode="create" isSaving={true} />);
      expect(screen.getByRole('button', { name: /create profile/i })).toBeDisabled();
    });
  });

  describe('mode: edit', () => {
    it('does not render Username field', () => {
      render(<Wrapper mode="edit" />);
      expect(screen.queryByText('Username')).not.toBeInTheDocument();
    });

    it('shows Save Changes button', () => {
      render(<Wrapper mode="edit" />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('disables Save Changes button while saving', () => {
      render(<Wrapper mode="edit" isSaving={true} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    it('renders admin reset password section when showAdminResetPassword=true', () => {
      render(<Wrapper mode="edit" showAdminResetPassword={true} />);
      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('does not render admin reset password section by default', () => {
      render(<Wrapper mode="edit" />);
      expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument();
    });
  });

  describe('mode: view', () => {
    it('shows Edit Profile button instead of Save', () => {
      render(<Wrapper mode="view" />);
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });
  });
});
