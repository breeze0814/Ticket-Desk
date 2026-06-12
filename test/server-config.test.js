import { describe, expect, test } from 'vitest';
import { getInternalPort } from '../src/server-config.js';

describe('server port configuration', () => {
  test('keeps the internal listen port fixed when PORT is set for Docker', () => {
    const previousPort = process.env.PORT;
    process.env.PORT = '30022';

    try {
      expect(getInternalPort()).toBe(3000);
    } finally {
      process.env.PORT = previousPort;
    }
  });
});
