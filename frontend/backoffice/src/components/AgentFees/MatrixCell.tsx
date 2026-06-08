import React, { useState } from 'react';
import { Space, Checkbox } from 'antd';

const FAST_INPUT_STYLES = `
.fast-input-wrapper { display: inline-flex; align-items: center; border: 1px solid #d9d9d9; border-radius: 6px; background-color: #ffffff; overflow: hidden; transition: all 0.2s; width: 65px; height: 24px; }
.fast-input-wrapper:focus-within { border-color: #1677ff; box-shadow: 0 0 0 2px rgba(5, 145, 255, 0.1); }
.fast-input-wrapper.disabled { background-color: rgba(0, 0, 0, 0.04); cursor: not-allowed; border-color: #d9d9d9; }
.fast-input { border: none; outline: none; background: transparent; width: 100%; padding: 0 4px 0 8px; color: rgba(0, 0, 0, 0.88); font-size: 14px; text-align: right; -moz-appearance: textfield; }
.fast-input::-webkit-outer-spin-button, .fast-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.fast-input:disabled { color: rgba(0, 0, 0, 0.25); cursor: not-allowed; }
.fast-input-addon { padding: 0 6px; color: rgba(0, 0, 0, 0.45); background-color: rgba(0, 0, 0, 0.02); border-left: 1px solid #d9d9d9; font-size: 14px; line-height: 22px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('fast-input-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'fast-input-styles';
  styleEl.innerHTML = FAST_INPUT_STYLES;
  document.head.appendChild(styleEl);
}

export interface MatrixCellRef {
  reset: (defaultRate: number) => void;
  setValues: (gc: number, ak: number, af: number) => void;
  getValues: () => { gc: number, ak: number, af: number, enabled: boolean };
}

export interface MatrixCellProps {
  rowKey: string;
  defaultRate: number;
  readOnly: boolean;
}

export const MatrixCell = React.memo(React.forwardRef<MatrixCellRef, MatrixCellProps>(({
  rowKey, defaultRate, readOnly
}, ref) => {
  const [enabled, setEnabled] = useState(false);
  const [feeValue, setFeeValue] = useState<number | string>(defaultRate);

  React.useImperativeHandle(ref, () => ({
    reset: (newDefaultRate: number) => {
      setEnabled(false);
      setFeeValue(newDefaultRate);
    },
    setValues: (gc, ak, af) => {
      setEnabled(true);
      // Since we combined inputs, we display 'af' as the representative fee
      setFeeValue(af);
    },
    getValues: () => {
      const numericFee = feeValue === '' ? 0 : Number(feeValue);
      return {
        enabled,
        gc: enabled ? numericFee : defaultRate,
        ak: enabled ? numericFee : defaultRate,
        af: enabled ? numericFee : defaultRate
      };
    }
  }));

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      setFeeValue(defaultRate);
    }
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setFeeValue('');
      return;
    }
    // Store exact string while typing to allow "1."
    setFeeValue(val);
  };

  const handleBlur = () => {
    if (feeValue !== '') {
      let num = Number(feeValue);
      if (isNaN(num)) num = 0;
      // Round to 2 decimal places — out-of-range values (0–100) are intentionally
      // left as-is so Save can surface "Invalid values: ..." per field, rather than
      // silently rewriting what the user typed.
      num = Math.round(num * 100) / 100;
      setFeeValue(num);
    }
  };

  const renderInput = (
    tooltip: string,
    val: number | string
  ) => {
    const isDisabled = !enabled || readOnly;
    return (
      <div className={`fast-input-wrapper ${isDisabled ? 'disabled' : ''}`} title={tooltip}>
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          className="fast-input"
          value={val}
          disabled={isDisabled}
          onChange={handleFeeChange}
          onBlur={handleBlur}
          aria-label="Agent Fee"
        />
      </div>
    );
  };

  return (
    <Space align="center" size="small" style={{ justifyContent: 'center', display: 'flex' }}>
      <Checkbox
        checked={enabled}
        disabled={readOnly}
        onChange={e => handleToggle(e.target.checked)}
        aria-label="Toggle agent fee"
      />
      {renderInput('Agent Fee', feeValue)}
    </Space>
  );
}));

MatrixCell.displayName = 'MatrixCell';
