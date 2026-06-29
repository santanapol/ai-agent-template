import React from 'react';
import { Button, DatePicker, Flex, Form, Grid, Radio, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { Dayjs } from 'dayjs';
import type { ChannelType } from '../../../types/branchReport';
import {
  createRegDateRangeDisabledDate,
  getRoyalty21DefaultSearchValues,
  isRegDateRangeValid,
  isRegDateRangeWithinMaxDays,
  MAX_REG_DATE_RANGE_DAYS,
  regDateRangePresets,
} from '../../../lib/branch-report/royalty21DateRange';

export interface Royalty21SearchValues {
  channelType: ChannelType;
  inviteLinkId?: string;
  regDateRange: [Dayjs, Dayjs];
}

export interface InviteLinkOption {
  value: string;
  label: string;
}

interface Royalty21SearchFormProps {
  form: FormInstance<Royalty21SearchValues>;
  inviteLinkOptions: InviteLinkOption[];
  inviteLinksLoading: boolean;
  tableLoading?: boolean;
  disabled?: boolean;
  onSearch: (values: Royalty21SearchValues) => void;
  onClear: () => void;
}

const CHANNEL_TYPE_OPTIONS = [
  { label: 'Affiliate Link', value: 'affiliate_link' as const },
  { label: 'Member Referral', value: 'member_referral' as const },
  { label: 'Direct', value: 'direct' as const },
];

const disabledRegDate = createRegDateRangeDisabledDate();

const Royalty21SearchForm: React.FC<Royalty21SearchFormProps> = ({
  form,
  inviteLinkOptions,
  inviteLinksLoading,
  tableLoading = false,
  disabled = false,
  onSearch,
  onClear,
}) => {
  const screens = Grid.useBreakpoint();
  const isHorizontal = Boolean(screens.md);

  return (
    <Form<Royalty21SearchValues>
      form={form}
      layout={isHorizontal ? 'horizontal' : 'vertical'}
      labelCol={isHorizontal ? { flex: '140px' } : undefined}
      wrapperCol={isHorizontal ? { flex: 1 } : undefined}
      initialValues={getRoyalty21DefaultSearchValues()}
      onFinish={onSearch}
      disabled={disabled}
      scrollToFirstError
    >
      <Form.Item
        name="channelType"
        label="Channel Type"
        rules={[{ required: true, message: 'Please select channel type' }]}
      >
        <Radio.Group
          optionType="button"
          options={CHANNEL_TYPE_OPTIONS}
          onChange={() => form.setFieldValue('inviteLinkId', undefined)}
        />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) => prev.channelType !== cur.channelType}
      >
        {({ getFieldValue }) =>
          getFieldValue('channelType') === 'affiliate_link' ? (
            <Form.Item
              name="inviteLinkId"
              label="Affiliate Link"
              rules={[{ required: true, message: 'Please select affiliate link' }]}
            >
              <Select
                showSearch
                placeholder="Select affiliate link"
                optionFilterProp="label"
                options={inviteLinkOptions}
                loading={inviteLinksLoading}
                allowClear={false}
                notFoundContent={
                  inviteLinksLoading
                    ? undefined
                    : 'No affiliate links for this branch'
                }
                style={{ minWidth: isHorizontal ? 320 : undefined, width: '100%' }}
              />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Form.Item
        name="regDateRange"
        label="Register Date"
        rules={[
          { required: true, message: 'Please select register date range' },
          {
            validator(_, value: [Dayjs, Dayjs] | null | undefined) {
              const [from, to] = value ?? [];
              if (!from || !to) return Promise.resolve();
              if (!isRegDateRangeValid(from, to)) {
                return Promise.reject(
                  new Error('Register To must be on or after Register From'),
                );
              }
              if (!isRegDateRangeWithinMaxDays(from, to)) {
                return Promise.reject(
                  new Error(
                    `Register date range must not exceed ${MAX_REG_DATE_RANGE_DAYS} days`,
                  ),
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          presets={regDateRangePresets()}
          disabledDate={disabledRegDate}
          style={{ width: isHorizontal ? 280 : '100%' }}
        />
      </Form.Item>

      <Form.Item wrapperCol={isHorizontal ? { offset: 140 } : undefined}>
        <Flex gap="middle" wrap="wrap">
          <Button type="primary" htmlType="submit" loading={tableLoading}>
            Search
          </Button>
          <Button type="button" onClick={onClear} disabled={tableLoading}>
            Clear
          </Button>
        </Flex>
      </Form.Item>
    </Form>
  );
};

export default Royalty21SearchForm;
