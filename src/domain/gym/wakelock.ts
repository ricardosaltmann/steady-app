/**
 * Screen WakeLock API wrapper.
 * Keeps the mobile display awake during active workouts and clinical injection procedures,
 * preventing screen timeout lockouts.
 *
 * Automatically re-acquires the lock on `visibilitychange` if the user briefly switches apps.
 */

let sentinel: any = null;
let isWanted: boolean = false;
let isPending: boolean = false;

export const isWakeLockSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
};

async function acquireWakeLock() {
  if (!isWanted || sentinel || isPending || !isWakeLockSupported()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

  isPending = true;
  try {
    const s = await (navigator as any).wakeLock.request('screen');
    if (!isWanted) {
      s.release().catch(() => {});
      return;
    }
    sentinel = s;
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
    });
  } catch (err) {
    // Silently handle low power mode or battery restrictions
    sentinel = null;
  } finally {
    isPending = false;
  }
}

const onVisibilityChange = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    acquireWakeLock();
  }
};

export function requestWakeLock() {
  if (isWanted) return;
  isWanted = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  acquireWakeLock();
}

export function releaseWakeLock() {
  isWanted = false;
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
  const s = sentinel;
  sentinel = null;
  if (s) {
    s.release().catch(() => {});
  }
}
