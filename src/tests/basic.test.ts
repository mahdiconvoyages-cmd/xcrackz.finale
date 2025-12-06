import { describe, it, expect } from 'vitest';

describe('Math Utils', () => {
  it('devrait additionner deux nombres', () => {
    expect(1 + 1).toBe(2);
  });

  it('devrait multiplier deux nombres', () => {
    expect(2 * 3).toBe(6);
  });
});

describe('String Utils', () => {
  it('devrait concaténer des chaînes', () => {
    expect('Hello' + ' ' + 'World').toBe('Hello World');
  });

  it('devrait convertir en majuscules', () => {
    expect('test'.toUpperCase()).toBe('TEST');
  });
});
