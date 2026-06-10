import { describe, expect, it } from 'vitest';
import {
  calculateBmi,
  formatBmi,
  getBmiCategory,
  computeBmiResult,
} from './bmi';

describe('calculateBmi', () => {
  it('calculates BMI for 170 cm and 70 kg', () => {
    expect(calculateBmi(70, 170)).toBeCloseTo(24.22, 2);
  });
});

describe('formatBmi', () => {
  it('formats to one decimal place', () => {
    expect(formatBmi(24.2213)).toBe('24.2');
  });
});

describe('getBmiCategory', () => {
  it('returns normal for BMI 24.2', () => {
    const result = getBmiCategory(24.2);
    expect(result.category).toBe('normal');
    expect(result.labelTh).toBe('ปกติ');
  });

  it('returns normal at boundary 18.5', () => {
    expect(getBmiCategory(18.5).category).toBe('normal');
  });

  it('returns underweight below 18.5', () => {
    expect(getBmiCategory(18.4).category).toBe('underweight');
    expect(getBmiCategory(18.4).labelTh).toBe('น้ำหนักน้อย');
  });

  it('returns normal at boundary 24.9', () => {
    expect(getBmiCategory(24.9).category).toBe('normal');
  });

  it('returns overweight at boundary 25.0', () => {
    expect(getBmiCategory(25.0).category).toBe('overweight');
    expect(getBmiCategory(25.0).labelTh).toBe('น้ำหนักเกิน');
  });

  it('returns obese at boundary 30.0', () => {
    expect(getBmiCategory(30.0).category).toBe('obese');
    expect(getBmiCategory(30.0).labelTh).toBe('อ้วน');
  });
});

describe('computeBmiResult', () => {
  it('combines calculation and category for 170 cm, 70 kg', () => {
    const result = computeBmiResult(70, 170);
    expect(formatBmi(result.value)).toBe('24.2');
    expect(result.category).toBe('normal');
    expect(result.labelTh).toBe('ปกติ');
  });
});
