import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Space,
  Badge,
  Typography,
  theme,
  message,
  Avatar,
  Row,
  Col,
  Divider,
  Flex,
  Descriptions,
  Tabs,
  Upload,
  Modal,
  Alert,
  Progress,
  Skeleton,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { DetailContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { currentUser, ROLE_LABELS } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import type { DemoViewProps } from '../types';

const { Text } = Typography;

type ProfileValues = {
  firstname: string;
  lastname: string;
  email: string;
  tel: string;
};

const INITIAL_PROFILE: ProfileValues = {
  firstname: currentUser.firstname,
  lastname: currentUser.lastname,
  email: currentUser.email,
  tel: currentUser.tel,
};

const CONTENT_MAX_WIDTH = 720;
const FORM_MAX_WIDTH = 520;
const PROFILE_FORM_ID = 'profile-form';

const simulateSave = (delayMs = 600) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const validateTelephone = (_: unknown, value: string) => {
  if (!value) {
    return Promise.resolve();
  }
  if (/^[0-9+\-\s()]{8,15}$/.test(value)) {
    return Promise.resolve();
  }
  return Promise.reject(new Error('Please enter a valid telephone number'));
};

const isProfileDirty = (values: ProfileValues, baseline: ProfileValues) =>
  (Object.keys(baseline) as Array<keyof ProfileValues>).some(
    (key) => (values[key] ?? '') !== (baseline[key] ?? ''),
  );

const getPasswordStrength = (
  password: string,
  colors: { weak: string; fair: string; good: string; strong: string },
) => {
  if (!password) {
    return { percent: 0, strokeColor: colors.weak, label: '' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { percent: 25, strokeColor: colors.weak, label: 'Weak — add uppercase, numbers, or symbols' };
  }
  if (score === 3) {
    return { percent: 50, strokeColor: colors.fair, label: 'Fair — almost there' };
  }
  if (score === 4) {
    return { percent: 75, strokeColor: colors.good, label: 'Good password' };
  }
  return { percent: 100, strokeColor: colors.strong, label: 'Strong password' };
};

const MyProfileView: React.FC<DemoViewProps> = ({ setDemoMode }) => {
  const { token } = theme.useToken();
  const [profileForm] = Form.useForm<ProfileValues>();
  const [passwordForm] = Form.useForm();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileBaseline, setProfileBaseline] = useState(INITIAL_PROFILE);
  const [profileDirty, setProfileDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarUrl, setAvatarUrl] = useState<string>();

  const watchedEmail = Form.useWatch('email', profileForm);
  const newPassword = Form.useWatch('newPassword', passwordForm) ?? '';

  const displayName = `${profileBaseline.firstname} ${profileBaseline.lastname}`;
  const initials = `${profileBaseline.firstname[0]}${profileBaseline.lastname[0]}`.toUpperCase();
  const heroEmail = watchedEmail ?? profileBaseline.email;
  const prefixIconStyle = { color: token.colorTextDescription };

  const strengthColors = useMemo(
    () => ({
      weak: token.colorError,
      fair: token.colorWarning,
      good: token.colorInfo,
      strong: token.colorSuccess,
    }),
    [token],
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword, strengthColors),
    [newPassword, strengthColors],
  );

  const syncProfileDirty = useCallback(() => {
    setProfileDirty(isProfileDirty(profileForm.getFieldsValue(), profileBaseline));
  }, [profileForm, profileBaseline]);

  useEffect(() => {
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

  const discardProfileChanges = useCallback(() => {
    profileForm.setFieldsValue(profileBaseline);
    setProfileDirty(false);
  }, [profileForm, profileBaseline]);

  const handleBack = () => setDemoMode('dashboard');

  const handleTabChange = (key: string) => {
    if (activeTab === 'profile' && profileDirty) {
      Modal.confirm({
        title: 'Discard unsaved changes?',
        content: 'Your profile changes have not been saved yet.',
        okText: 'Discard',
        okType: 'danger',
        cancelText: 'Keep editing',
        onOk: () => {
          discardProfileChanges();
          setActiveTab(key);
        },
      });
      return;
    }
    setActiveTab(key);
  };

  const handleAvatarUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please upload a PNG, JPG, or WebP image');
      return Upload.LIST_IGNORE;
    }
    if (avatarUrl) {
      URL.revokeObjectURL(avatarUrl);
    }
    setAvatarUrl(URL.createObjectURL(file));
    message.info('Photo preview updated — save profile to persist');
    return Upload.LIST_IGNORE;
  };

  const handleProfileFinish = async (values: ProfileValues) => {
    setProfileSaving(true);
    try {
      await simulateSave();
      setProfileBaseline(values);
      setProfileDirty(false);
      message.success('Profile saved successfully');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordFinish = async () => {
    setPasswordSaving(true);
    try {
      await simulateSave();
      message.success('Password updated successfully');
      passwordForm.resetFields();
    } finally {
      setPasswordSaving(false);
    }
  };

  const profileActions = (
    <Space>
      <Button onClick={discardProfileChanges} disabled={profileSaving}>
        Discard
      </Button>
      <Button type="primary" htmlType="submit" form={PROFILE_FORM_ID} loading={profileSaving}>
        Save changes
      </Button>
    </Space>
  );

  const profileTab = (
    <Row gutter={[layoutTokens.pageGap, layoutTokens.pageGap]}>
      <Col xs={24} lg={15}>
        <Form
          id={PROFILE_FORM_ID}
          form={profileForm}
          name="profile"
          layout="vertical"
          initialValues={profileBaseline}
          requiredMark="optional"
          scrollToFirstError
          disabled={profileSaving}
          onValuesChange={syncProfileDirty}
          onFinish={handleProfileFinish}
          style={{ maxWidth: FORM_MAX_WIDTH }}
        >
          <Skeleton active loading={profileSaving} paragraph={{ rows: 6 }}>
            <Row gutter={layoutTokens.sectionGap}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="First Name"
                  name="firstname"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input prefix={<UserOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Last Name"
                  name="lastname"
                  rules={[{ required: true, message: 'Please enter last name' }]}
                >
                  <Input prefix={<UserOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
                  extra="Changing your email may require verification in production."
                >
                  <Input prefix={<MailOutlined style={prefixIconStyle} />} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Telephone" name="tel" rules={[{ validator: validateTelephone }]}>
                  <Input
                    prefix={<PhoneOutlined style={prefixIconStyle} />}
                    placeholder="e.g. 0812345678"
                  />
                </Form.Item>
              </Col>
            </Row>
            {profileDirty ? (
              <>
                <Divider style={{ margin: `${layoutTokens.sectionGap}px 0` }} />
                <Flex justify="flex-end">{profileActions}</Flex>
              </>
            ) : null}
          </Skeleton>
        </Form>
      </Col>

      <Col xs={24} lg={9}>
        <Descriptions
          bordered
          column={1}
          size="small"
          title="Account"
          items={[
            { key: 'username', label: 'Username', children: currentUser.username },
            { key: 'role', label: 'System Role', children: ROLE_LABELS[currentUser.role] },
            {
              key: 'code',
              label: 'Staff Code',
              children: (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{currentUser.code}</span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              children: <Badge status="success" text="Active" />,
            },
          ]}
        />
      </Col>
    </Row>
  );

  const securityTab = (
    <Flex vertical gap={layoutTokens.pageGap} style={{ maxWidth: FORM_MAX_WIDTH }}>
      <Alert
        type="info"
        showIcon
        message="Password requirements"
        description="At least 8 characters with one uppercase letter and one number. Symbols are recommended."
      />
      <Form
        form={passwordForm}
        name="password"
        layout="vertical"
        scrollToFirstError
        disabled={passwordSaving}
        onFinish={handlePasswordFinish}
      >
        <Skeleton active loading={passwordSaving} paragraph={{ rows: 5 }}>
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: 'Please enter current password' }]}
            hasFeedback
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, min: 8, message: 'Password must be at least 8 characters' },
              {
                pattern: /^(?=.*[A-Z])(?=.*[0-9])/,
                message: 'Include at least one uppercase letter and one number',
              },
            ]}
            hasFeedback
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          {newPassword ? (
            <Flex vertical gap={layoutTokens.compactGap} style={{ marginBottom: layoutTokens.sectionGap }}>
              <Progress
                percent={passwordStrength.percent}
                showInfo={false}
                strokeColor={passwordStrength.strokeColor}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {passwordStrength.label}
              </Text>
            </Flex>
          ) : null}
          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Skeleton>
        <Divider style={{ margin: `${layoutTokens.sectionGap}px 0` }} />
        <Flex justify="flex-end">
          <Space>
            <Button onClick={() => passwordForm.resetFields()} disabled={passwordSaving}>
              Reset
            </Button>
            <Button type="primary" htmlType="submit" loading={passwordSaving}>
              Update Password
            </Button>
          </Space>
        </Flex>
      </Form>
    </Flex>
  );

  return (
    <DetailContainer
      title="My Profile"
      breadcrumbItems={listBreadcrumb('My Profile')}
      onBack={handleBack}
      maxWidth={CONTENT_MAX_WIDTH}
    >
      <PageContentCard style={{ marginBottom: layoutTokens.pageGap }}>
        <Flex vertical gap={layoutTokens.compactGap} style={{ marginBottom: layoutTokens.sectionGap }}>
          <Text type="secondary">
            Manage your personal account information and security settings.
          </Text>
        </Flex>
        <Flex align="center" gap={layoutTokens.pageGap} wrap="wrap">
          <Upload
            accept="image/png,image/jpeg,image/webp"
            showUploadList={false}
            beforeUpload={handleAvatarUpload}
          >
            <Button
              type="text"
              aria-label="Change profile photo"
              style={{ height: 'auto', padding: layoutTokens.compactGap }}
            >
              <Flex vertical align="center" gap={layoutTokens.compactGap}>
                <Avatar
                  size={80}
                  src={avatarUrl}
                  alt={`${displayName} avatar`}
                  style={{ backgroundColor: token.colorPrimary, flexShrink: 0 }}
                  icon={!avatarUrl && !initials ? <UserOutlined /> : undefined}
                >
                  {!avatarUrl ? initials : null}
                </Avatar>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  <CameraOutlined aria-hidden /> Change photo
                </Text>
              </Flex>
            </Button>
          </Upload>
          <Flex vertical gap={layoutTokens.compactGap} style={{ flex: 1, minWidth: 200 }}>
            <Text strong style={{ fontSize: token.fontSizeHeading3, margin: 0 }}>
              {displayName}
            </Text>
            <Text type="secondary">{heroEmail}</Text>
          </Flex>
        </Flex>
      </PageContentCard>

      <PageContentCard>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'profile', label: 'Profile', icon: <UserOutlined />, children: profileTab },
            { key: 'security', label: 'Security', icon: <LockOutlined />, children: securityTab },
          ]}
        />
      </PageContentCard>

      {profileDirty && activeTab === 'profile' ? (
        <div
          style={{
            position: 'sticky',
            bottom: layoutTokens.sectionGap,
            marginTop: layoutTokens.pageGap,
            padding: layoutTokens.sectionGap,
            background: token.colorBgElevated,
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadowSecondary,
            zIndex: layoutTokens.zIndexSticky,
          }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={layoutTokens.sectionGap}>
            <Text strong>Unsaved changes</Text>
            {profileActions}
          </Flex>
        </div>
      ) : null}
    </DetailContainer>
  );
};

export default MyProfileView;
