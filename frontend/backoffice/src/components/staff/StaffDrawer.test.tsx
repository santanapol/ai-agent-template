import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Form } from 'antd';
import { renderWithProviders } from '../../test/renderWithProviders';
import StaffDrawer, { type DrawerMode } from './StaffDrawer';

interface WrapperProps {
  mode: DrawerMode;
  isSaving?: boolean;
  showAdminResetPassword?: boolean;
  canAssignRole?: boolean;
}

const Wrapper: React.FC<WrapperProps> = ({
  mode,
  isSaving = false,
  showAdminResetPassword = false,
  canAssignRole = false,
}) => {
  const [form] = Form.useForm();
  return (
    <StaffDrawer
      open={true}
      mode={mode}
      loading={false}
      isSaving={isSaving}
      updatingPassword={false}
      showAdminResetPassword={showAdminResetPassword}
      canAssignRole={canAssignRole}
      form={form}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onSwitchToEdit={vi.fn()}
      onUpdatePassword={vi.fn()}
    />
  );
};

describe('StaffDrawer', () => {
  describe('mode: create', () => {
    it('renders Username and Password fields', () => {
      renderWithProviders(<Wrapper mode="create" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('shows Create Profile button', () => {
      renderWithProviders(<Wrapper mode="create" />);
      expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument();
    });

    it('shows System Role when canAssignRole is true', () => {
      renderWithProviders(<Wrapper mode="create" canAssignRole={true} />);
      expect(screen.getByText('System Role')).toBeInTheDocument();
    });

    it('hides System Role when canAssignRole is false', () => {
      renderWithProviders(<Wrapper mode="create" />);
      expect(screen.queryByText('System Role')).not.toBeInTheDocument();
    });

    it('disables Create Profile button while saving', () => {
      renderWithProviders(<Wrapper mode="create" isSaving={true} />);
      expect(screen.getByRole('button', { name: /create profile/i })).toBeDisabled();
    });
  });

  describe('mode: edit', () => {
    it('does not render Username field', () => {
      renderWithProviders(<Wrapper mode="edit" />);
      expect(screen.queryByText('Username')).not.toBeInTheDocument();
    });

    it('shows Save Changes button', () => {
      renderWithProviders(<Wrapper mode="edit" />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('disables Save Changes button while saving', () => {
      renderWithProviders(<Wrapper mode="edit" isSaving={true} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    it('renders admin reset password section when showAdminResetPassword=true', () => {
      renderWithProviders(<Wrapper mode="edit" showAdminResetPassword={true} />);
      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('does not render admin reset password section by default', () => {
      renderWithProviders(<Wrapper mode="edit" />);
      expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument();
    });
  });

  describe('mode: view', () => {
    it('shows Edit Profile button instead of Save', () => {
      renderWithProviders(<Wrapper mode="view" />);
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });
  });
});
