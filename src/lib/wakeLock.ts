let sentinel: WakeLockSentinel | null = null;
let wanted = false;

export function wakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

async function request(): Promise<void> {
  if (!wanted || !wakeLockSupported() || document.visibilityState !== 'visible') return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    // The session may have ended while we were waiting
    if (!wanted) {
      void lock.release();
      return;
    }
    void sentinel?.release();
    sentinel = lock;
  } catch {
    sentinel = null;
  }
}

// The browser drops the lock when the page is hidden, so ask again on return
function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') void request();
}

export function keepScreenOn(): void {
  wanted = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  void request();
}

export function allowScreenOff(): void {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  void sentinel?.release();
  sentinel = null;
}
