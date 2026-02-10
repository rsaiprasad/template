import { describe, expect, it } from 'bun:test';
import { normalizeUserGroupIds } from './migration';

describe('normalizeUserGroupIds', () => {
  it('should return groupIds when present as non-empty array', () => {
    const data = { groupIds: ['admin', 'users'] };
    expect(normalizeUserGroupIds(data)).toEqual(['admin', 'users']);
  });

  it('should fall back to groupId string when groupIds is absent', () => {
    const data = { groupId: 'admin' };
    expect(normalizeUserGroupIds(data)).toEqual(['admin']);
  });

  it('should fall back to groupId when groupIds is empty array', () => {
    const data = { groupIds: [], groupId: 'users' };
    expect(normalizeUserGroupIds(data)).toEqual(['users']);
  });

  it('should return empty array when neither field is set', () => {
    expect(normalizeUserGroupIds({})).toEqual([]);
  });

  it('should return empty array when groupId is empty string', () => {
    expect(normalizeUserGroupIds({ groupId: '' })).toEqual([]);
  });

  it('should prefer groupIds over groupId when both are valid', () => {
    const data = { groupIds: ['admin'], groupId: 'users' };
    expect(normalizeUserGroupIds(data)).toEqual(['admin']);
  });
});
