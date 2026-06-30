import React from 'react';
import { Button, Flex, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { layoutTokens } from '../../theme/themeConfig';

const { Title } = Typography;

interface DetailContainerProps {
  title: React.ReactNode;
  backUrl?: string;
  onBack?: () => void;
  extra?: React.ReactNode;
  status?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
}

export const DetailContainer: React.FC<DetailContainerProps> = ({
  title,
  backUrl,
  onBack,
  extra,
  status,
  children,
  maxWidth = 1000,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      style={{
        maxWidth,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: layoutTokens.pageGap,
      }}
    >
      <Flex vertical gap={layoutTokens.compactGap}>
        <div>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{ padding: 0, height: 'auto', display: 'flex', alignItems: 'center' }}
          >
            Back
          </Button>
        </div>
        <Flex justify="space-between" align="center" wrap="wrap" gap={layoutTokens.sectionGap}>
          <Flex align="center" gap={layoutTokens.compactGap} wrap="wrap">
            {typeof title === 'string' ? (
              <Title level={2} style={{ margin: 0 }}>
                {title}
              </Title>
            ) : (
              title
            )}
            {status}
          </Flex>
          {extra && <Flex align="center" gap={layoutTokens.compactGap}>{extra}</Flex>}
        </Flex>
      </Flex>
      {children}
    </div>
  );
};
