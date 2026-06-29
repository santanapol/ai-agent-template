import React from 'react';
import { Button, DatePicker, Flex, Form, Radio, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { Dayjs } from 'dayjs';
import type { ChannelType } from '../../../types/branchReport';
import { getRoyalty21DefaultSearchValues, isRegDateRangeValid } from '../../../lib/branch-report/royalty21DateRange';

export interface Royalty21SearchValues {
  channelType: ChannelType;
  inviteLinkId?: string;
  regDateFrom: Dayjs;
  regDateTo: Dayjs;
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

const Royalty21SearchForm: React.FC<Royalty21SearchFormProps> = ({
  form,
  inviteLinkOptions,
  inviteLinksLoading,
  tableLoading = false,
  disabled = false,
  onSearch,
  onClear,
}) => {
  return (
    <Form<Royalty21SearchValues>
      form={form}
      layout="horizontal"
      labelCol={{ flex: '140px' }}
      wrapperCol={{ flex: 1 }}
      initialValues={getRoyalty21DefaultSearchValues()}
      onFinish={onSearch}
      disabled={disabled}
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
                style={{ minWidth: 320 }}
              />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Form.Item
        name="regDateFrom"
        label="Register From"
        rules={[{ required: true, message: 'Please select register from date' }]}
      >
        <DatePicker format="DD/MM/YYYY" style={{ width: 180 }} />
      </Form.Item>

      <Form.Item
        name="regDateTo"
        label="Register To"
        dependencies={['regDateFrom']}
        rules={[
          { required: true, message: 'Please select register to date' },
          ({ getFieldValue }) => ({
            validator(_, value: Dayjs | undefined) {
              const from = getFieldValue('regDateFrom') as Dayjs | undefined;
              if (isRegDateRangeValid(from, value)) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error('Register To must be on or after Register From'),
              );
            },
          }),
        ]}
      >
        <DatePicker format="DD/MM/YYYY" style={{ width: 180 }} />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 140 }}>
        <Flex gap="middle">
          <Button type="primary" htmlType="submit" loading={tableLoading}>
            Search
          </Button>
          <Button type="button" onClick={onClear}>
            Clear
          </Button>
        </Flex>
      </Form.Item>
    </Form>
  );
};

export default Royalty21SearchForm;
