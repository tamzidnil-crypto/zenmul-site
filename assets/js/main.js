/* Zenmul — main.js
   1. Hero node graph (canvas), a workflow actually running
   2. The rail: page scroll drawn as the spine of that workflow
   3. Entrance choreography
   4. Scroll reveals
   5. Mobile menu
   6. Scanner that assembles a workflow node by node
*/

var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- 1. The sky ----------------------------------------------------------
   One fixed canvas behind the entire document: starfield, two distant
   planets, a glowing sun, and the point-cloud ridge on the first screen.
   Stars parallax with scroll and scatter away from the cursor. */
(function () {
  var canvas = document.getElementById('graph');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w, h, dpr, cx, cy;
  var scrollY = 0, drift = 0;
  var mouse = { x: -9999, y: -9999, on: false };

  /* ---- stars ---- */
  var stars = [];
  function seed() {
    stars = [];
    var count = Math.round((w * h) / 5200);
    count = Math.max(90, Math.min(320, count));
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 2,      /* two screens tall, wraps on scroll */
        r: Math.random() * 1.3 + 0.3,
        depth: 0.25 + Math.random() * 0.75,  /* parallax + cursor sensitivity */
        p: Math.random() * 6.28,
        ox: 0, oy: 0                   /* cursor displacement, eases back */
      });
    }
  }

  /* ---- planets ---- */
  var planets = [
    { x: 0.16, y: 0.30, r: 46, tone: '150, 160, 190', ring: false, depth: 0.18 },
    { x: 0.86, y: 0.66, r: 26, tone: '190, 170, 130', ring: true,  depth: 0.30 }
  ];

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w * 0.5;
    cy = h * 0.46;
    seed();
  }

  /* ---- terrain ---- */
  var COLS = 84, ROWS = 58, SPREAD = 2.6, NEAR = 1.05, DEPTH = 7.4, FOCAL = 1.28, CAM_Y = 0.52;

  function height(x, z) {
    var ridge =
      Math.sin(x * 1.05 + 0.6) * Math.cos(z * 0.72) * 0.42 +
      Math.sin(x * 2.15 - z * 0.9) * 0.20 +
      Math.sin(x * 4.4 + z * 1.7) * 0.075 +
      Math.cos(x * 0.42 + z * 0.31) * 0.30;
    var calm = Math.min(1, Math.abs(x) / 1.15);
    return ridge * (0.35 + 0.65 * calm);
  }

  function terrain(lift) {
    var gone = 1 - Math.min(1, scrollY / (h * 0.9));
    if (gone <= 0.01) return;
    for (var r = ROWS - 1; r >= 0; r--) {
      var z = NEAR + (r / ROWS) * DEPTH + drift % (DEPTH / ROWS);
      var fade = 1 - (z - NEAR) / DEPTH;
      if (fade <= 0) continue;
      var alpha = Math.pow(fade, 1.7) * gone;
      var scale = FOCAL / z;

      ctx.beginPath();
      for (var c = 0; c <= COLS; c++) {
        var x = (c / COLS - 0.5) * 2 * SPREAD;
        var y = height(x, z);
        var px = cx + x * scale * w * 0.5 + lift.x * (1 - fade) * 26;
        var py = cy + (CAM_Y - y) * scale * h * 0.5 - scrollY * 0.45;
        if (c === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        if (c % 3 === 0 && fade > 0.22) {
          ctx.save();
          ctx.fillStyle = 'rgba(237, 234, 227, ' + (alpha * 0.5) + ')';
          ctx.fillRect(px, py, 1, 1);
          ctx.restore();
        }
      }
      ctx.strokeStyle = 'rgba(237, 234, 227, ' + (alpha * 0.17) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function sun(t) {
    var gone = 1 - Math.min(1, scrollY / (h * 1.4));
    if (gone <= 0.01) return;
    var gx = w * 0.5, gy = h * 0.22 - scrollY * 0.25;
    var pulse = 0.86 + Math.sin(t * 0.0011) * 0.14;
    var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 190 * pulse);
    g.addColorStop(0,    'rgba(255, 91, 68, ' + (0.30 * gone) + ')');
    g.addColorStop(0.16, 'rgba(255, 91, 68, ' + (0.10 * gone) + ')');
    g.addColorStop(0.45, 'rgba(237, 234, 227, ' + (0.035 * gone) + ')');
    g.addColorStop(1,    'rgba(237, 234, 227, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(gx, gy, 190 * pulse, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(255, 236, 230, ' + (0.75 * pulse * gone) + ')';
    ctx.beginPath(); ctx.arc(gx, gy, 2.6, 0, 6.2832); ctx.fill();
  }

  function drawPlanets(lift) {
    planets.forEach(function (pl) {
      var px = pl.x * w + lift.x * pl.depth * 40;
      var py = pl.y * h + lift.y * pl.depth * 40 - (scrollY * pl.depth * 0.35) % (h * 2);
      if (py < -pl.r * 3) py += h * 2;

      var g = ctx.createRadialGradient(px - pl.r * 0.4, py - pl.r * 0.4, pl.r * 0.1, px, py, pl.r);
      g.addColorStop(0, 'rgba(' + pl.tone + ', 0.20)');
      g.addColorStop(1, 'rgba(' + pl.tone + ', 0.03)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, pl.r, 0, 6.2832); ctx.fill();

      ctx.strokeStyle = 'rgba(' + pl.tone + ', 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, pl.r, 0, 6.2832); ctx.stroke();

      if (pl.ring) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.42);
        ctx.scale(1, 0.26);
        ctx.beginPath(); ctx.arc(0, 0, pl.r * 1.75, 0, 6.2832);
        ctx.strokeStyle = 'rgba(' + pl.tone + ', 0.20)';
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  function drawStars(t, lift, dt) {
    var R = 130;          /* cursor influence radius */
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var bx = st.x + lift.x * st.depth * 22;
      var by = (st.y - scrollY * st.depth * 0.35) % (h * 2);
      if (by < -10) by += h * 2;

      /* push away from the cursor, then ease home */
      if (mouse.on) {
        var dx = bx + st.ox - mouse.x, dy = by + st.oy - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var force = (1 - d / R) * 26 * st.depth;
          st.ox += (dx / d) * force * dt * 6;
          st.oy += (dy / d) * force * dt * 6;
        }
      }
      st.ox += (0 - st.ox) * Math.min(1, dt * 2.4);
      st.oy += (0 - st.oy) * Math.min(1, dt * 2.4);

      var a = 0.14 + Math.abs(Math.sin(t * 0.0007 + st.p)) * 0.34;
      var moved = Math.min(1, (Math.abs(st.ox) + Math.abs(st.oy)) / 40);
      ctx.fillStyle = moved > 0.05
        ? 'rgba(255, 91, 68, ' + (a + moved * 0.4) + ')'
        : 'rgba(237, 234, 227, ' + a + ')';
      ctx.fillRect(bx + st.ox, by + st.oy, st.r, st.r);
    }
  }

  /* eased cursor offset, drives parallax on everything */
  var lift = { x: 0, y: 0 }, target = { x: 0, y: 0 };

  var last = 0;
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!REDUCED) drift += dt * 0.085;

    lift.x += (target.x - lift.x) * Math.min(1, dt * 2.2);
    lift.y += (target.y - lift.y) * Math.min(1, dt * 2.2);

    ctx.clearRect(0, 0, w, h);
    drawStars(now, lift, dt);
    drawPlanets(lift);
    sun(now);
    terrain(lift);

    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });
  window.addEventListener('resize', size);

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
    target.x = (e.clientX / w - 0.5) * 2;
    target.y = (e.clientY / h - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { mouse.on = false; target.x = 0; target.y = 0; });

  size();
  scrollY = window.scrollY;
  if (REDUCED) { drawStars(0, lift, 0); drawPlanets(lift); sun(0); terrain(lift); return; }
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();

/* --- 2. The rail ---------------------------------------------------------- */
(function () {
  var rail = document.querySelector('.rail');
  var fill = document.getElementById('rail-fill');
  if (!rail || !fill) return;

  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-node]'));
  var dots = sections.map(function (s) {
    var d = document.createElement('i');
    d.className = 'rail__node';
    rail.appendChild(d);
    return d;
  });

  function place() {
    var docH = document.documentElement.scrollHeight;
    sections.forEach(function (s, i) {
      var mid = s.offsetTop + s.offsetHeight * 0.35;
      dots[i].style.top = (mid / docH * 100) + '%';
    });
  }

  function update() {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var p = docH > 0 ? window.scrollY / docH : 0;
    fill.style.height = (p * 100) + '%';
    var y = window.scrollY + window.innerHeight * 0.45;
    sections.forEach(function (s, i) {
      dots[i].classList.toggle('on', y >= s.offsetTop);
    });
  }

  place(); update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', function () { place(); update(); });
})();

/* --- 3. Entrance ---------------------------------------------------------- */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('intro')) return;

  var EXPO = 'cubic-bezier(.16,1,.3,1)', QUINT = 'cubic-bezier(.22,1,.36,1)', TYPE = 'cubic-bezier(.22,.85,.24,1)';
  function q(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function play(els, kf, d, delay, stagger) {
    els.forEach(function (el, i) {
      el.animate(kf, { duration: d.dur, delay: delay + (stagger || 0) * i, easing: d.ease, fill: 'both' });
    });
  }
  var rise = function (px) { return [{ opacity: 0, transform: 'translateY(' + px + 'px)' }, { opacity: 1, transform: 'none' }]; };

  var done = false;
  function finish() { if (!done) { done = true; root.classList.remove('intro'); } }

  function start() {
    play(q('.logo'), [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { dur: 700, ease: EXPO }, 0);
    play(q('.nav a'), rise(7), { dur: 600, ease: QUINT }, 120, 55);
    play(q('.header-cta, .burger'), [{ opacity: 0 }, { opacity: 1 }], { dur: 550, ease: QUINT }, 180);
    play(q('.rule'), [{ opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0.34em' }], { dur: 1100, ease: EXPO }, 200);
    play(q('.line > span'), [{ transform: 'translateY(115%)' }, { transform: 'none' }], { dur: 960, ease: TYPE }, 340, 90);
    play(q('.hero .lede'), rise(14), { dur: 700, ease: QUINT }, 740);
    play(q('.hero-actions'), rise(18), { dur: 680, ease: EXPO }, 900);
    play(q('.stat'), rise(12), { dur: 640, ease: QUINT }, 1040, 85);
    setTimeout(finish, 2400);
  }

  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1000); })]).then(start);
  } else { start(); }
  setTimeout(finish, 4000);
})();

/* --- 4. Scroll reveals ---------------------------------------------------- */
(function () {
  var items = document.querySelectorAll('.rise');
  if (!items.length) return;
  if (REDUCED || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  items.forEach(function (el) { io.observe(el); });
})();

/* --- 5. Mobile menu ------------------------------------------------------- */
(function () {
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('site-nav');
  if (!burger || !nav) return;
  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', function () { setOpen(!document.body.classList.contains('nav-open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
})();

/* --- 6. Scanner: assembles a real build sheet ----------------------------- */
(function () {
  var root = document.getElementById('pain-scanner');
  var chain = document.getElementById('chain');
  if (!root || !chain) return;

  var steps  = root.querySelectorAll('.scanner__step');
  var status = document.getElementById('build-status');
  var foot   = document.getElementById('build-foot');
  var nCount = document.getElementById('node-count');
  var runEl  = document.getElementById('build-run');

  var keys = ['industry', 'pain', 'tools'];
  var answers = { industry: null, pain: null, tools: null };
  var current = 1;

  var industryLabel = {
    logistics: 'Logistics and freight', recruitment: 'Recruitment', clinic: 'Clinics and medical',
    saas: 'B2B SaaS', ecommerce: 'Ecommerce', other: 'Your industry'
  };

  var pain = {
    entry:      { title: 'Document and spreadsheet ingestion', hours: 9,  days: '5 to 7',
                  nodes: [['Read','Open attachment and extract rows'],['AI','Normalise columns, however messy'],['Rule','Validate and flag anything that will not parse']],
                  body: 'Files arrive, someone opens them, retypes the contents somewhere else. This reads each file as it lands, normalises the columns whatever shape they are in, writes the rows to your system of record, and flags what does not parse instead of dropping it silently.' },
    email:      { title: 'Instant enquiry responder', hours: 7, days: '4 to 6',
                  nodes: [['AI','Classify what the message actually asks'],['Rule','Route by intent and urgency'],['AI','Draft a reply for this specific enquiry']],
                  body: 'Every inbound message is read, classified by what it is really asking, and answered in under a minute with a reply written for that enquiry. Anything genuinely unusual escalates to you rather than getting answered badly.' },
    leads:      { title: 'Daily qualified lead pipeline', hours: 11, days: '6 to 8',
                  nodes: [['Fetch','Source businesses matching your criteria'],['Enrich','Find and verify contact details'],['AI','Write a personalised opener for each'],['Rule','Dedupe against everyone contacted before']],
                  body: 'Runs before you wake up. Sources prospects on your criteria, enriches them with real contact details, verifies every email so you are not burning your sending domain, dedupes against your history, and hands you the day list ready to send.' },
    followup:   { title: 'Follow-up sequencer', hours: 5, days: '3 to 5',
                  nodes: [['Watch','Check for a reply on each thread'],['Rule','Wait your interval, stop on any human reply'],['AI','Write the next message in your voice']],
                  body: 'Nobody goes cold because someone forgot. The system watches for replies, follows up on your timing in your wording when one does not arrive, and stops the second a human responds.' },
    reports:    { title: 'Automated reporting engine', hours: 4, days: '3 to 5',
                  nodes: [['Fetch','Pull the numbers from every source'],['Compute','Totals, rankings and week on week'],['AI','Write the summary and surface exceptions']],
                  body: 'The numbers you rebuild by hand every week get pulled, compiled and delivered on schedule. Same format every time, with the exceptions at the top rather than buried on row 200.' },
    scheduling: { title: 'Booking and reminder engine', hours: 6, days: '4 to 6',
                  nodes: [['Confirm','Send confirmation the moment it is booked'],['Schedule','Timed reminder sequence before the slot'],['Rule','Detect no-show and offer a rebook']],
                  body: 'Confirmations go out instantly, then a timed reminder sequence runs ahead of the appointment. No-shows drop because the reminders actually land, and rescheduling happens without a phone call.' }
  };

  var trigger = {
    google: ['Gmail', 'New message matching your filter'],
    excel:  ['File', 'Spreadsheet arrives or is updated'],
    crm:    ['CRM', 'Record created or stage changed'],
    chat:   ['Telegram', 'New message or command'],
    mixed:  ['Webhook', 'Any inbound event from any tool']
  };
  var output = {
    google: ['Google Sheets', 'Row written, owner notified by email'],
    excel:  ['Your sheet', 'Rows written back, exceptions listed'],
    crm:    ['CRM', 'Record updated, owner notified'],
    chat:   ['Telegram', 'Result posted to your channel'],
    mixed:  ['Everywhere', 'Delivered into the tools you already use']
  };
  var price = { entry: '$997', email: '$697', leads: '$997', followup: '$697', reports: '$697', scheduling: '$697' };
  var monthly = { entry: '$397', email: '$247', leads: '$397', followup: '$247', reports: '$247', scheduling: '$247' };

  function setStatus(txt, live) {
    status.innerHTML = '<i></i>' + txt;
    status.classList.toggle('is-live', !!live);
  }

  function clearChain() {
    chain.innerHTML = '<p class="chain__empty">Answer the first question and the system starts assembling here.</p>';
    foot.hidden = true;
    setStatus('Waiting for input', false);
  }

  function addNode(kind, label, sub, cls) {
    var empty = chain.querySelector('.chain__empty');
    if (empty) empty.remove();
    if (chain.children.length) {
      var wire = document.createElement('div');
      wire.className = 'wire';
      wire.innerHTML = '<i></i>';
      chain.appendChild(wire);
    }
    var n = document.createElement('div');
    n.className = 'node' + (cls ? ' ' + cls : '');
    n.innerHTML =
      '<span class="node__kind">' + kind + '</span>' +
      '<span class="node__main"><b></b><em></em></span>';
    n.querySelector('b').textContent = label;
    n.querySelector('em').textContent = sub;
    chain.appendChild(n);
  }

  function rebuild() {
    clearChain();
    var count = 0;

    if (answers.industry) {
      addNode('CTX', industryLabel[answers.industry], 'Rules and wording tuned to this industry', 'node--ctx');
      count++;
      setStatus('Building', true);
    }
    if (answers.tools) {
      var t = trigger[answers.tools];
      addNode('TRG', t[0], t[1], 'node--trg');
      count++;
    }
    if (answers.pain) {
      pain[answers.pain].nodes.forEach(function (nd) {
        addNode(nd[0].slice(0, 3).toUpperCase(), nd[0], nd[1]);
        count++;
      });
    }
    if (answers.pain && answers.tools) {
      var o = output[answers.tools];
      addNode('OUT', o[0], o[1], 'node--out');
      count++;
      setStatus('Ready to build', true);
      runEl.textContent = 'Runs on every trigger, unattended';
    } else {
      runEl.textContent = 'Not yet running';
    }

    if (count) {
      foot.hidden = false;
      nCount.textContent = count;
    }
  }

  function show(n) {
    current = n;
    steps.forEach(function (s) { s.classList.toggle('is-active', Number(s.dataset.step) === n); });
  }

  function render() {
    var pk = pain[answers.pain];
    document.getElementById('scanner-tag').textContent = industryLabel[answers.industry] + ' / build sheet';
    document.getElementById('scanner-title').textContent = pk.title;
    document.getElementById('scanner-body').textContent = pk.body;
    document.getElementById('spec-hours').textContent = '~' + pk.hours;
    document.getElementById('spec-days').textContent = pk.days;
    document.getElementById('spec-price').textContent = price[answers.pain] + ' + ' + monthly[answers.pain];
  }

  root.querySelectorAll('.scanner__opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      answers[keys[current - 1]] = btn.dataset.value;
      rebuild();
      if (current === 3) { render(); show(4); } else { show(current + 1); }
    });
  });

  root.querySelectorAll('.scanner__back').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.hasAttribute('data-restart')) {
        answers = { industry: null, pain: null, tools: null };
        clearChain();
        show(1);
      } else {
        answers[keys[current - 1]] = null;
        rebuild();
        show(Math.max(1, current - 1));
      }
    });
  });
})();

/* --- 7. Audit form --------------------------------------------------------
   Posts to Web3Forms. Paste your access key below and the form is live.
   Until a real key is set, the form refuses to fake a success message. */
(function () {
  var WEB3FORMS_KEY = 'c64eb17d-d6f8-4d00-8915-9b58559682de';

  var form = document.getElementById('audit-form');
  if (!form) return;
  var btn  = document.getElementById('f-submit');
  var done = document.getElementById('f-done');
  var err  = document.getElementById('f-error');

  function fail(msg) {
    err.textContent = msg;
    err.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Get my free audit';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;

    var d = new FormData(form);
    var name = (d.get('name') || '').trim();
    var email = (d.get('email') || '').trim();
    var message = (d.get('message') || '').trim();

    if (!name || !email || !message) { return fail('Please fill in your name, email and a short description.'); }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { return fail('That email address does not look right.'); }
    if (WEB3FORMS_KEY.indexOf('PASTE_YOUR') === 0) {
      return fail('This form is not connected yet. Please email nazmul@zenmul.com directly.');
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: 'Free audit request from ' + name + (d.get('company') ? ', ' + d.get('company') : ''),
        from_name: 'Zenmul audit form',
        name: name,
        email: email,
        message: [
          'NEW FREE AUDIT REQUEST',
          '',
          'Name: ' + name,
          'Email: ' + email,
          'Company: ' + (d.get('company') || 'Not given'),
          'Industry: ' + (d.get('industry') || 'Not given'),
          'Links: ' + (d.get('links') || 'Not given'),
          '',
          'What they said:',
          message
        ].join('\n')
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res && res.success) {
        form.hidden = true;
        done.hidden = false;
        done.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        fail('Something went wrong sending that. Please email nazmul@zenmul.com instead.');
      }
    })
    .catch(function () {
      fail('Could not reach the server. Please email nazmul@zenmul.com instead.');
    });
  });
})();

/* --- 8. Case study filters ------------------------------------------------ */
(function () {
  var wrap = document.querySelector('.filters');
  var grid = document.getElementById('cases');
  if (!wrap || !grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.csx'));
  var count = document.getElementById('count');
  var empty = document.getElementById('empty');

  wrap.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    var f = btn.dataset.filter;
    wrap.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-on', c === btn); });
    var shown = 0;
    cards.forEach(function (c) {
      var on = (f === 'all' || c.dataset.cat === f);
      c.classList.toggle('is-off', !on);
      if (on) shown++;
    });
    count.textContent = shown;
    empty.hidden = shown > 0;
  });
})();
