import React from 'react';
import { Flex, Typography, theme, Breadcrumb } from 'antd';
import { layoutTokens } from '../../theme/themeConfig';

const { Title, Paragraph } = Typography;

interface PageContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  breadcrumbItems?: { title: React.ReactNode }[];
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  extra,
  breadcrumbItems,
  children,
}) => {
  const { token } = theme.useToken();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: layoutTokens.pageGap }}>
      {breadcrumbItems && (
        <Breadcrumb style={{ marginBottom: 0 }} items={breadcrumbItems} />
      )}
      <Flex justify="space-between" align="center" wrap="wrap" gap={layoutTokens.sectionGap}>
        <Flex vertical gap={4}>
          {typeof title === 'string' ? (
            <Title level={2} style={{ margin: 0 }}>
              {title}
            </Title>
          ) : (
            title
          )}
          {description && (
            <Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
              {description}
            </Paragraph>
          )}
        </Flex>
        {extra && <Flex align="center" gap={layoutTokens.compactGap}>{extra}</Flex>}
      </Flex>
      {children}
    </div>
  );
};
