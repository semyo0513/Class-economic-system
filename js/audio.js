// ============================================================
// Web Audio API 기반 레트로/코지 사운드 엔진 (js/audio.js)
// ============================================================

const SoundEngine = (() => {
  let ctx = null;
  let isMuted = false;
  let bgmOsc = null;
  let bgmGain = null;
  let isBgmPlaying = false;

  function initAudio() {
    try {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) ctx = new AudioCtx();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (_) {}
  }

  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, pitchDecay = 0) {
    if (isMuted) return;
    try {
      initAudio();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (pitchDecay !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDecay), ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  return {
    init: initAudio,
    toggleMute: () => {
      isMuted = !isMuted;
      return isMuted;
    },
    getMuted: () => isMuted,
    click: () => {
      try { playTone(480, 'triangle', 0.06, 0.08); } catch (_) {}
    },
    step: () => {
      try { playTone(180 + Math.random() * 40, 'triangle', 0.04, 0.03); } catch (_) {}
    },
    coin: () => {
      try {
        playTone(987.77, 'sine', 0.08, 0.1);
        setTimeout(() => playTone(1318.51, 'sine', 0.15, 0.1), 80);
      } catch (_) {}
    },
    enter: () => {
      try {
        playTone(523.25, 'sine', 0.1, 0.08);
        setTimeout(() => playTone(659.25, 'sine', 0.1, 0.08), 90);
        setTimeout(() => playTone(783.99, 'sine', 0.2, 0.08), 180);
      } catch (_) {}
    },
    open: () => {
      try { playTone(600, 'sine', 0.1, 0.06, 300); } catch (_) {}
    },
    close: () => {
      try { playTone(700, 'sine', 0.1, 0.05, -300); } catch (_) {}
    },
    scratch: () => {
      try { playTone(1200 + Math.random() * 800, 'sawtooth', 0.03, 0.02); } catch (_) {}
    },
    snap: () => {
      try { playTone(350, 'triangle', 0.08, 0.09, 150); } catch (_) {}
    },
    fanfare: () => {
      try {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, idx) => {
          setTimeout(() => playTone(n, 'triangle', 0.2, 0.12), idx * 100);
        });
      } catch (_) {}
    },
    toggleBGM: () => {
      try {
        initAudio();
        if (!ctx) return false;

        if (isBgmPlaying) {
          if (bgmGain) {
            bgmGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
            setTimeout(() => {
              if (bgmOsc) bgmOsc.stop();
              isBgmPlaying = false;
            }, 500);
          }
          return false;
        } else {
          isBgmPlaying = true;
          const melody = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66];
          let noteIdx = 0;
          const playNextNote = () => {
            if (!isBgmPlaying || isMuted) {
              if (isBgmPlaying) setTimeout(playNextNote, 600);
              return;
            }
            const freq = melody[noteIdx % melody.length];
            noteIdx++;
            playTone(freq, 'sine', 0.45, 0.025);
            setTimeout(playNextNote, 450);
          };
          playNextNote();
          return true;
        }
      } catch (_) {
        return false;
      }
    }
  };
})();
