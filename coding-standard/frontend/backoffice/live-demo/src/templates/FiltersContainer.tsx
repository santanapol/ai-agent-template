import React from 'react';
import { Flex } from 'antd';
import { layoutTokens } from '../themeConfig';

interface FiltersContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const FiltersContainer: React.FC<FiltersContainerProps> = ({ children, style }) => {
  return (
    <Flex
      wrap="wrap"
      align="center"
      gap={layoutTokens.sectionGap}
      style={{ marginBottom: layoutTokens.sectionGap, ...style }}
    >
      {children}
    </Flex>
  );
};
