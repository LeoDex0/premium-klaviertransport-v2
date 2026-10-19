(function () {
  'use strict';
  window.__mainLoaded = true;

  var doc = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)');
  // Zeit, bis das Intro den Blick freigibt (0, wenn es übersprungen wird; wie --intro im CSS)
  var introMs = doc.classList.contains('no-intro') ? 0 : 1400;

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Intro ---------- */
  var intro = document.getElementById('intro');
  if (intro) {
    // Antippen überspringt das Intro
    intro.addEventListener('click', function () { doc.classList.add('no-intro'); });
    setTimeout(function () { intro.remove(); }, 2200);
  }

  /* ---------- Bürozeiten: erreichbar oder nicht (Zeit in Essen) ---------- */
  var HOURS = { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [10, 13] };
  var DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var berlinNow = function () {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var get = function (type) { return parts.filter(function (p) { return p.type === type; })[0].value; };
      return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), h: Number(get('hour')) % 24 + Number(get('minute')) / 60 };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 };
    }
  };
  var updateStatus = function () {
    var now = berlinNow();
    var today = HOURS[now.day];
    var open = !!today && now.h >= today[0] && now.h < today[1];
    var short, long;
    if (open) {
      short = 'Jetzt erreichbar';
      long = 'Jetzt erreichbar, heute bis ' + today[1] + ' Uhr';
    } else {
      var when, whenShort;
      if (today && now.h < today[0]) {
        when = whenShort = 'heute ab ' + today[0] + ' Uhr';
      } else {
        for (var i = 1; i <= 7; i++) {
          var day = (now.day + i) % 7;
          if (HOURS[day]) {
            when = (i === 1 ? 'morgen' : 'am ' + DAYS[day]) + ' ab ' + HOURS[day][0] + ' Uhr';
            whenShort = (i === 1 ? 'morgen' : DAYS[day].slice(0, 2)) + ' ab ' + HOURS[day][0] + ' Uhr';
            break;
          }
        }
      }
      short = 'Erreichbar ' + whenShort;
      long = 'Telefonisch wieder erreichbar ' + when;
    }
    $$('[data-status]').forEach(function (el) { el.classList.toggle('is-open', open); });
    $$('[data-status-text]').forEach(function (el) { el.textContent = short; });
    $$('[data-status-long]').forEach(function (el) { el.textContent = long; });
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Header: Schatten ab dem ersten Scrollen ---------- */
  var header = document.getElementById('header');
  var scrollQueued = false;
  var onScroll = function () {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    scrollQueued = false;
  };
  window.addEventListener('scroll', function () {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  requestAnimationFrame(onScroll);

  /* ---------- Sprungmarken: vorher alle Abschnitte rendern, damit die Zielposition stimmt ---------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (link && link.getAttribute('href').length > 1) doc.classList.add('cv-off');
  }, true);
  if (location.hash) doc.classList.add('cv-off');

  /* ---------- Mobiles Menü ---------- */
  var burger = $('.burger');
  var menu = document.getElementById('menu');
  var setMenu = function (open) {
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    body.classList.toggle('menu-open', open);
  };
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    desktop.addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Navigation: aktueller Abschnitt ---------- */
  var navLinks = $$('.nav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var inBand = {};
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { inBand[entry.target.id] = entry.isIntersecting; });
      // nur ein Punkt aktiv: der letzte, der gerade im Band liegt
      var current = null;
      navLinks.forEach(function (a) { if (inBand[a.getAttribute('href').slice(1)]) current = a; });
      navLinks.forEach(function (a) { a.classList.toggle('is-current', a === current); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) navIo.observe(target);
    });
  }

  /* ---------- Karte erst zeichnen, wenn sie ins Bild kommt ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    doc.classList.add('reveal-all');
  }

  /* ---------- Spielbare Klaviatur ---------- */
  var keys = $('.keys');
  var audio = null;
  var master = null;
  var playNote = function (midi, vel) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audio) {
      audio = new Ctx();
      master = audio.createDynamicsCompressor();
      var out = audio.createGain();
      out.gain.value = .55;
      master.connect(out);
      out.connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
    var now = audio.currentTime;
    var freq = 440 * Math.pow(2, (midi - 69) / 12);
    var v = vel || .8;
    var tone = audio.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(Math.min(freq * 9, 12000), now);
    tone.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 300), now + 1.6);
    tone.connect(master);
    // Teiltöne mit leichter Inharmonizität; obere klingen schneller ab
    [[1, .5, 2.4], [2.003, .22, 1.5], [3.009, .1, 1], [4.02, .05, .7], [5.03, .025, .5]].forEach(function (p) {
      var osc = audio.createOscillator();
      var g = audio.createGain();
      osc.type = p[0] === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq * p[0];
      g.gain.setValueAtTime(.0001, now);
      g.gain.exponentialRampToValueAtTime(p[1] * v, now + .006);
      g.gain.exponentialRampToValueAtTime(.0001, now + p[2]);
      osc.connect(g);
      g.connect(tone);
      osc.start(now);
      osc.stop(now + p[2] + .05);
    });
  };

  if (keys) {
    var whiteSteps = [0, 2, 4, 5, 7, 9, 11];
    var hasBlack = [0, 1, 3, 4, 5];
    var buildKeys = function () {
      var width = keys.clientWidth;
      var count = Math.max(10, Math.round(width / (width < 600 ? 30 : 44)));
      if (count === keys._count) return;
      keys._count = count;
      keys.textContent = '';
      keys.classList.add('keys--live');
      keys.style.setProperty('--count', count);
      // mittleres C ungefähr in die Mitte legen
      var base = Math.max(36, 60 - 12 * Math.round(count / 14));
      var i, el;
      for (i = 0; i < count; i++) {
        el = document.createElement('span');
        el.className = 'key';
        el.dataset.note = base + 12 * Math.floor(i / 7) + whiteSteps[i % 7];
        keys.appendChild(el);
      }
      for (i = 0; i < count - 1; i++) {
        if (hasBlack.indexOf(i % 7) === -1) continue;
        el = document.createElement('span');
        el.className = 'bkey';
        el.style.setProperty('--n', i);
        el.dataset.note = base + 12 * Math.floor(i / 7) + whiteSteps[i % 7] + 1;
        keys.appendChild(el);
      }
    };
    var hit = function (el, withSound) {
      el.classList.add('is-down');
      clearTimeout(el._up);
      el._up = setTimeout(function () { el.classList.remove('is-down'); }, 190);
      if (withSound) playNote(Number(el.dataset.note));
    };
    var lastPointer = 'mouse';
    keys.addEventListener('pointerdown', function (e) {
      lastPointer = e.pointerType;
      var key = e.target.closest('[data-note]');
      // Touch spielt erst beim Tippen (click), damit Scrollen keine Töne auslöst
      if (!key || e.pointerType === 'touch') return;
      e.preventDefault();
      hit(key, true);
    });
    keys.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch' || e.buttons !== 1) return;
      var key = e.target.closest('[data-note]');
      if (key) hit(key, true);
    });
    keys.addEventListener('click', function (e) {
      if (lastPointer !== 'touch') return;
      var key = e.target.closest('[data-note]');
      if (key) hit(key, true);
    });
    requestAnimationFrame(buildKeys);
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildKeys, 200);
    });
    // stummer Lauf über die Tasten als Hinweis, dass sie reagieren
    if (!reduced) {
      setTimeout(function () {
        var whites = $$('.key', keys);
        whites.forEach(function (key, i) { setTimeout(function () { hit(key, false); }, i * (900 / whites.length)); });
      }, introMs + 1300);
    }
  }

  /* ---------- Weg eines Flügels: Zeichnung als kleiner Film ---------- */
  var story = $('.story');
  var svgStory = $('.story__svg');
  if (story && svgStory) {
    var S = function (id) { return document.getElementById(id); };
    var el = {
      lid: S('st-lid'), desk: S('st-desk'), lyre: S('st-lyre'), legs: S('st-legs'), standing: S('st-standing'),
      board: S('st-board'), wing: S('st-wing'), film: S('st-film'), wipe: S('st-wipe'), cargo: S('st-cargo'),
      truck: S('st-truck'), truckBody: S('st-truck-body'), w1: S('st-wheel-1'), w2: S('st-wheel-2'), speed: S('st-speed'),
      cam: S('st-cam'), ticks: S('st-ticks'), lamps: S('st-lamps'),
      route: S('st-route'), routeFill: S('st-route-fill'), routeHead: S('st-route-head'), routeEnd: S('st-route-end'),
      fin: S('st-final'), finPiano: S('st-final-piano'), finLid: S('st-final-lid'), done: S('st-done')
    };
    var straps = $$('.st-strap', svgStory);
    var notes = $$('#st-notes text', svgStory);
    var stepEls = $$('#story-steps li');
    var bars = $$('.story__bar i');
    var tf = function (node, value) { node.setAttribute('transform', value); };
    var op = function (node, value) { node.style.opacity = value <= 0 ? 0 : value >= 1 ? 1 : value.toFixed(3); };
    // Grundzoom auf den Flügel; beim Transporter zieht die Kamera auf
    var BASE = 1.26;
    var squashY = function (y, s) { return 'translate(0 ' + y + ') scale(1 ' + Math.max(s, .0001).toFixed(4) + ') translate(0 ' + -y + ')'; };

    var render = function (p) {
      var seg = function (a, b) { return clamp01((p - a) / (b - a)); };
      var t;

      // 1 – Deckel, Notenpult und Pedalwerk ab
      t = easeInOut(seg(.03, .12));
      tf(el.lid, 'translate(0 ' + (-70 * t).toFixed(1) + ')'); op(el.lid, 1 - t);
      t = easeInOut(seg(.06, .13));
      tf(el.desk, 'translate(0 ' + (-18 * t).toFixed(1) + ')'); op(el.desk, 1 - t);
      t = easeInOut(seg(.10, .18));
      tf(el.lyre, 'translate(0 ' + (26 * t).toFixed(1) + ')'); op(el.lyre, 1 - t);

      // 2 – Brett kommt, Flügel kippt auf die Seite
      t = easeOut(seg(.20, .27));
      tf(el.board, 'translate(' + (-520 * (1 - t)).toFixed(1) + ' 0)'); op(el.board, t > 0 ? 1 : 0);
      op(el.legs, 1 - seg(.25, .29));
      t = easeInOut(seg(.27, .32));
      tf(el.standing, squashY(270, 1 - t)); op(el.standing, t >= 1 ? 0 : 1);
      t = easeOut(seg(.32, .38));
      tf(el.wing, squashY(270, t)); op(el.wing, t > 0 ? 1 : 0);

      // 3 – Folie und Gurte
      t = easeInOut(seg(.42, .52));
      el.wipe.setAttribute('width', (300 * t).toFixed(1)); op(el.film, t > 0 ? 1 : 0);
      straps.forEach(function (s, i) {
        var k = easeOut(seg(.51 + i * .025, .56 + i * .025));
        tf(s, squashY(284, k)); op(s, k > 0 ? 1 : 0);
      });

      // 4 – Kamera zieht auf, Transporter kommt, Ladung rein, Fahrt
      t = easeInOut(seg(.60, .66));
      var sc = lerp(BASE, .78, t);
      var cx = lerp(296, 520, t);
      var cy = lerp(172, 160, t);
      tf(el.cam, 'translate(' + (300 - cx * sc).toFixed(2) + ' ' + (170 - cy * sc).toFixed(2) + ') scale(' + sc.toFixed(4) + ')');
      var arrive = easeOut(seg(.61, .67));
      var leave = Math.pow(seg(.79, .83), 2);
      var drive = seg(.72, .79);
      var bounce = drive > 0 && drive < 1 ? Math.sin(drive * 70) * 1.2 : 0;
      var truckX = 760 * (1 - arrive) + 1100 * leave;
      tf(el.truck, 'translate(' + truckX.toFixed(1) + ' 0)'); op(el.truck, arrive > 0 ? 1 : 0);
      tf(el.truckBody, 'translate(0 ' + bounce.toFixed(2) + ')');
      var load = easeInOut(seg(.67, .72));
      tf(el.cargo, 'translate(' + (330 * load + 1100 * leave).toFixed(1) + ' ' + (load >= 1 ? bounce.toFixed(2) : 0) + ')');
      var spin = (drive * 1440 + arrive * -360 + leave * 720).toFixed(1);
      tf(el.w1, 'translate(540 284) rotate(' + spin + ')');
      tf(el.w2, 'translate(830 284) rotate(' + spin + ')');
      el.ticks.style.strokeDashoffset = (drive * 720 + leave * 300).toFixed(1);
      tf(el.lamps, 'translate(' + (-960 * drive).toFixed(1) + ' 0)');
      op(el.lamps, seg(.70, .73) * (1 - seg(.79, .81)));
      op(el.speed, drive > 0 && drive < 1 ? .5 + .5 * Math.abs(Math.sin(drive * 40)) : 0);
      op(el.route, seg(.66, .70) * (1 - seg(.82, .85)));
      el.routeFill.style.strokeDashoffset = (1 - drive).toFixed(4);
      el.routeHead.setAttribute('cx', lerp(120, 470, drive).toFixed(1));
      el.routeEnd.classList.toggle('is-hit', drive >= 1);

      // 5 – am Ziel aufgestellt
      op(el.cam, 1 - easeInOut(seg(.81, .85)));
      tf(el.fin, 'translate(' + (300 - 296 * BASE).toFixed(2) + ' ' + (170 - 172 * BASE).toFixed(2) + ') scale(' + BASE + ')');
      t = easeOut(seg(.83, .89));
      op(el.fin, t);
      tf(el.finPiano, 'translate(0 ' + (26 * (1 - t)).toFixed(1) + ')');
      t = easeInOut(seg(.88, .93));
      tf(el.finLid, 'translate(0 ' + (-70 * (1 - t)).toFixed(1) + ')'); op(el.finLid, t);
      notes.forEach(function (n, i) {
        var k = seg(.91 + i * .02, .99);
        tf(n, 'translate(0 ' + (-34 * easeOut(k)).toFixed(1) + ')'); op(n, Math.min(1, k * 3));
      });
      t = seg(.93, .98);
      var pop = t <= 0 ? 0 : 1 + Math.sin(t * Math.PI) * .25 * (1 - t);
      tf(el.done, 'translate(470 92) scale(' + (easeOut(t) * pop).toFixed(3) + ')');

      // Text und Fortschritt
      var active = Math.min(4, Math.floor(p * 5));
      stepEls.forEach(function (li, i) { li.classList.toggle('is-active', i === active); });
      bars.forEach(function (b, i) { b.style.setProperty('--f', clamp01((p - i * .2) / .2).toFixed(3)); });
    };

    // Läuft wie ein Video: Schritte nacheinander, am Ende kurz stehen, dann von vorn
    var DUR = [2.8, 3.4, 3, 4.6, 3.6];
    var HOLD = 2.6;
    var TOTAL = DUR.reduce(function (a, b) { return a + b; }, 0) + HOLD;
    var stepStart = function (i) { var s = 0; for (var k = 0; k < i; k++) s += DUR[k]; return s; };
    var timeToP = function (sec) {
      var acc = 0;
      for (var i = 0; i < DUR.length; i++) {
        if (sec < acc + DUR[i]) return (i + (sec - acc) / DUR[i]) * .2;
        acc += DUR[i];
      }
      return 1;
    };
    var playBtn = $('.story__play');
    var stage = $('.story__stage');
    var clock = 0;
    var playing = !reduced;
    var visible = false;
    var frame = 0;
    var last = 0;
    var draw = function () {
      render(timeToP(clock));
      // weicher Übergang beim Neustart
      var fade = clock > TOTAL - .45 ? (TOTAL - clock) / .45 : clock < .35 && playing ? clock / .35 : 1;
      svgStory.style.opacity = Math.max(0, Math.min(1, fade)).toFixed(3);
    };
    var tick = function (now) {
      var dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      clock += dt;
      if (clock >= TOTAL) clock = 0;
      draw();
      frame = visible && playing ? requestAnimationFrame(tick) : 0;
    };
    var run = function () {
      if (frame || !visible || !playing) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    var halt = function () {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    var setPlaying = function (on) {
      playing = on;
      story.classList.toggle('is-paused', !on);
      playBtn.setAttribute('aria-pressed', String(!on));
      playBtn.setAttribute('aria-label', on ? 'Animation anhalten' : 'Animation abspielen');
      if (on) { if (clock >= TOTAL - HOLD) clock = 0; run(); } else { halt(); draw(); }
    };
    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    stage.addEventListener('click', function () { setPlaying(!playing); });
    $$('.story__bar button').forEach(function (b, i) {
      b.addEventListener('click', function () {
        // angehalten: Ergebnis des Schritts zeigen, sonst den Schritt von vorn abspielen
        clock = playing ? stepStart(i) + .001 : stepStart(i) + DUR[i] * .97;
        draw();
      });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) run(); else halt();
      }, { threshold: .35 }).observe(stage);
    } else {
      visible = true;
      run();
    }
    // Ohne Bewegung: erstes Bild des fertigen Schritts 1 zeigen, abspielen per Knopf
    if (reduced) clock = DUR[0] * .97;
    setPlaying(playing);
    draw();
  }

  /* ---------- Galerie: Fortschritt, Pfeile, Ziehen mit der Maus, Bildansicht ---------- */
  var gallery = document.getElementById('gallery');
  if (gallery) {
    var thumb = $('.gallery__bar i');
    var shots = $$('.shot', gallery);
    var updateGallery = function () {
      var max = gallery.scrollWidth - gallery.clientWidth;
      if (!thumb || max <= 0) return;
      var share = gallery.clientWidth / gallery.scrollWidth;
      thumb.style.width = share * 100 + '%';
      thumb.style.transform = 'translateX(' + (gallery.scrollLeft / max) * (1 / share - 1) * 100 + '%)';
    };
    gallery.addEventListener('scroll', function () { requestAnimationFrame(updateGallery); }, { passive: true });
    window.addEventListener('resize', updateGallery);
    requestAnimationFrame(updateGallery);
    // der Abschnitt wird erst gerendert, wenn er in die Nähe kommt – dann Balken richtig setzen
    if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) updateGallery(); }).observe(gallery);

    $$('[data-gal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var step = shots[0].getBoundingClientRect().width + 22;
        gallery.scrollBy({ left: step * Number(btn.dataset.gal), behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    // Ziehen mit der Maus (Touch scrollt ohnehin nativ)
    var drag = null;
    gallery.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: gallery.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; gallery.classList.add('is-drag'); }
      if (drag.moved) gallery.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      if (moved) setTimeout(function () { gallery.classList.remove('is-drag'); }, 0);
    });

    var lb = document.getElementById('lightbox');
    if (lb && typeof lb.showModal === 'function') {
      var lbImg = $('.lightbox__img', lb);
      var lbCap = $('.lightbox__cap', lb);
      var lbIndex = 0;
      var showShot = function (i) {
        lbIndex = (i + shots.length) % shots.length;
        var img = $('img', shots[lbIndex]);
        lbImg.src = img.dataset.full || img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = (lbIndex + 1) + ' / ' + shots.length + ' · ' + $('figcaption', shots[lbIndex]).lastChild.textContent;
        lbImg.style.animation = 'none';
        void lbImg.offsetWidth;
        lbImg.style.animation = '';
      };
      shots.forEach(function (shot, i) {
        $('.shot__btn', shot).addEventListener('click', function () {
          if (gallery.classList.contains('is-drag')) return;
          showShot(i);
          lb.showModal();
          body.classList.add('lb-open');
        });
      });
      lb.addEventListener('close', function () { body.classList.remove('lb-open'); });
      $('.lightbox__close', lb).addEventListener('click', function () { lb.close(); });
      $('.lightbox__prev', lb).addEventListener('click', function () { showShot(lbIndex - 1); });
      $('.lightbox__next', lb).addEventListener('click', function () { showShot(lbIndex + 1); });
      lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__fig')) lb.close(); });
      lb.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') showShot(lbIndex - 1);
        if (e.key === 'ArrowRight') showShot(lbIndex + 1);
      });
      var swipeX = null;
      lb.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') swipeX = e.clientX; });
      lb.addEventListener('pointerup', function (e) {
        if (swipeX === null) return;
        var dx = e.clientX - swipeX;
        swipeX = null;
        if (Math.abs(dx) > 50) showShot(lbIndex + (dx < 0 ? 1 : -1));
      });
    }
  }

  /* ---------- FAQ: weiches Auf- und Zuklappen ---------- */
  if (!reduced && 'animate' in Element.prototype) {
    $$('.faq__item').forEach(function (item) {
      var summary = $('summary', item);
      var running = null;
      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var closing = item.open && !item.classList.contains('is-closing');
        var from = item.offsetHeight;
        if (running) running.cancel();
        if (closing) {
          item.classList.add('is-closing');
        } else {
          item.classList.remove('is-closing');
          item.open = true;
        }
        var to = closing ? summary.offsetHeight + (item.offsetHeight - item.clientHeight) : item.offsetHeight;
        running = item.animate({ height: [from + 'px', to + 'px'] }, { duration: 420, easing: 'cubic-bezier(.16, 1, .3, 1)' });
        running.onfinish = function () {
          if (closing) { item.open = false; item.classList.remove('is-closing'); }
          running = null;
        };
      });
    });
  }

  /* ---------- Einsatzgebiet: Liste und Karte, Verkehr auf den Routen ---------- */
  var map = $('.map');
  if (map) {
    var setHot = function (region, on) {
      $$('[data-region="' + region + '"]').forEach(function (n) { n.classList.toggle('is-hot', on); });
    };
    $$('[data-region]').forEach(function (n) {
      n.addEventListener('pointerenter', function () { setHot(n.dataset.region, true); });
      n.addEventListener('pointerleave', function () { setHot(n.dataset.region, false); });
    });

    // Fahrten kreuz und quer durchs Netz: Kopf mit Schweif, Ping am Ziel, die Strecke leuchtet kurz auf
    var routes = map.querySelectorAll('.map__route');
    var moverLayer = $('.map__movers', map);
    if (!reduced && routes.length && moverLayer && 'IntersectionObserver' in window) {
      var NS = 'http://www.w3.org/2000/svg';
      var svgEl = function (tag, attrs) {
        var n = document.createElementNS(NS, tag);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        return n;
      };
      var edges = Array.prototype.map.call(routes, function (path) {
        return { path: path, from: path.getAttribute('data-from'), to: path.getAttribute('data-to'), busy: false };
      });
      var flash = function (city) {
        var c = map.querySelector('[data-city="' + city + '"]');
        if (!c) return;
        c.classList.add('is-hit');
        setTimeout(function () { c.classList.remove('is-hit'); }, 650);
      };
      // die ersten beiden Fahrten stehen fest, danach Zufall
      var script = [['berlin', 'dortmund'], ['muenchen', 'hamburg']];
      var trips = [];
      var recent = [];
      var MAX_TRIPS = 4;
      var startTrip = function (now) {
        var edge, back;
        var wish = script.shift();
        if (wish) {
          edges.some(function (e) {
            if (e.from + e.to === wish[0] + wish[1] || e.from + e.to === wish[1] + wish[0]) { edge = e; back = e.from !== wish[0]; return true; }
          });
        }
        if (!edge) {
          var free = edges.filter(function (e) { return !e.busy && recent.indexOf(e) < 0; });
          if (!free.length) return;
          edge = free[Math.floor(Math.random() * free.length)];
          back = Math.random() < .5;
        }
        recent.push(edge);
        if (recent.length > 5) recent.shift();
        edge.busy = true;
        edge.path.classList.add('is-live');
        // eigener Pfad ohne pathLength, damit Längen und Punkte in echten Einheiten rechnen
        var trail = svgEl('path', { 'class': 'map__trail', d: edge.path.getAttribute('d') });
        var head = svgEl('g', { 'class': 'map__mover' });
        head.appendChild(svgEl('circle', { 'class': 'map__mover-glow', r: 6.5 }));
        head.appendChild(svgEl('circle', { r: 2.6 }));
        moverLayer.appendChild(trail);
        moverLayer.appendChild(head);
        var len = trail.getTotalLength();
        var dur = 1500 + len * 6;
        trips.push({ edge: edge, back: back, trail: trail, head: head, len: len, start: now, dur: dur, lag: dur * .32, arrived: false });
        flash(back ? edge.to : edge.from);
      };
      var drawTrip = function (trip, now) {
        var t = now - trip.start;
        var len = trip.len;
        var s = easeInOut(clamp01(t / trip.dur)) * len;
        var a = easeInOut(clamp01((t - trip.lag) / trip.dur)) * len;
        // Strecke in Fahrtrichtung -> Position auf dem Pfad
        var headAt = trip.back ? len - s : s;
        trip.trail.style.strokeDasharray = Math.max(s - a, .01) + ' ' + len * 2;
        trip.trail.style.strokeDashoffset = -(trip.back ? len - s : a);
        var pt = trip.trail.getPointAtLength(headAt);
        trip.head.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
        trip.head.style.opacity = t > trip.dur ? Math.max(0, 1 - (t - trip.dur) / 250) : Math.min(1, t / 200);
        if (!trip.arrived && t >= trip.dur) {
          trip.arrived = true;
          var ping = svgEl('circle', { 'class': 'map__ping', r: 4, cx: pt.x.toFixed(1), cy: pt.y.toFixed(1) });
          moverLayer.appendChild(ping);
          setTimeout(function () { ping.remove(); }, 1100);
          flash(trip.back ? trip.edge.from : trip.edge.to);
          trip.edge.path.classList.remove('is-live');
        }
        if (t >= trip.dur + trip.lag) {
          trip.trail.remove();
          trip.head.remove();
          trip.edge.busy = false;
          return false;
        }
        return true;
      };
      var mapStart = 0;
      var mapFrame = 0;
      var lastFrame = 0;
      var nextTrip = 0;
      var drawMovers = function (now) {
        // nach einer Pause (Tab im Hintergrund, Karte aus dem Bild) alle Zeiten nachziehen statt zu springen
        var gap = lastFrame ? now - lastFrame : 0;
        if (gap > 250) {
          trips.forEach(function (trip) { trip.start += gap; });
          nextTrip += gap;
        }
        lastFrame = now;
        if (now >= mapStart) {
          if (now >= nextTrip && trips.length < MAX_TRIPS) {
            startTrip(now);
            nextTrip = now + 550 + Math.random() * 650;
          }
          trips = trips.filter(function (trip) { return drawTrip(trip, now); });
        }
        mapFrame = requestAnimationFrame(drawMovers);
      };
      // nur laufen lassen, solange die Karte sichtbar ist; erster Start nach dem Aufbau der Routen
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          if (!mapStart) mapStart = nextTrip = performance.now() + 2600;
          if (!mapFrame) mapFrame = requestAnimationFrame(drawMovers);
        } else if (mapFrame) {
          cancelAnimationFrame(mapFrame);
          mapFrame = 0;
          lastFrame = 0;
        }
      }, { threshold: 0.15 }).observe(map);
    }
  }

  /* ---------- Anfrage-Assistent mit Frachtbrief (Vorschau: kein Versand) ---------- */
  var form = document.getElementById('anfrage-form');
  var ticket = document.getElementById('ticket');
  if (form) {
    var steps = $$('.wiz__step', form);
    var btnBack = $('.wiz__back', form);
    var btnNext = $('.wiz__next', form);
    var btnSend = $('.wiz__send', form);
    var errorBox = $('.wiz__error', form);
    var numEl = $('[data-step-num]', form);
    var totalEl = $('[data-step-total]', form);
    var nameEl = $('[data-step-name]', form);
    var bar = $('.wiz__progress i', form);
    var done = $('.wiz__done', form);
    var NAMES = { objekt: 'Objekt', abholung: 'Abholung', ziel: 'Ziel', termin: 'Termin', kontakt: 'Kontakt' };
    var ERRORS = {
      objekt: 'Bitte wählen Sie aus, was wir für Sie transportieren sollen.',
      abholung: 'Bitte geben Sie PLZ und Ort an.',
      ziel: 'Bitte geben Sie PLZ und Ort an.',
      termin: 'Bitte wählen Sie, wann es Ihnen passt.',
      kontakt: 'Bitte füllen Sie alle Pflichtfelder aus und bestätigen Sie den Datenschutz.'
    };
    var FLOOR_LABELS = { '-1': 'UG', '0': 'EG', '6': '6. OG +' };
    var floorLabel = function (v) { return FLOOR_LABELS[v] || v + '. OG'; };
    var current = 0;

    var service = function () {
      var c = form.querySelector('input[name="leistung"]:checked');
      return c ? c.value : '';
    };
    // Entsorgung braucht kein Ziel
    var path = function () {
      return steps.filter(function (s) { return !(service() === 'entsorgung' && s.dataset.step === 'ziel'); });
    };

    var show = function (index, dir) {
      var list = path();
      current = Math.max(0, Math.min(index, list.length - 1));
      steps.forEach(function (s) { s.classList.remove('is-active', 'is-enter', 'is-enter-back'); });
      var step = list[current];
      step.classList.add('is-active');
      if (dir && !reduced) step.classList.add(dir > 0 ? 'is-enter' : 'is-enter-back');
      numEl.textContent = current + 1;
      totalEl.textContent = list.length;
      nameEl.textContent = NAMES[step.dataset.step];
      bar.style.transform = 'scaleX(' + ((current + 1) / list.length) + ')';
      btnBack.hidden = current === 0;
      var last = current === list.length - 1;
      btnNext.hidden = last;
      btnSend.hidden = !last;
      errorBox.hidden = true;
      if (dir) {
        var q = $('.wiz__q', step);
        q.focus({ preventScroll: true });
        var r = form.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * .5) {
          window.scrollTo({ top: window.scrollY + r.top - (header ? header.offsetHeight : 0) - 16, behavior: reduced ? 'auto' : 'smooth' });
        }
      }
    };

    var validate = function (step) {
      var firstInvalid = null;
      $$('input, select, textarea', step).forEach(function (input) {
        if (input.type === 'file') return;
        var ok = input.checkValidity();
        if (input.type !== 'radio') input.setAttribute('aria-invalid', String(!ok));
        if (!ok && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        errorBox.textContent = ERRORS[step.dataset.step];
        errorBox.hidden = false;
        if (firstInvalid.type !== 'radio') firstInvalid.focus();
        if (!reduced && 'animate' in Element.prototype) {
          form.animate({ transform: ['translateX(0)', 'translateX(-8px)', 'translateX(7px)', 'translateX(-4px)', 'translateX(0)'] }, { duration: 380 });
        }
        return false;
      }
      errorBox.hidden = true;
      return true;
    };

    var next = function () {
      if (validate(path()[current])) show(current + 1, 1);
    };
    btnNext.addEventListener('click', next);
    btnBack.addEventListener('click', function () { show(current - 1, -1); });

    // Enter in einem Textfeld führt zum nächsten Schritt statt das Formular abzuschicken
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || /^(checkbox|radio|file)$/.test(e.target.type)) return;
      if (current < path().length - 1) { e.preventDefault(); next(); }
    });

    // Auswahl per Tipp oder Klick springt direkt weiter
    var tapped = false;
    $$('.tile', form).forEach(function (tile) {
      tile.addEventListener('pointerdown', function () { tapped = true; });
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'leistung' && tapped) {
        tapped = false;
        setTimeout(function () { if (path()[current].dataset.step === 'objekt') show(current + 1, 1); }, 320);
      }
    });

    // Wunschtermin: Datumsfeld nur bei Bedarf
    var dateField = $('.field--date', form);
    var dateInput = $('#f-datum', form);
    if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
    form.addEventListener('change', function (e) {
      if (e.target.name !== 'termin') return;
      var wish = e.target.value === 'Wunschtermin';
      dateField.hidden = !wish;
      dateInput.required = wish;
      if (wish) dateInput.focus();
    });

    /* Etagen mit kleinem Haus */
    var NS2 = 'http://www.w3.org/2000/svg';
    var mk = function (parent, tag, attrs) {
      var n = document.createElementNS(NS2, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };
    var LEVEL_H = 21;
    var GROUND = 178;
    var levelTop = function (lv) { return GROUND - (lv + 1) * LEVEL_H; };
    $$('.floor', form).forEach(function (box) {
      var svg = $('.floor__house', box);
      var select = $('.floor__select', box);
      var out = $('.stepper__val', box);
      var lift = $('.switch input', box);
      var btns = $$('.stepper__btn', box);
      var levels = {};
      mk(svg, 'path', { 'class': 'fh-roof', d: 'M12 31L53 8L94 31' });
      mk(svg, 'rect', { 'class': 'fh-cellar', x: 18, y: GROUND, width: 70, height: LEVEL_H });
      mk(svg, 'rect', { 'class': 'fh-wall', x: 18, y: levelTop(6), width: 70, height: 7 * LEVEL_H });
      for (var lv = -1; lv <= 6; lv++) {
        var top = levelTop(lv);
        levels[lv] = mk(svg, 'rect', { 'class': 'fh-level', x: 18.6, y: top + .6, width: 68.8, height: LEVEL_H - 1.2 });
        if (lv > -1 && lv < 6) mk(svg, 'path', { 'class': 'fh-line', d: 'M18 ' + top + 'H88' });
        [26, 40, 54].forEach(function (x) {
          if (lv === 0 && x === 40) {
            mk(svg, 'rect', { 'class': 'fh-win', x: 38, y: top + 6, width: 12, height: LEVEL_H - 6 });
          } else {
            mk(svg, 'rect', { 'class': 'fh-win', x: x, y: top + 6, width: 9, height: 8, rx: 1 });
          }
        });
      }
      mk(svg, 'path', { 'class': 'fh-shaft', d: 'M72 ' + levelTop(6) + 'V' + (GROUND + LEVEL_H) + 'M84 ' + levelTop(6) + 'V' + (GROUND + LEVEL_H) });
      var car = mk(svg, 'rect', { 'class': 'fh-car', x: 74, y: 0, width: 8, height: 15, rx: 1.5 });
      mk(svg, 'path', { 'class': 'fh-ground', d: 'M0 ' + GROUND + 'H120' });
      var pin = mk(svg, 'g', { 'class': 'fh-pin' });
      mk(pin, 'circle', { cx: 104, cy: 0, r: 8 });
      mk(pin, 'path', { d: 'M100.5 0.5L103 3L107.5 -2.5' });

      var sync = function () {
        var v = Number(select.value);
        out.textContent = floorLabel(v);
        btns[0].disabled = v <= -1;
        btns[1].disabled = v >= 6;
        for (var k = -1; k <= 6; k++) {
          var between = v > 0 ? k >= 0 && k < v : v < 0 ? k === 0 : false;
          levels[k].classList.toggle('is-on', k === v);
          levels[k].classList.toggle('is-path', !lift.checked && between);
        }
        var mid = levelTop(v) + LEVEL_H / 2;
        pin.style.transform = 'translateY(' + mid + 'px)';
        car.style.transform = 'translateY(' + (levelTop(v) + 3) + 'px)';
        svg.classList.toggle('has-lift', lift.checked);
        updateTicket();
      };
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var v = Math.max(-1, Math.min(6, Number(select.value) + Number(b.dataset.d)));
          select.value = String(v);
          sync();
        });
      });
      lift.addEventListener('change', sync);
      box._sync = sync;
    });

    /* Fotos zur Anfrage (Vorschau: kein Upload) */
    var upload = $('.upload', form);
    var picked = [];
    if (upload) {
      var fileInput = $('.upload__input', upload);
      var thumbs = $('.thumbs', form);
      var uploadCount = $('.upload__count', upload);
      var maxFiles = 8;
      var syncFiles = function () {
        // Auswahl zurück ins Feld schreiben, damit sie später mitgesendet werden kann
        try {
          var dt = new DataTransfer();
          picked.forEach(function (p) { dt.items.add(p.file); });
          fileInput.files = dt.files;
        } catch (err) {}
        var n = picked.length;
        uploadCount.textContent = n >= maxFiles ? maxFiles + ' Fotos – mehr passen nicht hinein'
          : n ? n + (n === 1 ? ' Foto' : ' Fotos') + ' ausgewählt' : '';
        upload.classList.toggle('is-full', n >= maxFiles);
        updateTicket();
      };
      var addFiles = function (list) {
        Array.prototype.slice.call(list).forEach(function (file) {
          var isImage = /^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
          if (!isImage || picked.length >= maxFiles) return;
          var url = URL.createObjectURL(file);
          var item = document.createElement('li');
          item.className = 'thumb';
          var img = new Image();
          img.alt = '';
          img.onerror = function () { item.classList.add('thumb--noprev'); };
          img.src = url;
          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'thumb__del';
          del.setAttribute('aria-label', 'Foto entfernen: ' + file.name);
          del.innerHTML = '<svg class="icon"><use href="#i-x"/></svg>';
          var entry = { file: file };
          del.addEventListener('click', function () {
            URL.revokeObjectURL(url);
            picked.splice(picked.indexOf(entry), 1);
            item.remove();
            syncFiles();
            fileInput.focus();
          });
          item.appendChild(img);
          item.appendChild(del);
          thumbs.appendChild(item);
          picked.push(entry);
        });
        syncFiles();
      };
      fileInput.addEventListener('change', function () { addFiles(fileInput.files); });
      upload.addEventListener('click', function (e) { if (picked.length >= maxFiles) e.preventDefault(); });
      ['dragenter', 'dragover'].forEach(function (type) {
        upload.addEventListener(type, function (e) { e.preventDefault(); upload.classList.add('is-drag'); });
      });
      upload.addEventListener('dragleave', function (e) { if (!upload.contains(e.relatedTarget)) upload.classList.remove('is-drag'); });
      upload.addEventListener('drop', function (e) {
        e.preventDefault();
        upload.classList.remove('is-drag');
        if (e.dataTransfer) addFiles(e.dataTransfer.files);
      });
    }

    /* Frachtbrief */
    var ticketNo = (function () {
      var d = new Date();
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return 'PK-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + (100 + Math.floor(Math.random() * 900));
    })();
    var ticketLive = false;
    var tField = function (key) { return ticket ? $('[data-t="' + key + '"]', ticket) : null; };
    var setT = function (key, value) {
      var node = tField(key);
      if (!node || node.textContent === value) return;
      node.textContent = value;
      // beim ersten Befüllen nicht aufblinken lassen (und kein erzwungenes Layout)
      if (!ticketLive) return;
      node.classList.remove('is-new');
      void node.offsetWidth;
      node.classList.add('is-new');
    };
    var place = function (v) {
      v = v.trim();
      if (!v) return '—';
      var m = v.match(/^\d{4,5}\s+(.+)$/);
      return m ? m[1] : v;
    };
    var floorText = function (selectName, liftName) {
      var s = form.querySelector('[name="' + selectName + '"]');
      var l = form.querySelector('[name="' + liftName + '"]');
      return floorLabel(s.value) + (l.checked ? ' · Aufzug' : '');
    };
    function updateTicket() {
      if (!ticket) return;
      var svc = form.querySelector('input[name="leistung"]:checked');
      setT('objekt', svc ? svc.dataset.label : '—');
      setT('von', place($('#f-von', form).value));
      var disposal = service() === 'entsorgung';
      setT('nach', disposal ? 'Entsorgung' : place($('#f-nach', form).value));
      setT('von-etage', floorText('abhol_etage', 'abhol_aufzug'));
      setT('nach-etage', disposal ? '—' : floorText('liefer_etage', 'liefer_aufzug'));
      var term = form.querySelector('input[name="termin"]:checked');
      var termText = term ? term.value : '—';
      if (term && term.value === 'Wunschtermin' && dateInput.value) {
        termText = dateInput.value.split('-').reverse().join('.');
      }
      setT('termin', termText);
      setT('fotos', picked.length ? picked.length + (picked.length === 1 ? ' Foto' : ' Fotos') : 'keine');
    }
    if (ticket) {
      setT('no', ticketNo);
      // Strichcode aus der Nummer
      var code = tField('code');
      var seed = 0;
      for (var ci = 0; ci < ticketNo.length; ci++) seed = (seed * 31 + ticketNo.charCodeAt(ci)) >>> 0;
      var rand = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      var x = 0;
      var bars2 = '';
      while (x < 196) {
        var w = 1 + Math.floor(rand() * 3);
        if (rand() > .35) bars2 += '<rect x="' + x + '" y="0" width="' + w + '" height="40"/>';
        x += w + 1 + Math.floor(rand() * 2);
      }
      code.innerHTML = bars2;
    }
    form.addEventListener('input', function (e) {
      updateTicket();
      if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) e.target.setAttribute('aria-invalid', 'false');
    });
    form.addEventListener('change', updateTicket);

    // Leistung aus einer Karte übernehmen und gleich zum nächsten Schritt
    $$('[data-service]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (form.classList.contains('is-done')) return;
        var radio = form.querySelector('input[name="leistung"][value="' + link.dataset.service + '"]');
        if (!radio) return;
        radio.checked = true;
        updateTicket();
        show(1, 0);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = path();
      if (current !== list.length - 1) { next(); return; }
      for (var i = 0; i < list.length; i++) {
        if (!validate(list[i])) { if (i !== current) show(i, -1); validate(list[i]); return; }
      }
      form.classList.add('is-done');
      done.hidden = false;
      if (ticket) {
        ticket.classList.remove('is-stamped');
        void ticket.offsetWidth;
        ticket.classList.add('is-stamped');
      }
      var r = form.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - (header ? header.offsetHeight : 0) - 16, behavior: reduced ? 'auto' : 'smooth' });
    });

    $('.wiz__again', form).addEventListener('click', function () {
      form.reset();
      picked.splice(0).forEach(function () {});
      $$('.thumb', form).forEach(function (t) { t.remove(); });
      if (upload) { $('.upload__count', upload).textContent = ''; upload.classList.remove('is-full'); }
      dateField.hidden = true;
      dateInput.required = false;
      $$('[aria-invalid]', form).forEach(function (n) { n.removeAttribute('aria-invalid'); });
      form.classList.remove('is-done');
      done.hidden = true;
      if (ticket) ticket.classList.remove('is-stamped');
      $$('.floor', form).forEach(function (box) { box._sync(); });
      show(0, -1);
    });

    $$('.floor', form).forEach(function (box) { box._sync(); });
    updateTicket();
    show(0, 0);
    ticketLive = true;
  }

  /* ---------- Mobile Aktionsleiste ---------- */
  var ctaBar = document.getElementById('cta-bar');
  var heroCta = document.getElementById('hero-cta');
  var quote = document.getElementById('anfrage');
  if (ctaBar && heroCta && quote && 'IntersectionObserver' in window) {
    var heroCtaVisible = true;
    var keysVisible = false;
    var quoteVisible = false;
    var typing = false;
    var updateBar = function () {
      ctaBar.classList.toggle('is-visible', !heroCtaVisible && !keysVisible && !quoteVisible && !typing);
    };
    new IntersectionObserver(function (entries) { heroCtaVisible = entries[0].isIntersecting; updateBar(); }).observe(heroCta);
    var keysWrap = $('.keys-wrap');
    if (keysWrap) new IntersectionObserver(function (entries) { keysVisible = entries[0].isIntersecting; updateBar(); }).observe(keysWrap);
    new IntersectionObserver(function (entries) { quoteVisible = entries[0].isIntersecting; updateBar(); }, { rootMargin: '0px 0px -20% 0px' }).observe(quote);
    // Leiste ausblenden, solange die Tastatur offen ist
    document.addEventListener('focusin', function (e) { typing = !!e.target.closest('input, textarea, select'); updateBar(); });
    document.addEventListener('focusout', function () { typing = false; updateBar(); });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
