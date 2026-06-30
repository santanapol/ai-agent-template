import React from 'react';
import { Card, theme } from 'antd';

interface PageContentCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  style?: React.CSSProperties;
  bodyPadding?: number | string;
}

export const PageContentCard: React.FC<PageContentCardProps> = ({
  children,
  title,
  extra,
  style,
  bodyPadding,
}) => {
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      title={title}
      extra={extra}
      style={{
        boxShadow: token.boxShadowSecondary,
        borderRadius: token.borderRadiusLG,
        ...style,
      }}
      styles={{
        body: {
          padding: bodyPadding ?? token.paddingLG,
        },
      }}
    >
      {children}
    </Card>
  );
};
