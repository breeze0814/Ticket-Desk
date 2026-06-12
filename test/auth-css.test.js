import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const authCss = readFileSync(new URL('../public/auth.css', import.meta.url), 'utf8');

describe('auth modal CSS', () => {
  test('keeps hidden auth modal out of layout', () => {
    expect(authCss).toMatch(/\[hidden\]\s*\{[^}]*display:\s*none\s*!important;[^}]*\}/s);
  });
});
