import { describe, it, expect } from 'vitest';
import { analyzePassword } from '../passwordStrength';

describe('analyzePassword', () => {
  it('returns empty label for empty string', () => {
    const r = analyzePassword('');
    expect(r.label).toBe('');
    expect(r.score).toBe(0);
    expect(Object.values(r.checks).every((v) => v === false)).toBe(true);
  });

  it('scores Weak for password shorter than 8 chars', () => {
    const r = analyzePassword('Ab1!');
    expect(r.score).toBe(0);
    expect(r.label).toBe('Weak');
    expect(r.checks.length).toBe(false);
  });

  it('scores Weak for all-same-character password', () => {
    const r = analyzePassword('aaaaaaaaa');
    expect(r.score).toBe(0);
    expect(r.label).toBe('Weak');
    expect(r.checks.noWeakPattern).toBe(false);
  });

  it('scores Weak for sequential digits pattern', () => {
    const r = analyzePassword('abc12345xyz');
    expect(r.score).toBe(0);
    expect(r.label).toBe('Weak');
    expect(r.checks.noWeakPattern).toBe(false);
  });

  it('scores Weak for keyboard walk (qwerty)', () => {
    const r = analyzePassword('qwertypass1');
    expect(r.score).toBe(0);
    expect(r.checks.noWeakPattern).toBe(false);
  });

  it('scores Weak for "password" variant', () => {
    const r = analyzePassword('Passw0rd!');
    expect(r.score).toBe(0);
    expect(r.checks.noWeakPattern).toBe(false);
  });

  it('scores Weak for lowercase-only without mix', () => {
    const r = analyzePassword('abcdefghij');
    expect(r.score).toBe(0);
    expect(r.checks.upper).toBe(false);
    expect(r.checks.number).toBe(false);
  });

  it('scores Fair for 8+ chars with 2 char types (lower + upper)', () => {
    const r = analyzePassword('AbcdefGhi');
    expect(r.score).toBe(1);
    expect(r.label).toBe('Fair');
  });

  it('scores Good for 8+ chars with 3 char types', () => {
    const r = analyzePassword('Abcdef7hi');
    expect(r.score).toBe(2);
    expect(r.label).toBe('Good');
    expect(r.checks.upper).toBe(true);
    expect(r.checks.lower).toBe(true);
    expect(r.checks.number).toBe(true);
    expect(r.checks.symbol).toBe(false);
  });

  it('scores Strong for 8+ chars with all 4 char types', () => {
    const r = analyzePassword('Abc!7xyz9');
    expect(r.score).toBe(3);
    expect(r.label).toBe('Strong');
    expect(r.checks.upper).toBe(true);
    expect(r.checks.lower).toBe(true);
    expect(r.checks.number).toBe(true);
    expect(r.checks.symbol).toBe(true);
  });

  it('scores Strong for a long complex password', () => {
    const r = analyzePassword('Xk9#mPqR2vW!');
    expect(r.score).toBe(3);
    expect(r.label).toBe('Strong');
    expect(r.checks.longEnough).toBe(true);
  });

  it('longEnough is false for 8-char password', () => {
    const r = analyzePassword('Ab1!efGh');
    expect(r.checks.length).toBe(true);
    expect(r.checks.longEnough).toBe(false);
  });

  it('longEnough is true for 12+ char password', () => {
    const r = analyzePassword('Ab1!efGhIjKl');
    expect(r.checks.longEnough).toBe(true);
  });

  it('symbol check catches various special characters', () => {
    // 'Password@1' has a symbol but is weak due to the "password" pattern
    expect(analyzePassword('Password@1').checks.noWeakPattern).toBe(false);
    expect(analyzePassword('Password@1').checks.symbol).toBe(true); // symbol IS present; weakness is the pattern
    expect(analyzePassword('Abcdef7hi!').checks.symbol).toBe(true);
    expect(analyzePassword('Abcdef7hi#').checks.symbol).toBe(true);
  });

});
