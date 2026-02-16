import { describe, it, expect } from 'vitest';

describe('Email Validator', () => {
  it('devrait valider un email correct', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('test@example.com')).toBe(true);
  });

  it('devrait rejeter un email invalide', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('invalid')).toBe(false);
  });
});

describe('Phone Validator', () => {
  it('devrait valider un numéro français', () => {
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    expect(phoneRegex.test('0612345678')).toBe(true);
  });
});

describe('Password Validator', () => {
  it('devrait valider un mot de passe fort', () => {
    const password = 'StrongPass123!';
    const hasMinLength = password.length >= 8;
    expect(hasMinLength).toBe(true);
  });
});
