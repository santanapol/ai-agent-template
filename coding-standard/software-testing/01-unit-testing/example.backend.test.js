import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCommission } from '../utils/commission.js';

describe('calculateCommission() - Backend Unit Test', () => {
  test('should return correct commission for standard rate', () => {
    // Arrange & Act
    const result = calculateCommission(1000, 0.05);
    // Assert using native Node assert
    assert.strictEqual(result, 50);
  });

  test('should throw error when amount is negative', () => {
    assert.throws(
      () => calculateCommission(-100, 0.05),
      { message: 'Amount cannot be negative' }
    );
  });
});
