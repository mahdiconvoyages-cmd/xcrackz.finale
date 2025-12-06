import { describe, it, expect } from 'vitest';

describe('Date Formatters', () => {
  it('devrait formater une date ISO', () => {
    const date = '2025-01-15T10:30:00Z';
    const formatted = new Date(date).toLocaleDateString('fr-FR');
    expect(formatted).toContain('15');
  });

  it('devrait calculer la différence entre deux dates', () => {
    const date1 = new Date('2025-01-15');
    const date2 = new Date('2025-01-20');
    const diffInMs = date2.getTime() - date1.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    expect(diffInDays).toBe(5);
  });
});

describe('String Formatters', () => {
  it('devrait capitaliser la première lettre', () => {
    const text = 'hello world';
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
    expect(capitalized).toBe('Hello world');
  });

  it('devrait extraire les initiales', () => {
    const fullName = 'Jean Dupont';
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    expect(initials).toBe('JD');
  });
});
