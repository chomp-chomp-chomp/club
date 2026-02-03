// Sound utility for playing notification sounds

const SOUNDS = {
  club_call: '/sounds/club_call.mp3',
  recipe_dropped: '/sounds/recipe_dropped.mp3',
  bake_started: '/sounds/bake_started.mp3',
} as const;

type SoundType = keyof typeof SOUNDS;

// Store for pending sounds (unplayed notifications)
const PENDING_KEY = 'chomp_pending_sounds';

export function getPendingSounds(): SoundType[] {
  try {
    const stored = localStorage.getItem(PENDING_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addPendingSound(type: SoundType): void {
  try {
    const pending = getPendingSounds();
    if (!pending.includes(type)) {
      pending.push(type);
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    }
  } catch {
    // Ignore errors
  }
}

export function clearPendingSounds(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Ignore errors
  }
}

export async function playSound(type: SoundType): Promise<void> {
  const src = SOUNDS[type];
  if (!src) return;

  try {
    const audio = new Audio(src);
    audio.volume = 0.5;
    await audio.play();
  } catch (err) {
    console.warn('Could not play sound:', err);
  }
}

export async function playPendingSounds(): Promise<void> {
  const pending = getPendingSounds();
  if (pending.length === 0) return;

  // Play the most important sound (priority: club_call > recipe_dropped > bake_started)
  const priority: SoundType[] = ['club_call', 'recipe_dropped', 'bake_started'];
  const toPlay = priority.find(type => pending.includes(type));

  if (toPlay) {
    await playSound(toPlay);
  }

  clearPendingSounds();
}

// Check visibility change and play sounds when app becomes visible
let hasPlayed = false;

export function initSoundHandler(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !hasPlayed) {
      hasPlayed = true;
      // Small delay to ensure app is ready
      setTimeout(() => {
        playPendingSounds();
      }, 500);
    }
  });

  // Also check on initial load if app is visible
  if (document.visibilityState === 'visible') {
    hasPlayed = true;
    setTimeout(() => {
      playPendingSounds();
    }, 1000);
  }
}
