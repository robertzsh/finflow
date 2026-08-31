import { describe, it, expect } from 'vitest';
import { parseAmount } from '@/lib/format';

describe('parseAmount', () => {
  it('parses plain integers and dot decimals', () => {
    expect(parseAmount('100')).toBe(100);
    expect(parseAmount('12.50')).toBe(12.5);
  });

  it('parses comma decimals (iOS keypad locale)', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('0,99')).toBe(0.99);
  });

  it('handles thousands + decimal in both orders', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56); // European
    expect(parseAmount('1,234.56')).toBe(1234.56); // US
  });

  it('trims surrounding whitespace', () => {
    expect(parseAmount('  42,00  ')).toBe(42);
  });

  it('returns NaN for empty / whitespace-only / null', () => {
    expect(Number.isNaN(parseAmount(''))).toBe(true);
    expect(Number.isNaN(parseAmount('   '))).toBe(true);
    expect(Number.isNaN(parseAmount(null))).toBe(true);
    expect(Number.isNaN(parseAmount(undefined))).toBe(true);
  });

  it('passes numbers through unchanged', () => {
    expect(parseAmount(3.14)).toBe(3.14);
    expect(parseAmount(-5)).toBe(-5); // sign preserved; callers enforce > 0
  });
});
