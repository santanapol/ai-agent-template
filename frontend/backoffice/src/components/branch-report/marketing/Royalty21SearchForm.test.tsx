import { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import dayjs from 'dayjs';
import Royalty21SearchForm, {
  type Royalty21SearchValues,
} from './Royalty21SearchForm';

function SearchFormHarness({
  onSearch = vi.fn(),
  onClear = vi.fn(),
  initialValues,
}: {
  onSearch?: (values: Royalty21SearchValues) => void;
  onClear?: () => void;
  initialValues?: Partial<Royalty21SearchValues>;
}) {
  const [form] = Form.useForm<Royalty21SearchValues>();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [form, initialValues]);

  return (
    <Royalty21SearchForm
      form={form}
      inviteLinkOptions={[]}
      inviteLinksLoading={false}
      onSearch={onSearch}
      onClear={onClear}
    />
  );
}

describe('Royalty21SearchForm', () => {
  it('shows validation when affiliate channel selected without invite link', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchFormHarness onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Please select affiliate link')).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('shows validation when Register To is before Register From (AC-10)', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <SearchFormHarness
        onSearch={onSearch}
        initialValues={{
          channelType: 'member_referral',
          regDateFrom: dayjs('2024-06-01'),
          regDateTo: dayjs('2024-05-01'),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('Register To must be on or after Register From'),
    ).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });
});
