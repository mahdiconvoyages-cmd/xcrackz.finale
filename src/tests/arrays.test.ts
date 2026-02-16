import { describe, it, expect } from 'vitest';

describe('Array Utilities', () => {
  it('devrait filtrer les doublons', () => {
    const array = [1, 2, 2, 3, 4, 4, 5];
    const unique = [...new Set(array)];
    expect(unique).toEqual([1, 2, 3, 4, 5]);
  });

  it('devrait trier par ordre croissant', () => {
    const array = [5, 2, 8, 1, 9];
    const sorted = [...array].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 5, 8, 9]);
  });

  it('devrait calculer la somme', () => {
    const numbers = [1, 2, 3, 4, 5];
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    expect(sum).toBe(15);
  });

  it('devrait trouver le maximum', () => {
    const numbers = [5, 2, 8, 1, 9];
    const max = Math.max(...numbers);
    expect(max).toBe(9);
  });
});
