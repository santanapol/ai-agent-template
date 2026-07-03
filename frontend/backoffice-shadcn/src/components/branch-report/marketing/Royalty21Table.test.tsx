import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Royalty21Table from './Royalty21Table';

describe('Royalty21Table', () => {
  it('shows pre-search empty state before first search', () => {
    render(
      <Royalty21Table
        rows={[]}
        loading={false}
        hasSearched={false}
        page={1}
        pageSize={50}
        total={0}
        onTableChange={() => {}}
      />,
    );

    expect(screen.getByText('Select channel and click Search')).toBeInTheDocument();
  });

  it('shows no-results empty state after search returns empty', () => {
    render(
      <Royalty21Table
        rows={[]}
        loading={false}
        hasSearched={true}
        page={1}
        pageSize={50}
        total={0}
        onTableChange={() => {}}
      />,
    );

    expect(screen.getByText('No members found for selected channel')).toBeInTheDocument();
  });
});
