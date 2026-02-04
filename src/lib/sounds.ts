// Sound utility for playing notification sounds

const SOUNDS = {
  club_call: '/sounds/club_call.mp3',
  recipe_dropped: '/sounds/recipe_dropped.mp3',
  bake_started: '/sounds/bake_started.mp3',
} as const;

type SoundType = keyof typeof SOUNDS;

// Store for pending sounds (unplayed notifications)
const PENDING_KEY = 'chomp_pending_sounds';

// Audio context for PWA compatibility
let audioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Unlock audio on first user interaction (required for iOS PWA)
export function unlockAudio(): void {
  if (audioUnlocked) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // Play a silent buffer to unlock
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  audioUnlocked = true;
  console.log('[sounds] Audio unlocked');
}

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
      console.log('[sounds] Added pending sound:', type);
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

  console.log('[sounds] Attempting to play:', type);

  try {
    // Ensure audio context is running
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audio = new Audio(src);
    audio.volume = 0.5;
    await audio.play();
    console.log('[sounds] Played successfully:', type);
  } catch (err) {
    console.warn('[sounds] Could not play sound:', err);
    // Store as pending if autoplay was blocked
    if (err instanceof Error && err.name === 'NotAllowedError') {
      addPendingSound(type);
    }
  }
}

export async function playPendingSounds(): Promise<void> {
  const pending = getPendingSounds();
  if (pending.length === 0) return;

  console.log('[sounds] Playing pending sounds:', pending);

  // Play the most important sound (priority: club_call > recipe_dropped > bake_started)
  const priority: SoundType[] = ['club_call', 'recipe_dropped', 'bake_started'];
  const toPlay = priority.find(type => pending.includes(type));

  if (toPlay) {
    await playSound(toPlay);
  }

  clearPendingSounds();
}

export function initSoundHandler(): void {
  // Unlock audio on any user interaction
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
  const handleUnlock = () => {
    unlockAudio();
    // Also try to play pending sounds on interaction
    playPendingSounds();
  };

  unlockEvents.forEach(event => {
    document.addEventListener(event, handleUnlock, { once: false, passive: true });
  });

  // Check for pending sounds on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[sounds] App became visible, checking pending sounds');
      // Try to play, will be stored again if blocked
      setTimeout(() => playPendingSounds(), 300);
    }
  });

  // Check on initial load
  if (document.visibilityState === 'visible') {
    setTimeout(() => playPendingSounds(), 500);
  }

  console.log('[sounds] Sound handler initialized');
}
