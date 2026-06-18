// ========================================
// Liuteria Artigianale — JavaScript
// ========================================

(function () {
  'use strict';

  // --- Language Toggle ---
  const langToggle = document.getElementById('langToggle');
  const htmlEl = document.documentElement;
  let currentLang = 'it';

  function setLanguage(lang) {
    currentLang = lang;
    htmlEl.setAttribute('data-lang', lang);
    htmlEl.setAttribute('lang', lang);

    // Update all translatable elements
    document.querySelectorAll('[data-it]').forEach(function (el) {
      el.innerHTML = el.getAttribute('data-' + lang);
    });

    // Update toggle appearance
    var activeSpan = langToggle.querySelector('.lang-active');
    var inactiveSpan = langToggle.querySelector('.lang-inactive');
    if (lang === 'en') {
      activeSpan.textContent = 'EN';
      inactiveSpan.textContent = 'IT';
    } else {
      activeSpan.textContent = 'IT';
      inactiveSpan.textContent = 'EN';
    }

    // Store preference
    try { localStorage.setItem('luthier-lang', lang); } catch (e) {}
  }

  langToggle.addEventListener('click', function () {
    setLanguage(currentLang === 'it' ? 'en' : 'it');
  });

  // Restore saved language
  try {
    var saved = localStorage.getItem('luthier-lang');
    if (saved) setLanguage(saved);
  } catch (e) {}

  // --- Scroll-triggered Animations ---
  function handleScrollAnimations() {
    var elements = document.querySelectorAll(
      '.section-label, .section-title, .about-grid > *, ' +
      '.instrument-card, .process-step, .contact-intro, .contact-link'
    );

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  handleScrollAnimations();

  // --- Smooth anchor scrolling ---
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ========================================
  // Sound Test — Interactive Instrument Player
  // ========================================

  var audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  // Synthesize a warm string instrument tone using Web Audio API
  function playInstrumentTone(freq, duration) {
    var ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    var now = ctx.currentTime;
    var masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.connect(ctx.destination);

    // Fundamental
    var osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // Sub harmonic (warmth)
    var osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 0.5, now);
    var subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.15, now);

    // Slight detune for richness
    var osc3 = ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(freq * 1.002, now);
    var triGain = ctx.createGain();
    triGain.gain.setValueAtTime(0.06, now);

    // Amplitude envelope (plucked string feel)
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.35, now + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + duration * 0.3);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(masterGain);
    osc2.connect(subGain).connect(masterGain);
    osc3.connect(triGain).connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
    osc3.stop(now + duration + 0.1);

    return { stop: function () {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
    }};
  }

  // Build the sound player overlay HTML
  function buildPlayerOverlay(instrumentName) {
    var div = document.createElement('div');
    div.className = 'sound-player-overlay';
    div.innerHTML =
      '<div class="player-bg"></div>' +
      '<div class="ripple-container">' +
        '<div class="ripple-ring"></div>' +
        '<div class="ripple-ring"></div>' +
        '<div class="ripple-ring"></div>' +
        '<div class="ripple-ring"></div>' +
        '<div class="ripple-glow"></div>' +
      '</div>' +
      '<div class="waveform">' +
        (function() { var bars = ''; for (var i = 0; i < 23; i++) { bars += '<div class="waveform-bar"></div>'; } return bars; })() +
      '</div>' +
      '<div class="player-info">' +
        '<div class="player-instrument-name">' + instrumentName + '</div>' +
        '<div class="player-freq" data-sound-it="Ascolta la tonalità" data-sound-en="Listen to the tone">Ascolta la tonalità</div>' +
      '</div>' +
      '<button class="player-close" aria-label="Close">' +
        '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">' +
          '<line x1="2" y1="2" x2="12" y2="12"/>' +
          '<line x1="12" y1="2" x2="2" y2="12"/>' +
        '</svg>' +
      '</button>';
    return div;
  }

  // Handle play button click
  function handlePlayClick(e) {
    var btn = e.currentTarget;
    var card = btn.closest('.instrument-card');
    if (!card || card.classList.contains('is-playing')) return;

    var instrumentName = card.querySelector('.instrument-name').textContent.trim();
    var freq = parseFloat(card.getAttribute('data-freq')) || 440;

    // Fade out the info content
    var infoContent = card.querySelector('.instrument-info');
    var nameEl = infoContent.querySelector('.instrument-name');
    var descEl = infoContent.querySelector('.instrument-desc');
    var btnEl = infoContent.querySelector('.sound-test-btn');

    nameEl.classList.add('fade-out-element');
    descEl.classList.add('fade-out-element');
    btnEl.classList.add('fade-out-element');

    card.classList.add('is-playing');

    // Build and show player overlay
    var overlay = buildPlayerOverlay(instrumentName);
    infoContent.style.position = 'relative';
    infoContent.appendChild(overlay);

    // Trigger fade-in with a small delay for CSS transition to apply
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('is-visible');
      });
    });

    // Play the tone
    var tone = playInstrumentTone(freq, 3.5);

    // Close handler
    var closeBtn = overlay.querySelector('.player-close');
    closeBtn.addEventListener('click', function () {
      if (!overlay.classList.contains('is-closing')) {
        closeSoundTest(card, overlay, tone);
      }
    });

    // Auto-stop after duration
    setTimeout(function () {
      if (card.classList.contains('is-playing') && !overlay.classList.contains('is-closing')) {
        closeSoundTest(card, overlay, null);
      }
    }, 4000);
  }

  // Close the sound test and restore info view
  function closeSoundTest(card, overlay, tone) {
    if (tone) tone.stop();
    overlay.classList.add('is-closing');

    // Fade out player
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.remove('is-visible');
        overlay.classList.add('fade-out-element');
      });
    });

    // Fade in info content
    var nameEl = card.querySelector('.instrument-name');
    var descEl = card.querySelector('.instrument-desc');
    var btnEl = card.querySelector('.sound-test-btn');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nameEl.classList.remove('fade-out-element');
        nameEl.classList.add('fade-in-element');
        descEl.classList.remove('fade-out-element');
        descEl.classList.add('fade-in-element');
        btnEl.classList.remove('fade-out-element');
        btnEl.classList.add('fade-in-element');
      });
    });

    // Cleanup after transition
    setTimeout(function () {
      card.classList.remove('is-playing');
      nameEl.classList.remove('fade-in-element');
      descEl.classList.remove('fade-in-element');
      btnEl.classList.remove('fade-in-element');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 600);
  }

  // Attach play button listeners
  document.querySelectorAll('.sound-test-btn').forEach(function (btn) {
    btn.addEventListener('click', handlePlayClick);
  });

  // ========================================
  // Mobile Hamburger Menu
  // ========================================

  var hamburger = document.getElementById('hamburger');
  var navLinksEl = document.getElementById('navLinks');

  if (hamburger && navLinksEl) {
    function openNav() {
      hamburger.classList.add('is-open');
      navLinksEl.setAttribute('aria-expanded', 'true');
      navLinksEl.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      hamburger.classList.remove('is-open');
      navLinksEl.setAttribute('aria-expanded', 'false');
      navLinksEl.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
      if (navLinksEl.classList.contains('is-open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Close nav when a link is clicked
    navLinksEl.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        closeNav();
      });
    });

    // Close nav on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinksEl.classList.contains('is-open')) {
        closeNav();
        hamburger.focus();
      }
    });

    // Hide hamburger and show nav-links on desktop (>= 769px)
    function handleNavResize() {
      if (window.innerWidth > 768) {
        closeNav();
        hamburger.style.display = 'none';
        navLinksEl.style.opacity = '';
        navLinksEl.style.visibility = '';
        navLinksEl.style.position = '';
        navLinksEl.style.flexDirection = '';
        navLinksEl.style.zIndex = '';
      } else {
        hamburger.style.display = '';
      }
    }

    handleNavResize();
    window.addEventListener('resize', function () {
      // Debounce the resize handler
      clearTimeout(window._navResizeTimer);
      window._navResizeTimer = setTimeout(handleNavResize, 150);
    });
  }

})();
