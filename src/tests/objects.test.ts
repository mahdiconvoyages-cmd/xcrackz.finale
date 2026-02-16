import { describe, it, expect } from 'vitest';

describe('Objects Utilities', () => {
  it('devrait cloner profondément un objet', () => {
    const original = { a: 1, b: { c: 2 } };
    const clone = JSON.parse(JSON.stringify(original));
    clone.b.c = 3;
    expect(original.b.c).toBe(2);
  });

  it('devrait fusionner deux objets', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 3, c: 4 };
    const merged = { ...obj1, ...obj2 };
    expect(merged).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('devrait vérifier si un objet est vide', () => {
    expect(Object.keys({}).length).toBe(0);
    expect(Object.keys({ a: 1 }).length).toBeGreaterThan(0);
  });

  it('devrait extraire les valeurs d un objet', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const values = Object.values(obj);
    expect(values).toEqual([1, 2, 3]);
  });
});

describe('Promise Utilities', () => {
  it('devrait attendre une promesse', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('devrait gérer le rejet d une promesse', async () => {
    try {
      await Promise.reject(new Error('test'));
    } catch (e) {
      expect(e.message).toBe('test');
    }
  });

  it('devrait attendre plusieurs promesses', async () => {
    const results = await Promise.all([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3)
    ]);
    expect(results).toEqual([1, 2, 3]);
  });
});
