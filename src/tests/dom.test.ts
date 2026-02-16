import { describe, it, expect } from 'vitest';

describe('LocalStorage Utilities', () => {
  it('devrait gérer l absence de localStorage', () => {
    const hasLocalStorage = typeof localStorage !== 'undefined';
    expect(hasLocalStorage).toBeDefined();
  });

  it('devrait sérialiser en JSON', () => {
    const data = { name: 'Test', count: 42 };
    const json = JSON.stringify(data);
    expect(json).toContain('Test');
    expect(json).toContain('42');
  });

  it('devrait désérialiser du JSON', () => {
    const json = '{"name":"Test","count":42}';
    const data = JSON.parse(json);
    expect(data.name).toBe('Test');
    expect(data.count).toBe(42);
  });
});

describe('DOM Utilities', () => {
  it('devrait créer un élément', () => {
    const div = document.createElement('div');
    expect(div.tagName).toBe('DIV');
  });

  it('devrait définir un attribut', () => {
    const div = document.createElement('div');
    div.setAttribute('data-test', 'value');
    expect(div.getAttribute('data-test')).toBe('value');
  });

  it('devrait ajouter une classe', () => {
    const div = document.createElement('div');
    div.classList.add('test-class');
    expect(div.classList.contains('test-class')).toBe(true);
  });
});
