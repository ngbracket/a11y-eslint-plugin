import { describe, expect, it } from 'vitest';
import plugin from '../src/index';
import pkg from '../package.json';

describe('plugin meta', () => {
  it('matches package.json', () => {
    expect(plugin.meta.name).toBe(pkg.name);
    expect(plugin.meta.version).toBe(pkg.version);
  });
});
