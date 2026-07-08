import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';

type Row = { id: string; name: string };

describe('DataTable row selection', () => {
  const rows: Row[] = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
  ];

  const columns = [{ key: 'name', title: 'Name', accessor: 'name' as const }];

  test('selects and deselects a single row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        rowSelection={{ selectedKeys: [], onChange }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(onChange).toHaveBeenCalledWith(['1']);

    rerender(
      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        rowSelection={{ selectedKeys: ['1'], onChange }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  test('select-all toggles all selectable rows', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        rowSelection={{ selectedKeys: [], onChange }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(onChange).toHaveBeenCalledWith(['1', '2']);
  });

  test('select-all deselects when all rows are selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        rowSelection={{ selectedKeys: ['1', '2'], onChange }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
