export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BmiResult {
  value: number;
  category: BmiCategory;
  labelTh: string;
}

const CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: 'น้ำหนักน้อย',
  normal: 'ปกติ',
  overweight: 'น้ำหนักเกิน',
  obese: 'อ้วน',
};

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function formatBmi(bmi: number): string {
  return bmi.toFixed(1);
}

export function getBmiCategory(bmi: number): BmiResult {
  let category: BmiCategory;
  if (bmi < 18.5) {
    category = 'underweight';
  } else if (bmi < 25) {
    category = 'normal';
  } else if (bmi < 30) {
    category = 'overweight';
  } else {
    category = 'obese';
  }

  return {
    value: bmi,
    category,
    labelTh: CATEGORY_LABELS[category],
  };
}

export function computeBmiResult(weightKg: number, heightCm: number): BmiResult {
  return getBmiCategory(calculateBmi(weightKg, heightCm));
}
