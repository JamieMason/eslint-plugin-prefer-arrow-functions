import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS } from '../src/config';
import plugin, { configs, meta, rules } from '../src/index';
import { preferArrowFunctions } from '../src/rule';

describe('exported plugin', () => {
  it('exposes the exact rule object created by RuleCreator', () => {
    expect(rules['prefer-arrow-functions']).toBe(preferArrowFunctions);
    expect(rules['prefer-arrow-functions']).toHaveProperty('defaultOptions', [DEFAULT_OPTIONS]);
  });

  it('wires meta, rules, and configs onto the default export', () => {
    expect(plugin.meta).toBe(meta);
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
    expect(meta.name).toBe('eslint-plugin-prefer-arrow-functions');
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('references the plugin itself from the shared config `all`', () => {
    expect(configs.all.plugins).toEqual({ 'prefer-arrow-functions': plugin });
    expect(configs.all.rules).toEqual({
      'prefer-arrow-functions/prefer-arrow-functions': 'warn',
    });
  });

  it('lints and autofixes through ESLint using the shared config `all`', () => {
    const linter = new Linter();
    const code = 'function foo() { return 1; }';

    const messages = linter.verify(code, configs.all);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      ruleId: 'prefer-arrow-functions/prefer-arrow-functions',
      severity: 1,
    });

    const { fixed, output } = linter.verifyAndFix(code, configs.all);
    expect(fixed).toBe(true);
    expect(output).toBe('const foo = () => 1;');
  });
});
