import { describe, expect, it } from 'bun:test';
import { normalizeUserGroupIds } from './migration';

describe('normalizeUserGroupIds', () => {
  it('should return groupIds when present as non-empty array', () => {
    const data = { groupIds: ['admin', 'users'] };
    expect(normalizeUserGroupIds(data)).toEqual(['admin', 'users']);
  });

  it('should return empty array when groupIds is absent', () => {
    const data = {};
    expect(normalizeUserGroupIds(data)).toEqual([]);
  });

  it('should return empty array when groupIds is empty array', () => {
    const data = { groupIds: [] };
    expect(normalizeUserGroupIds(data)).toEqual([]);
  });

  it('should return empty array when groupIds is not an array', () => {
    const data = { groupIds: 'admin' };
    expect(normalizeUserGroupIds(data as any)).toEqual([]);
  });
});
