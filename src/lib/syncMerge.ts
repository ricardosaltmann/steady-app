/**
 * Safe two-way merge for collections between local storage and cloud (Supabase)
 * Prevents cloud pulls from overwriting newer local modifications.
 */
export function mergeCollections<T extends { id: string; updatedAt?: string; date?: string; createdAt?: string }>(
  localList: T[],
  cloudList: T[]
): { merged: T[]; itemsToPushToCloud: T[] } {
  const cloudMap = new Map<string, T>();
  (cloudList || []).forEach(item => {
    if (item && item.id) cloudMap.set(item.id, item);
  });

  const mergedMap = new Map<string, T>();
  const itemsToPushToCloud: T[] = [];

  // Process all local items
  (localList || []).forEach(localItem => {
    if (!localItem || !localItem.id) return;
    const cloudItem = cloudMap.get(localItem.id);

    if (!cloudItem) {
      // Local item not present in cloud -> keep locally and queue to sync to cloud
      mergedMap.set(localItem.id, localItem);
      itemsToPushToCloud.push(localItem);
    } else {
      // Present in both -> compare timestamps
      const localTime = new Date(localItem.updatedAt || localItem.date || localItem.createdAt || 0).getTime();
      const cloudTime = new Date(cloudItem.updatedAt || cloudItem.date || cloudItem.createdAt || 0).getTime();

      if (localTime >= cloudTime) {
        mergedMap.set(localItem.id, localItem);
        if (localTime > cloudTime) {
          itemsToPushToCloud.push(localItem);
        }
      } else {
        // Cloud is newer
        mergedMap.set(localItem.id, cloudItem);
      }
    }
  });

  // Process any cloud items not found in local state
  (cloudList || []).forEach(cloudItem => {
    if (cloudItem && cloudItem.id && !mergedMap.has(cloudItem.id)) {
      mergedMap.set(cloudItem.id, cloudItem);
    }
  });

  return {
    merged: Array.from(mergedMap.values()),
    itemsToPushToCloud,
  };
}
