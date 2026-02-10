import { describe, expect, it } from 'bun:test';
import {
  buildQueryString,
  cn,
  getInitials,
  getNestedValue,
  parseDisplayName,
  parseQueryString,
  pluralize,
  safeJsonParse,
  truncate,
} from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false, 'baz')).toBe('foo baz');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello w...');
  });

  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('getInitials', () => {
  it('returns initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial from single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('returns max 2 initials', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });
});

describe('parseQueryString', () => {
  it('parses query string to object', () => {
    expect(parseQueryString('?foo=bar&baz=qux')).toEqual({
      foo: 'bar',
      baz: 'qux',
    });
  });

  it('handles empty string', () => {
    expect(parseQueryString('')).toEqual({});
  });
});

describe('buildQueryString', () => {
  it('builds query string from object', () => {
    const result = buildQueryString({ foo: 'bar', baz: 'qux' });
    expect(result).toBe('foo=bar&baz=qux');
  });

  it('filters out undefined values', () => {
    const result = buildQueryString({ foo: 'bar', baz: undefined });
    expect(result).toBe('foo=bar');
  });

  it('filters out empty string values', () => {
    const result = buildQueryString({ foo: 'bar', baz: '' });
    expect(result).toBe('foo=bar');
  });
});

describe('parseDisplayName', () => {
  it('parses full name', () => {
    expect(parseDisplayName('John Doe')).toEqual({
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('handles single name', () => {
    expect(parseDisplayName('John')).toEqual({
      firstName: 'John',
      lastName: '',
    });
  });

  it('handles null', () => {
    expect(parseDisplayName(null)).toEqual({
      firstName: '',
      lastName: '',
    });
  });

  it('handles undefined', () => {
    expect(parseDisplayName(undefined)).toEqual({
      firstName: '',
      lastName: '',
    });
  });

  it('handles multi-part last name', () => {
    expect(parseDisplayName('John Michael Doe')).toEqual({
      firstName: 'John',
      lastName: 'Michael Doe',
    });
  });
});

describe('pluralize', () => {
  it('returns singular for count of 1', () => {
    expect(pluralize(1, 'item')).toBe('item');
  });

  it('returns plural for count of 0', () => {
    expect(pluralize(0, 'item')).toBe('items');
  });

  it('returns plural for count > 1', () => {
    expect(pluralize(5, 'item')).toBe('items');
  });

  it('uses custom plural form', () => {
    expect(pluralize(2, 'person', 'people')).toBe('people');
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"foo":"bar"}', {})).toEqual({ foo: 'bar' });
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
  });
});

describe('getNestedValue', () => {
  it('gets nested value by path', () => {
    const obj = { a: { b: { c: 'value' } } };
    expect(getNestedValue<string>(obj as Record<string, unknown>, 'a.b.c')).toBe('value');
  });

  it('returns undefined for missing path', () => {
    const obj = { a: { b: 1 } };
    expect(getNestedValue(obj as Record<string, unknown>, 'a.c')).toBeUndefined();
  });
});
