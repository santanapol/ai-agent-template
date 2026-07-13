import React from 'react';
import { Result, Button, Card, Space, theme } from 'antd';
import { layoutTokens } from '../themeConfig';

interface ResultTemplateProps {
  status?: 'success' | 'error' | 'info' | 'warning' | '403' | '404' | '500';
  title?: string;
  subTitle?: string;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  extra?: React.ReactNode;
}

const ResultTemplate: React.FC<ResultTemplateProps> = ({
  status = '404',
  title = 'Page Not Found',
  subTitle = 'Sorry, the page you visited does not exist.',
  primaryActionText = 'Back Home',
  onPrimaryAction,
  extra,
}) => {
  const { token } = theme.useToken();

  const resultExtra = extra ?? (
    <Button type="primary" onClick={onPrimaryAction}>
      {primaryActionText}
    </Button>
  );

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: token.colorBgLayout,
        padding: layoutTokens.pageGap,
      }}
    >
      <Card
        variant="borderless"
        style={{
          width: '100%',
          maxWidth: 600,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
        }}
      >
        <Result
          status={status}
          title={title}
          subTitle={subTitle}
          extra={Array.isArray(resultExtra) ? <Space>{resultExtra}</Space> : resultExtra}
        />
      </Card>
    </div>
  );
};

export default ResultTemplate;
