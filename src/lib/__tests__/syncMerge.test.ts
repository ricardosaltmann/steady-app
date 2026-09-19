import { describe, it, expect } from 'vitest';
import { mergeCollections } from '../syncMerge';

describe('syncMerge (mergeCollections)', () => {
  it('prefers local item when local updatedAt is newer than cloud', () => {
    const local = [
      { id: '1', name: 'Item Local Newer', updatedAt: '2026-09-18T12:00:00Z' }
    ];
    const cloud = [
      { id: '1', name: 'Item Cloud Older', updatedAt: '2026-09-18T10:00:00Z' }
    ];

    const result = mergeCollections(local, cloud);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].name).toBe('Item Local Newer');
    expect(result.itemsToPushToCloud).toHaveLength(1);
    expect(result.itemsToPushToCloud[0].id).toBe('1');
  });

  it('prefers cloud item when cloud updatedAt is newer than local', () => {
    const local = [
      { id: '1', name: 'Item Local Older', updatedAt: '2026-09-18T08:00:00Z' }
    ];
    const cloud = [
      { id: '1', name: 'Item Cloud Newer', updatedAt: '2026-09-18T14:00:00Z' }
    ];

    const result = mergeCollections(local, cloud);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].name).toBe('Item Cloud Newer');
    expect(result.itemsToPushToCloud).toHaveLength(0);
  });

  it('preserves local-only items and schedules them for cloud push', () => {
    const local = [
      { id: 'local_only', name: 'Local Only', updatedAt: '2026-09-18T12:00:00Z' }
    ];
    const cloud: any[] = [];

    const result = mergeCollections(local, cloud);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].id).toBe('local_only');
    expect(result.itemsToPushToCloud).toHaveLength(1);
  });

  it('includes cloud-only items without queuing for push', () => {
    const local: any[] = [];
    const cloud = [
      { id: 'cloud_only', name: 'Cloud Only', updatedAt: '2026-09-18T12:00:00Z' }
    ];

    const result = mergeCollections(local, cloud);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].id).toBe('cloud_only');
    expect(result.itemsToPushToCloud).toHaveLength(0);
  });
});
