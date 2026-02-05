// Sound utility for playing notification sounds
// Simplified approach matching cooling app

const SOUNDS = {
  club_call: '/sounds/club_call.mp3',
  recipe_dropped: '/sounds/recipe_dropped.mp3',
  bake_started: '/sounds/bake_started.mp3',
} as const;

type SoundType = keyof typeof SOUNDS;

// Preloaded audio elements (like cooling app)
const audioElements: Partial<Record<SoundType, HTMLAudioElement>> = {};

// Preload all sounds on init
export function preloadSounds(): void {
  (Object.keys(SOUNDS) as SoundType[]).forEach(type => {
    const audio = new Audio(SOUNDS[type]);
    audio.preload = 'auto';
    audio.volume = 0.5;
    audioElements[type] = audio;
  });
  console.log('[sounds] Preloaded all sounds');
}

// Play a sound (simple approach from cooling app)
export function playSound(type: SoundType): void {
  const audio = audioElements[type];
  if (!audio) {
    console.warn('[sounds] Audio not preloaded:', type);
    return;
  }

  console.log('[sounds] Playing:', type);
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay may be blocked, store as pending
      console.log('[sounds] Autoplay blocked, storing pending:', type);
      addPendingSound(type);
    });
  } catch (e) {
    console.warn('[sounds] Play error:', e);
  }
}

// Pending sounds storage (fallback for autoplay blocked)
const PENDING_KEY = 'chomp_pending_sounds';

function getPendingSounds(): SoundType[] {
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

function clearPendingSounds(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Ignore errors
  }
}

export function playPendingSounds(): void {
  const pending = getPendingSounds();
  if (pending.length === 0) return;

  console.log('[sounds] Playing pending sounds:', pending);

  // Play highest priority sound
  const priority: SoundType[] = ['club_call', 'recipe_dropped', 'bake_started'];
  const toPlay = priority.find(type => pending.includes(type));

  if (toPlay) {
    playSound(toPlay);
  }

  clearPendingSounds();
}

// Initialize sound handler
export function initSoundHandler(): void {
  // Preload sounds immediately
  preloadSounds();

  // Play pending sounds on user interaction
  const handleInteraction = () => {
    playPendingSounds();
  };

  ['touchstart', 'touchend', 'click'].forEach(event => {
    document.addEventListener(event, handleInteraction, { passive: true });
  });

  console.log('[sounds] Sound handler initialized');
}
