/* yogipatel.me — main.js
   Vanilla ES2020, no dependencies, loaded with `defer`.
   Every feature is a small function called from init(); each one
   guards its own selectors so a missing element never throws. */
(function () {
  'use strict';

  /* ---------- 1. Environment flags (run before anything paints) ---------- */
  const root = document.documentElement;
  root.className = root.className.replace(/\bno-js\b/, 'js');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) root.classList.add('reduce-motion');

  const SAVE_DATA = !!(navigator.connection && navigator.connection.saveData === true);
  const LOW_MOTION = reducedMotion || SAVE_DATA;
  const HAS_DIALOG = typeof HTMLDialogElement === 'function' &&
    typeof HTMLDialogElement.prototype.showModal === 'function';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- 8. Scroll lock helper (shared by both dialogs) ---------- */
  const lockScroll = () => root.classList.add('is-locked');
  const unlockScroll = () => root.classList.remove('is-locked');

  /* ---------- 2. Header: scrolled state + scrollspy ---------- */
  function initHeader() {
    const header = $('.site-header');
    if (!header) return;

    // .is-scrolled after 8px, rAF-throttled, passive.
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();

    // Scrollspy over the sections the primary nav points at
    // (covers both the desktop list and the mobile panel, which live in the same <nav>).
    const links = $$('nav[aria-label="Primary"] a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const byId = new Map();
    links.forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(a);
    });

    const setCurrent = (id) => {
      links.forEach((a) => a.removeAttribute('aria-current'));
      (byId.get(id) || []).forEach((a) => a.setAttribute('aria-current', 'true'));
    };

    const targets = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const top = document.getElementById('top');
    if (top) targets.unshift(top); // top-of-page state clears the highlight

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setCurrent(entry.target === top ? null : entry.target.id);
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    targets.forEach((t) => spy.observe(t));
  }

  /* ---------- 3. Mobile menu (non-modal dropdown) ---------- */
  function initMenu() {
    const btn = $('.menu-btn[aria-controls]');
    if (!btn) return;
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    const nav = btn.closest('nav') || panel.parentElement;
    const desktop = window.matchMedia('(min-width: 1024px)');

    const isOpen = () => !panel.hidden;

    const open = () => {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      const first = $('a, button', panel);
      if (first) first.focus();
    };

    const close = (restoreFocus, keepFocus) => {
      if (!isOpen()) return;
      const focusWasInside = panel.contains(document.activeElement);
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (!keepFocus && (restoreFocus || focusWasInside)) btn.focus();
    };

    btn.addEventListener('click', () => (isOpen() ? close(true) : open()));

    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) close(true);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close(true);
    });

    document.addEventListener('click', (e) => {
      if (isOpen() && nav && !nav.contains(e.target)) close(false);
    });

    if (nav) {
      nav.addEventListener('focusout', (e) => {
        if (isOpen() && e.relatedTarget && !nav.contains(e.relatedTarget)) close(false, true);
      });
    }

    const onChange = (mq) => { if (mq.matches) close(false); };
    if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onChange);
    else if (typeof desktop.addListener === 'function') desktop.addListener(onChange);
  }

  /* ---------- 4. Reveal on scroll ---------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (LOW_MOTION || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- 5. Count-up stats ---------- */
  function initCountUp() {
    if (LOW_MOTION || !('IntersectionObserver' in window)) return; // values already printed
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const fmt = new Intl.NumberFormat('en-US');
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const DURATION = 1200;

    const tween = (el) => {
      const target = Number(el.dataset.count);
      const finalText = el.textContent; // server-rendered string wins at the end
      if (!Number.isFinite(target)) return;
      let start = null;
      const step = (now) => {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / DURATION);
        el.textContent = fmt.format(Math.round(target * easeOutCubic(t)));
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = finalText;
      };
      el.textContent = fmt.format(0);
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        tween(entry.target);
      });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
  }

  /* ---------- Fallback when <dialog> is unsupported ---------- */
  function galleryItems(name) {
    const tpl = document.getElementById('gallery-' + name);
    if (!tpl || !tpl.content) return [];
    return $$('img', tpl.content).map((img) => ({
      thumb: img.getAttribute('src') || '',
      full: img.dataset.full || img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      width: img.getAttribute('width'),
      height: img.getAttribute('height')
    }));
  }

  function replaceWithLink(control, href) {
    if (!href) return;
    const a = document.createElement('a');
    a.className = control.className;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    while (control.firstChild) a.appendChild(control.firstChild);
    control.replaceWith(a);
  }

  function initDialogFallback() {
    $$('[data-video]').forEach((c) => replaceWithLink(c, 'https://youtu.be/' + encodeURIComponent(c.dataset.video)));
    $$('[data-video-file]').forEach((c) => replaceWithLink(c, c.dataset.videoFile));
    $$('[data-gallery]').forEach((c) => {
      const items = galleryItems(c.dataset.gallery);
      replaceWithLink(c, items.length ? items[0].full : '');
    });
    $$('[data-lightbox]').forEach((c) => {
      const items = galleryItems(c.dataset.lightbox);
      const i = Math.min(items.length - 1, Math.max(0, Number(c.dataset.index) || 0));
      replaceWithLink(c, items.length ? items[i].full : '');
    });
  }

  /* ---------- 6. Video dialog (YouTube embeds + native <video>) ---------- */
  function initVideoDialog() {
    const dialog = document.getElementById('video-dialog');
    if (!dialog) return;
    const title = document.getElementById('video-title') || $('.dialog__title', dialog);
    const media = $('.dialog__media', dialog);
    const closeBtn = $('[data-close]', dialog);
    if (!media) return;
    let opener = null;

    const buildIframe = (id, label) => {
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      f.title = label + ' (YouTube)';
      f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      return f;
    };

    const buildVideo = (src, poster) => {
      const v = document.createElement('video');
      v.controls = true;
      v.preload = 'none';
      v.setAttribute('playsinline', '');
      if (poster) v.poster = poster;
      v.src = src;
      return v;
    };

    const openWith = (control, el) => {
      if (dialog.open) return;
      opener = control;
      if (title) title.textContent = control.dataset.title || '';
      media.replaceChildren(el);
      lockScroll();
      dialog.showModal();
      if (closeBtn) closeBtn.focus();
    };

    document.addEventListener('click', (e) => {
      const yt = e.target.closest('[data-video]');
      if (yt) { openWith(yt, buildIframe(yt.dataset.video, yt.dataset.title || 'Video')); return; }
      const file = e.target.closest('[data-video-file]');
      if (file) openWith(file, buildVideo(file.dataset.videoFile, file.dataset.poster));
    });

    if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      media.replaceChildren(); // stops audio, unloads the third-party frame
      unlockScroll();
      if (opener && opener.isConnected) opener.focus();
      opener = null;
    });
  }

  /* ---------- 7. Gallery lightbox ---------- */
  function initLightbox() {
    const dialog = document.getElementById('lightbox');
    if (!dialog) return;
    const titleEl = document.getElementById('lb-title') || $('.dialog__title', dialog);
    const countEl = document.getElementById('lb-count') || $('.lb__count', dialog);
    const img = $('.lb__img', dialog);
    const cap = $('.lb__cap', dialog);
    const rail = $('.lb__rail', dialog);
    const stage = $('.lb__stage', dialog);
    const prevBtn = $('.lb__prev', dialog);
    const nextBtn = $('.lb__next', dialog);
    const closeBtn = $('[data-close]', dialog);
    if (!img) return;

    const blankSrc = img.getAttribute('src') || '';
    const FADE = 160;
    let items = [];
    let index = 0;
    let opener = null;
    let fadeTimer = 0;

    if (!LOW_MOTION) img.style.transition = 'opacity ' + FADE + 'ms ease';
    if (stage) stage.style.touchAction = 'pan-y'; // let horizontal swipes reach pointer events

    const wrap = (i) => (i + items.length) % items.length;

    const prefetch = (i) => {
      if (SAVE_DATA || !items.length) return;
      new Image().src = items[i].full;
    };

    const swap = (item) => {
      if (item.width) img.setAttribute('width', item.width); else img.removeAttribute('width');
      if (item.height) img.setAttribute('height', item.height); else img.removeAttribute('height');
      img.loading = 'eager';
      img.src = item.full;
      img.alt = item.alt;
      if (cap) cap.textContent = item.alt;
    };

    const show = (i, immediate) => {
      if (!items.length) return;
      index = wrap(i);
      const item = items[index];
      if (countEl) countEl.textContent = (index + 1) + ' / ' + items.length;

      clearTimeout(fadeTimer);
      if (LOW_MOTION || immediate) {
        swap(item);
        img.style.opacity = '';
      } else {
        img.style.opacity = '0';
        fadeTimer = setTimeout(() => { swap(item); img.style.opacity = ''; }, FADE);
      }

      if (rail) {
        $$('button', rail).forEach((b, n) => {
          if (n === index) {
            b.setAttribute('aria-current', 'true');
            if (typeof b.scrollIntoView === 'function') b.scrollIntoView({ inline: 'center', block: 'nearest' });
          } else {
            b.removeAttribute('aria-current');
          }
        });
      }
      prefetch(wrap(index + 1));
      prefetch(wrap(index - 1));
    };

    const buildRail = () => {
      if (!rail) return;
      rail.replaceChildren();
      items.forEach((item, n) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Image ' + (n + 1) + ' of ' + items.length);
        const t = document.createElement('img');
        t.src = item.thumb;
        t.alt = '';
        t.loading = 'lazy';
        t.decoding = 'async';
        if (item.width) t.width = Number(item.width);
        if (item.height) t.height = Number(item.height);
        b.appendChild(t);
        b.addEventListener('click', () => show(n));
        li.appendChild(b);
        rail.appendChild(li);
      });
    };

    const open = (name, start, control) => {
      if (dialog.open) return;
      items = galleryItems(name);
      if (!items.length) return;
      opener = control;
      const tpl = document.getElementById('gallery-' + name);
      if (titleEl) titleEl.textContent = (tpl && tpl.dataset.title) || control.dataset.title || '';
      buildRail();
      show(start, true);
      lockScroll();
      dialog.showModal();
      if (closeBtn) closeBtn.focus();
    };

    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-gallery]');
      if (g) { open(g.dataset.gallery, 0, g); return; }
      const l = e.target.closest('[data-lightbox]');
      if (l) open(l.dataset.lightbox, Number(l.dataset.index) || 0, l);
    });

    if (prevBtn) prevBtn.addEventListener('click', () => show(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => show(index + 1));
    if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());
    const inner = $('.lb', dialog);
    const fig = $('.lb__fig', dialog);
    dialog.addEventListener('click', (e) => {
      if ([dialog, inner, stage, fig].includes(e.target)) dialog.close();
    });

    dialog.addEventListener('keydown', (e) => {
      const keys = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: items.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      show(keys[e.key]);
    });

    // Pointer swipe on the stage.
    if (stage) {
      let sx = 0, sy = 0, tracking = false;
      stage.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        sx = e.clientX; sy = e.clientY; tracking = true;
      }, { passive: true });
      stage.addEventListener('pointerup', (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dy) < 60) show(dx < 0 ? index + 1 : index - 1);
      }, { passive: true });
      stage.addEventListener('pointercancel', () => { tracking = false; }, { passive: true });
    }

    dialog.addEventListener('close', () => {
      clearTimeout(fadeTimer);
      img.style.opacity = '';
      img.src = blankSrc; // release the full-size image
      img.alt = '';
      img.removeAttribute('width');
      img.removeAttribute('height');
      if (cap) cap.textContent = '';
      if (rail) rail.replaceChildren();
      items = [];
      unlockScroll();
      if (opener && opener.isConnected) opener.focus();
      opener = null;
    });
  }

  /* ---------- 9. Contact form (custom validation + fetch) ---------- */
  function initForm() {
    const form = $('form.form');
    if (!form) return;
    const fields = $$('input[name], textarea[name]', form);
    const submit = $('.form__submit', form) || $('button[type="submit"]', form);
    const status = document.getElementById('form-status') || $('.form__status', form);
    const EMAIL = 'yogi.patel224@gmail.com';

    const errorFor = (field) => {
      const wrap = field.closest('.field');
      return wrap ? wrap.querySelector('.field__error') : null;
    };

    const setInvalid = (field, invalid) => {
      const wrap = field.closest('.field');
      if (wrap) wrap.classList.toggle('is-invalid', invalid);
      field.classList.toggle('is-invalid', invalid);
      if (invalid) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
      const err = errorFor(field);
      if (err) {
        err.hidden = !invalid;
        if (invalid) field.setAttribute('aria-describedby', err.id); else field.removeAttribute('aria-describedby');
      }
    };

    const validate = () => {
      let first = null;
      fields.forEach((field) => {
        const ok = field.checkValidity();
        setInvalid(field, !ok);
        if (!ok && !first) first = field;
      });
      return first;
    };

    const setStatus = (text, isError, withCheck) => {
      if (!status) return;
      status.replaceChildren();
      status.classList.toggle('is-error', !!isError);
      if (withCheck) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon icon--inline');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#i-check');
        svg.appendChild(use);
        status.appendChild(svg);
        status.appendChild(document.createTextNode(' '));
      }
      if (isError) {
        status.appendChild(document.createTextNode('Something went wrong. Please email me at '));
        const a = document.createElement('a');
        a.href = 'mailto:' + EMAIL;
        a.textContent = EMAIL;
        status.appendChild(a);
        status.appendChild(document.createTextNode('.'));
      } else {
        status.appendChild(document.createTextNode(text));
      }
    };

    const setBusy = (busy) => {
      if (!submit) return;
      if (busy) {
        submit.dataset.label = submit.textContent;
        submit.textContent = 'Sending…';
        submit.setAttribute('aria-busy', 'true');
      } else {
        if (submit.dataset.label) submit.textContent = submit.dataset.label;
        submit.removeAttribute('aria-busy');
      }
    };

    fields.forEach((field) => {
      field.addEventListener('input', () => setInvalid(field, false));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit && submit.getAttribute('aria-busy') === 'true') return;
      setStatus('', false, false);
      const firstInvalid = validate();
      if (firstInvalid) { firstInvalid.focus(); return; }

      setBusy(true);
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        fields.forEach((f) => setInvalid(f, false));
        setStatus('Thanks! I will be in touch.', false, true);
      } catch (err) {
        setStatus('', true, false);
      } finally {
        setBusy(false);
      }
    });
  }

  /* ---------- 10. Volunteering background video (faded, looping, lazy) ---------- */
  function initVolBg() {
    const video = $('.vol-bg[data-src]');
    if (!video) return;
    // Reduced motion / Save-Data: leave the still poster in place and never fetch the clip.
    if (LOW_MOTION || !('IntersectionObserver' in window)) return;
    video.muted = true; // belt and braces for autoplay policies

    // Smooth loop: the clip's last frame differs from its first, so a plain loop hard-cuts.
    // Fade the layer out over the final FADE seconds and back in over the first FADE seconds.
    const BASE_OPACITY = parseFloat(getComputedStyle(video).opacity) || 0.3;
    const FADE = 0.9; // seconds on each side of the loop point
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let raf = 0;
    const tick = () => {
      if (video.paused || video.ended) { raf = 0; return; }
      const d = video.duration;
      if (d && isFinite(d) && d > FADE * 2) {
        const t = video.currentTime;
        const remaining = d - t;
        let k = 1;
        if (remaining < FADE) k = remaining / FADE;
        else if (t < FADE) k = t / FADE;
        video.style.opacity = (BASE_OPACITY * easeInOut(Math.max(0, Math.min(1, k)))).toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };
    video.addEventListener('playing', () => { if (!raf) raf = requestAnimationFrame(tick); });
    video.addEventListener('pause', () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } });

    const start = () => {
      if (!video.getAttribute('src')) {
        video.setAttribute('src', video.dataset.src);
        video.load();
      }
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else if (!video.paused) video.pause();
      });
    }, { rootMargin: '40% 0px 40% 0px', threshold: 0 });
    io.observe(video);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !video.paused) video.pause();
    });
  }

  /* ---------- init ---------- */
  function init() {
    initHeader();
    initMenu();
    initReveal();
    initCountUp();
    initVolBg();
    if (HAS_DIALOG) {
      initVideoDialog();
      initLightbox();
    } else {
      initDialogFallback();
    }
    initForm();
    // <details class="more"> is native; no handlers needed.
  }

  init();
})();
