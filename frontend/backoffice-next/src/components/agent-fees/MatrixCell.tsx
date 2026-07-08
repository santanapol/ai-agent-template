import React, { forwardRef, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface MatrixCellRef {
  reset: (defaultRate: number) => void;
  setValues: (gc: number, ak: number, af: number) => void;
  getValues: () => { gc: number; ak: number; af: number; enabled: boolean };
}

export interface MatrixCellProps {
  defaultRate: number;
  readOnly: boolean;
}

export const MatrixCell = React.memo(
  forwardRef<MatrixCellRef, MatrixCellProps>(({ defaultRate, readOnly }, ref) => {
    const [enabled, setEnabled] = useState(false);
    const [feeValue, setFeeValue] = useState<number | string>(defaultRate);

    React.useImperativeHandle(ref, () => ({
      reset: (newDefaultRate: number) => {
        setEnabled(false);
        setFeeValue(newDefaultRate);
      },
      setValues: (_gc: number, _ak: number, af: number) => {
        setEnabled(true);
        setFeeValue(af);
      },
      getValues: () => {
        const numericFee = feeValue === "" ? 0 : Number(feeValue);
        return {
          enabled,
          gc: enabled ? numericFee : defaultRate,
          ak: enabled ? numericFee : defaultRate,
          af: enabled ? numericFee : defaultRate,
        };
      },
    }));

    const handleToggle = (checked: boolean) => {
      setEnabled(checked);
      if (!checked) {
        setFeeValue(defaultRate);
      }
    };

    const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        setFeeValue("");
        return;
      }
      setFeeValue(val);
    };

    const handleBlur = () => {
      if (feeValue !== "") {
        let num = Number(feeValue);
        if (Number.isNaN(num)) num = 0;
        num = Math.round(num * 100) / 100;
        setFeeValue(num);
      }
    };

    const isDisabled = !enabled || readOnly;

    return (
      <div className="flex items-center justify-center gap-2">
        <Checkbox
          checked={enabled}
          disabled={readOnly}
          onCheckedChange={(value) => handleToggle(value === true)}
          aria-label="Toggle agent fee"
        />
        <div
          className={cn(
            "inline-flex h-6 w-[65px] items-center overflow-hidden rounded-md border bg-background transition-colors",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            isDisabled && "cursor-not-allowed bg-muted/50",
          )}
          title="Agent Fee"
        >
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="w-full border-none bg-transparent px-2 text-right text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={feeValue}
            disabled={isDisabled}
            onChange={handleFeeChange}
            onBlur={handleBlur}
            aria-label="Agent Fee"
          />
        </div>
      </div>
    );
  }),
);

MatrixCell.displayName = "MatrixCell";
