/* ==========================================================================
   Valentine Duck — Main Script
   ========================================================================== */

(function () {
  'use strict';

  /* ── Image Map ────────────────────────────────────────────────────────── */
  // Index 0 = success (in love), 1 = default (happy), 2–8 = anger escalation
  const DUCK_IMAGES = [
    'images/0inlove_duck.png',         // success state
    'images/1happy_duck.jpg',           // default
    'images/2neutral_duck.png',         // 1st escape
    'images/3little_annoyed_duck.png',  // 2nd escape
    'images/4little_more_annoyed.png',  // 3rd escape
    'images/5more_annoyed.png',         // 4th escape
    'images/6moremoreannoyed_duck.png', // 5th escape
    'images/7veryvery_annoyed.png',     // 6th escape
    'images/sora_clipped_gif.gif'       // 7th escape (gif)
  ];
  // 8th+ escape → meltdown: gif swaps to real photo, everything else falls

  /* ── Anger Captions (indices 1–8 match DUCK_IMAGES) ───────────────────── */
  const ANGER_CAPTIONS = [
    '',                    // 0: success (unused here)
    '',                    // 1: default — no caption
    'Hmm... \u{1F928}',   // 2: neutral
    'Hey! \u{1F620}',     // 3: little annoyed
    'Stop that! \u{1F621}', // 4: more annoyed
    'I said STOP! \u{1F624}', // 5: even more
    'SERIOUSLY?! \u{1F92C}',  // 6: steaming
    'CLICK YES!! \u{1F4A2}',  // 7: very angry
    'JUST. CLICK. YES. \u{1F621}\u{1F4A2}\u{1F621}' // 8: gif level
  ];

  /* ── State ────────────────────────────────────────────────────────────── */
  const state = {
    moodIndex: 1,      // current image index (1 = default happy)
    escapeCount: 0,
    success: false,
    reducedMotion: false,
    focusEscapes: 0
  };

  /* ── DOM References ───────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const btnYes    = $('btn-yes');
  const btnNo     = $('btn-no');
  const headline  = $('headline');
  const caption   = $('anger-caption');
  const canvas    = $('confetti-canvas');
  const ctx       = canvas.getContext('2d');
  const duckImg      = $('duck-img');
  const signText     = $('sign-text');
  const announcer    = $('sr-announcer');
  const clickHint    = $('click-hint');
  const duckWrapper  = document.querySelector('.duck-wrapper');
  const woodenSign   = document.querySelector('.wooden-sign');

  const REAL_PHOTO = 'images/happy_alex.jpeg';

  /* ── Preload all images ───────────────────────────────────────────────── */
  DUCK_IMAGES.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
  // Also preload the real photo for success crossfade
  { const img = new Image(); img.src = REAL_PHOTO; }

  /* ── setDuckMood(imageIndex) ──────────────────────────────────────────── */
  function setDuckMood(imageIndex) {
    // Clamp to valid range (1–8 for anger states)
    const idx = Math.max(1, Math.min(8, imageIndex));
    state.moodIndex = idx;

    // Swap image
    duckImg.src = DUCK_IMAGES[idx];

    // Update caption
    caption.textContent = ANGER_CAPTIONS[idx];

    // Shake animation on anger (level 3+)
    if (idx >= 3) {
      duckImg.classList.remove('shake');
      void duckImg.offsetWidth; // force reflow to restart animation
      duckImg.classList.add('shake');
    }
  }

  /* ── moveNoButton() ───────────────────────────────────────────────────── */
  function moveNoButton() {
    if (state.success) return;

    // Keyboard accessibility: stop escaping after 8 focus-escapes
    if (document.activeElement === btnNo) {
      state.focusEscapes++;
      if (state.focusEscapes > 8) return;
    }

    state.escapeCount++;

    // Map escape count → image index (2–8), capped at 8
    const newMoodIndex = Math.min(8, state.escapeCount + 1);

    // 8th+ escape (already showing gif) → meltdown
    if (state.escapeCount > 7) {
      triggerMeltdown();
      return;
    }

    setDuckMood(newMoodIndex);

    // Make the button fixed-positioned if not already
    if (!btnNo.classList.contains('escaping')) {
      const rect = btnNo.getBoundingClientRect();
      btnNo.classList.add('escaping');
      btnNo.style.top = rect.top + 'px';
      btnNo.style.left = rect.left + 'px';
      void btnNo.offsetWidth; // reflow so transition starts from here
    }

    // Measure button and viewport
    const btnRect = btnNo.getBoundingClientRect();
    const btnW = btnRect.width;
    const btnH = btnRect.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 20;
    const yesRect = btnYes.getBoundingClientRect();

    // Find a non-overlapping position (up to 15 attempts)
    let newX, newY;
    for (let i = 0; i < 15; i++) {
      newX = margin + Math.random() * (vw - btnW - margin * 2);
      newY = margin + Math.random() * (vh - btnH - margin * 2);

      // Check overlap with "Yes" button (with padding)
      const pad = 20;
      const overlaps =
        newX < yesRect.right + pad &&
        newX + btnW > yesRect.left - pad &&
        newY < yesRect.bottom + pad &&
        newY + btnH > yesRect.top - pad;

      if (!overlaps) break;
    }

    // Apply new position
    btnNo.style.left = newX + 'px';
    btnNo.style.top = newY + 'px';

    // Screen reader announcement
    announce('The No button escaped! The duck is getting ' +
      (newMoodIndex <= 3 ? 'annoyed' : 'angry') + '.');
  }

  /* ── triggerMeltdown() — everything falls except image + Yes button ─── */
  const btnContainer = document.querySelector('.button-container');

  function triggerMeltdown() {
    // Swap gif to the real photo
    duckImg.src = REAL_PHOTO;
    duckImg.classList.remove('shake');

    const vh = window.innerHeight;
    const margin = 10; // px from bottom edge

    // Calculate fall distance for each flow element so it lands at viewport bottom
    function setFallDistance(el) {
      const rect = el.getBoundingClientRect();
      const dist = vh - rect.bottom + rect.height - margin;
      el.style.setProperty('--fall-distance', dist + 'px');
    }

    setFallDistance(woodenSign);
    setFallDistance(caption);

    woodenSign.classList.add('fall');
    caption.classList.add('fall');

    // No button is fixed-positioned — set target top value
    const noRect = btnNo.getBoundingClientRect();
    btnNo.style.setProperty('--fall-top', (vh - noRect.height - margin) + 'px');
    btnNo.classList.add('fall');

    // Stop floating hearts
    stopFloatingHearts();
    document.querySelectorAll('.floating-heart').forEach(h => h.remove());

    // Move Yes button below the image and drop the container
    setTimeout(() => {
      duckWrapper.insertAdjacentElement('afterend', btnYes);
      btnYes.classList.add('solo');
      setFallDistance(btnContainer);
      btnContainer.classList.add('fall');
    }, 400);
  }

  /* ── setSuccessState() ────────────────────────────────────────────────── */
  let showingDuck = true; // tracks which image is showing for toggle

  function setSuccessState() {
    if (state.success) return;
    state.success = true;

    // If meltdown happened, undo the solo button and restore scene
    if (btnYes.classList.contains('solo')) {
      btnYes.classList.remove('solo');
      woodenSign.classList.remove('fall');
      caption.classList.remove('fall');
    }

    // Show headline
    headline.classList.add('visible');

    // Swap to in-love duck
    duckImg.src = DUCK_IMAGES[0];
    duckImg.classList.remove('shake');
    duckImg.style.opacity = '1';

    // Update sign text
    signText.innerHTML =
      '<tspan x="150" y="44" font-size="18"></tspan>' +
      '<tspan x="150" y="66" font-size="20">Yes! \u{1F495}</tspan>';

    // Update caption
    caption.textContent = 'I love you! \u{1F496}';
    caption.style.color = 'var(--pink-dark)';

    // Hide No button
    btnNo.classList.add('hidden');

    // Disable Yes button re-click
    btnYes.disabled = true;
    btnYes.style.cursor = 'default';

    // Launch confetti
    launchConfetti();

    // Announce to screen reader
    announce('Yaaay! The duck is so happy! You said yes!');

    // Make image clickable to toggle between duck and real photo
    duckImg.classList.add('clickable');
    clickHint.classList.add('visible');
    showingDuck = true;

    duckImg.addEventListener('click', toggleDuckPhoto);
  }

  /* ── Toggle between duck and real photo on click ──────────────────────── */
  function toggleDuckPhoto() {
    if (showingDuck) {
      duckImg.src = REAL_PHOTO;
      clickHint.classList.remove('visible');
    } else {
      duckImg.src = DUCK_IMAGES[0];
    }
    showingDuck = !showingDuck;
  }

  /* ── Confetti System ──────────────────────────────────────────────────── */
  let confettiParticles = [];
  let confettiRunning = false;

  function launchConfetti() {
    if (state.reducedMotion) return;

    const colors = [
      '#e91e63', '#f48fb1', '#ff6090',
      '#FFD93D', '#ff8a65', '#ce93d8',
      '#ef5350', '#fff176'
    ];

    confettiParticles = [];
    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.4,
        y: canvas.height * 0.4,
        dx: (Math.random() - 0.5) * 12,
        dy: -(Math.random() * 12 + 4),
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        gravity: 0.12 + Math.random() * 0.06,
        opacity: 1
      });
    }

    confettiRunning = true;
    requestAnimationFrame(animateConfetti);

    // Stop spawning after 4 seconds
    setTimeout(() => { confettiRunning = false; }, 4000);
  }

  function animateConfetti() {
    if (!confettiRunning && confettiParticles.every(p => p.opacity <= 0)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of confettiParticles) {
      p.x += p.dx;
      p.dy += p.gravity;
      p.y += p.dy;
      p.dx *= 0.99;
      p.rotation += p.rotationSpeed;

      if (p.y > canvas.height * 0.7 || !confettiRunning) {
        p.opacity -= 0.015;
      }
      if (p.opacity <= 0) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    requestAnimationFrame(animateConfetti);
  }

  /* ── Floating Hearts (Background Decoration) ─────────────────────────── */
  let heartTimeout = null;
  const HEART_CHARS = ['\u{1F497}', '\u{1F495}', '\u{1F496}', '\u{2764}\u{FE0F}', '\u{1F49C}'];

  function spawnHeart() {
    if (state.reducedMotion) return;

    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.textContent = HEART_CHARS[Math.floor(Math.random() * HEART_CHARS.length)];
    heart.style.left = (5 + Math.random() * 90) + 'vw';
    heart.style.bottom = '-2rem';
    heart.style.fontSize = (0.7 + Math.random() * 1.0) + 'rem';
    // Randomize duration and sway per heart via CSS custom properties
    heart.style.setProperty('--heart-duration', (4 + Math.random() * 5) + 's');
    heart.style.setProperty('--heart-sway', ((Math.random() - 0.5) * 80) + 'px');
    document.body.appendChild(heart);

    heart.addEventListener('animationend', () => heart.remove());

    // Schedule next heart with random delay (1–4s)
    heartTimeout = setTimeout(spawnHeart, 1000 + Math.random() * 3000);
  }

  function startFloatingHearts() {
    if (state.reducedMotion) return;
    spawnHeart();
  }

  function stopFloatingHearts() {
    if (heartTimeout) clearTimeout(heartTimeout);
    heartTimeout = null;
  }

  /* ── Screen Reader Announce ───────────────────────────────────────────── */
  function announce(message) {
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  /* ── Canvas Sizing ────────────────────────────────────────────────────── */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before scaling
    ctx.scale(dpr, dpr);
  }

  /* ── Clamp No button on resize ────────────────────────────────────────── */
  function clampNoButton() {
    if (!btnNo.classList.contains('escaping')) return;
    const rect = btnNo.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 20;

    let x = parseFloat(btnNo.style.left) || rect.left;
    let y = parseFloat(btnNo.style.top) || rect.top;

    x = Math.max(margin, Math.min(x, vw - rect.width - margin));
    y = Math.max(margin, Math.min(y, vh - rect.height - margin));

    btnNo.style.left = x + 'px';
    btnNo.style.top = y + 'px';
  }

  /* ── Initialization ───────────────────────────────────────────────────── */
  function init() {
    resizeCanvas();

    // Check reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    state.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      state.reducedMotion = e.matches;
      if (e.matches) stopFloatingHearts();
      else startFloatingHearts();
    });

    // Set initial mood (happy)
    setDuckMood(1);

    // Start background hearts
    startFloatingHearts();

    // ── Event Listeners ──

    btnYes.addEventListener('click', setSuccessState);

    btnNo.addEventListener('mouseenter', moveNoButton);

    btnNo.addEventListener('focus', moveNoButton);

    btnNo.addEventListener('touchstart', (e) => {
      e.preventDefault();
      moveNoButton();
    }, { passive: false });

    // Click fallback (fast cursor) + keyboard mercy
    btnNo.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.focusEscapes > 8) {
        setSuccessState();
      } else {
        moveNoButton();
      }
    });

    window.addEventListener('resize', () => {
      resizeCanvas();
      clampNoButton();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
