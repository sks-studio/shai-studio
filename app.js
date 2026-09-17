/* Shai Studios MVP — public site + agency workspace + client portal.
   Zero dependencies. State lives in localStorage so the demo is fully usable. */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const el = document.getElementById.bind(document);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'R ' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', yyyy: undefined, year: 'numeric' }) : '—');
  const ago = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.floor(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  };
  function toast(msg) {
    const t = el('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  /* ---------------- data ---------------- */
  const KEY = 'shai-studios-mvp-v1';
  const VAT = 0.15;

  function seed() {
    const c = (name, person, email, phone, service, status) => ({ id: uid('c'), name, person, email, phone, service, status, notes: '' });
    const clients = [
      c('LUMI Collective', 'Sarah Ndlovu', 'sarah@lumi.co.za', '+27 82 123 4567', 'Social Media Management', 'Active'),
      c('Nomu Skincare', 'Thabo Mokoena', 'thabo@nomu.co.za', '+27 83 221 9087', 'Brand Strategy', 'Active'),
      c('The Wellness Edit', 'Jessica Lane', 'jessica@wellnessedit.co.za', '+27 81 442 1190', 'Content', 'Active'),
      c('Moyo Interiors', 'Daniel Kgatle', 'daniel@moyo.co.za', '+27 71 556 3321', 'Website', 'Active'),
      c('Rooted Foods', 'Ayesha Patel', 'ayesha@rootedfoods.co.za', '+27 84 330 7712', 'Digital Campaign', 'On Hold'),
      c('The Kind Club', 'Zoe Martin', 'zoe@thekindclub.co.za', '+27 79 908 4412', 'SEO', 'Active')
    ];
    const byName = (n) => clients.find((x) => x.name === n).id;
    const p = (name, client, type, deadline, progress, status) => ({ id: uid('p'), name, clientId: byName(client), type, deadline, progress, status });
    const projects = [
      p('Social Media Management', 'LUMI Collective', 'Content', daysFromNow(14), 75, 'In Progress'),
      p('Brand Strategy', 'Nomu Skincare', 'Strategy', daysFromNow(29), 40, 'In Progress'),
      p('Website Redesign', 'Moyo Interiors', 'Web Design', daysFromNow(42), 20, 'Planning'),
      p('Digital Campaign', 'Rooted Foods', 'Digital', daysFromNow(9), 90, 'Review'),
      p('SEO Optimisation', 'The Kind Club', 'SEO', daysFromNow(60), 10, 'Planning'),
      p('Content Creation', 'The Wellness Edit', 'Content', daysFromNow(24), 60, 'In Progress')
    ];
    const inv = (no, client, issue, due, items, status) => ({
      id: uid('i'), number: no, clientId: byName(client), issueDate: issue, dueDate: due, terms: 14,
      items, status, notes: 'Thank you for your continued partnership.', createdAt: Date.now()
    });
    const li = (d, q, r) => ({ desc: d, qty: q, rate: r });
    const invoices = [
      inv('INV-013', 'Moyo Interiors', daysFromNow(-2), daysFromNow(12), [li('Website Design (Phase 1)', 1, 8500)], 'Draft'),
      inv('INV-012', 'LUMI Collective', daysFromNow(-8), daysFromNow(6), [li('Social Media Strategy', 1, 4500), li('Content Creation (Monthly)', 1, 6000), li('Community Management', 1, 2500)], 'Sent'),
      inv('INV-011', 'Nomu Skincare', daysFromNow(-44), daysFromNow(-30), [li('Brand Strategy Retainer', 2, 6000)], 'Overdue'),
      inv('INV-010', 'The Kind Club', daysFromNow(-60), daysFromNow(-46), [li('SEO Optimisation', 1, 4500)], 'Paid'),
      inv('INV-009', 'Rooted Foods', daysFromNow(-90), daysFromNow(-76), [li('Digital Campaign Management', 1, 9200)], 'Paid'),
      inv('INV-008', 'The Wellness Edit', daysFromNow(-120), daysFromNow(-106), [li('Content Retainer', 1, 5600)], 'Sent')
    ];
    return {
      clients, projects, invoices, enquiries: [],
      activity: [
        { text: 'Invoice INV-012 sent to LUMI Collective', at: Date.now() - 2 * 3600e3 },
        { text: 'Project Website Redesign moved to In Progress', at: Date.now() - 4 * 3600e3 },
        { text: 'New client enquiry from The Kind Club', at: Date.now() - 26 * 3600e3 },
        { text: 'Payment received from Nomu Skincare', at: Date.now() - 30 * 3600e3 },
        { text: 'File added to Moyo Interiors project', at: Date.now() - 50 * 3600e3 }
      ],
      settings: { agency: 'Shai Studios', owner: 'Tayla Smith', email: 'hello@shaistudios.co.za', phone: '+27 71 123 4567', address: '123 Loop Street, Cape Town, 8001', vat: 15 },
      session: null
    };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { db = seed(); }
  if (!db.clients) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const log = (text) => { db.activity.unshift({ text, at: Date.now() }); db.activity = db.activity.slice(0, 40); };

  const client = (id) => db.clients.find((c) => c.id === id) || { name: 'Unknown', person: '', email: '' };
  const invTotals = (i) => {
    const sub = i.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
    const vat = sub * VAT; return { sub, vat, total: sub + vat };
  };
  const balanceOf = (cid) => db.invoices.filter((i) => i.clientId === cid && (i.status === 'Sent' || i.status === 'Overdue')).reduce((s, i) => s + invTotals(i).total, 0);
  const nextInvoiceNo = () => {
    const n = db.invoices.reduce((m, i) => Math.max(m, parseInt(String(i.number).replace(/\D/g, ''), 10) || 0), 0);
    return 'INV-' + String(n + 1).padStart(3, '0');
  };

  /* ---------------- router ---------------- */
  const routes = {};
  const route = (path, fn) => (routes[path] = fn);
  let current = { path: '/', params: [] };

  function go(hash) { location.hash = hash; }
  window.go = go;

  function resolve() {
    const raw = (location.hash || '#/').slice(1) || '/';
    const [path] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    // dynamic segments: /app/clients/:id and /app/invoices/:id
    let key = '/' + parts.join('/');
    let params = [];
    if (routes[key]) return { key, params };
    if (parts.length === 3 && parts[0] === 'app' && (parts[1] === 'clients' || parts[1] === 'invoices')) {
      return { key: '/app/' + parts[1] + '/:id', params: [parts[2]] };
    }
    return { key: routes[key] ? key : '/', params };
  }

  function render() {
    const { key, params } = resolve();
    const fn = routes[key] || routes['/'];
    current = { path: key, params };
    const guarded = key.startsWith('/app') || key.startsWith('/portal');
    if (guarded && !db.session) { location.replace('#/login'); return; }
    el('app').innerHTML = fn(...params);
    window.scrollTo(0, 0);
    bind();
  }
  window.addEventListener('hashchange', render);

  /* ---------------- shared chrome ---------------- */
  const NAV = [['/', 'Home'], ['/services', 'Services'], ['/work', 'Work'], ['/about', 'About'], ['/pricing', 'Pricing'], ['/contact', 'Contact']];

  function publicNav() {
    return `<header class="nav"><div class="wrap">
      <a href="#/" class="brand">Shai Studios<small>Digital Marketing Agency</small></a>
      <nav class="navlinks" id="pubnav">${NAV.map(([h, l]) => `<a href="#${h}" class="${current.path === h ? 'on' : ''}">${l}</a>`).join('')}
        <a href="#/login">Client Login</a></nav>
      <div class="row">
        <a class="btn" href="#/contact">Enquire Now →</a>
        <button class="navtoggle" data-toggle="pubnav" aria-label="Menu">☰</button>
      </div>
    </div></header>`;
  }

  function publicFooter() {
    return `<footer class="site"><div class="wrap">
      <div><div class="brand" style="color:#fff">Shai Studios</div>
      <p style="color:#9fb8ab;font-size:.85rem;margin:6px 0 0">Independent digital marketing agency · Cape Town</p></div>
      <nav class="row" style="flex-wrap:wrap;gap:18px">${NAV.map(([h, l]) => `<a href="#${h}">${l}</a>`).join('')}<a href="#/login">Client Login</a></nav>
      <div style="font-size:.8rem;color:#9fb8ab">Strategy creates opportunity.</div>
    </div></footer>`;
  }

  const page = (body) => publicNav() + body + publicFooter();

  /* ---------------- public pages ---------------- */
  const SERVICES = [
    { icon: '◍', name: 'Brand', blurb: 'Positioning, visual identity and brand strategy.', items: ['Brand strategy', 'Visual identity', 'Brand messaging'], from: 8500 },
    { icon: '✎', name: 'Content', blurb: 'High-performing content for every platform.', items: ['Content strategy', 'Photo & video', 'Social media management'], from: 6500 },
    { icon: '◪', name: 'Growth', blurb: 'Data-driven marketing to scale your business.', items: ['Paid ads management', 'SEO optimisation', 'Performance reporting'], from: 7500 },
    { icon: '▣', name: 'Digital', blurb: 'Websites and digital experiences that convert.', items: ['Website design', 'Web development', 'Conversion optimisation'], from: 12000 }
  ];
  const WORK = [
    { c: 'Lumi Collective', s: 'Social Media Management', r: '+320% engagement', tag: 'Content' },
    { c: 'The Wellness Edit', s: 'Brand Strategy', r: '+180% revenue', tag: 'Brand' },
    { c: 'Moyo Interiors', s: 'Website & SEO', r: '+240% organic traffic', tag: 'Digital' },
    { c: 'Nomu Skincare', s: 'Content Creation', r: '+150% online sales', tag: 'Content' },
    { c: 'Rooted Foods', s: 'Digital Campaign', r: '+290% audience growth', tag: 'Growth' },
    { c: 'The Kind Club', s: 'Brand & Content', r: '+310% community growth', tag: 'Brand' }
  ];
  const PLANS = [
    { name: 'Launch', price: 6500, blurb: 'Get started with the essentials.', items: ['Social media management', '10 posts per month', 'Basic reporting', 'Email support'] },
    { name: 'Grow', price: 12000, blurb: 'Accelerate your momentum.', items: ['Everything in Launch', 'Content creation (photo & video)', 'Paid ads management', 'Monthly strategy call', 'Priority support'], featured: true },
    { name: 'Partner', price: 20000, blurb: 'A tailored solution for scale.', items: ['Custom strategy & roadmap', 'Full-service support', 'Dedicated account manager', 'Advanced reporting', 'Website & digital projects'] }
  ];

  const workCard = (w) => `<article class="card work-card"><div class="art small"></div><div class="body">
      <h3 style="font-size:1.05rem">${esc(w.c)}</h3>
      <p style="margin:2px 0 8px;font-size:.86rem">${esc(w.s)}</p>
      <div class="stat" style="color:var(--green-700)">${esc(w.r)}</div></div></article>`;

  route('/', () => page(`
    <section class="hero"><div class="wrap hero-grid">
      <div>
        <div class="eyebrow">Strategy meets creativity</div>
        <h1 style="margin-top:14px">Your brand,<br/>built forward.</h1>
        <p class="lead">Professional digital marketing made accessible. We help purpose-driven businesses grow through strategy, content and digital marketing that delivers real results — without the agency jargon.</p>
        <div class="row" style="margin-top:22px"><a class="btn" href="#/contact">Enquire Now →</a><a class="btn ghost" href="#/work">View our work</a></div>
      </div>
      <div class="art"><div class="quote">Ideas. Strategy.<br/>Real progress.</div></div>
    </div></section>

    <section class="band"><div class="wrap">
      <div class="grid cards-4">${SERVICES.map((s) => `<div class="card"><div class="icon">${s.icon}</div>
        <h3>${s.name}</h3><p style="font-size:.9rem">${esc(s.blurb)}</p>
        <div class="price-from">From</div><div class="price">${money(s.from)}</div></div>`).join('')}</div>
    </div></section>

    <section class="band alt"><div class="wrap">
      <div class="row between" style="margin-bottom:24px"><h2>Selected work</h2><a class="linkish" href="#/work">View all work →</a></div>
      <div class="grid cards-3">${WORK.slice(0, 3).map(workCard).join('')}</div>
    </div></section>

    <section class="band"><div class="wrap"><div class="cta">
      <div><h2>Let's build forward.</h2><p style="color:#c6d7cc;margin:6px 0 0">Brand. Content. Growth. Digital.</p></div>
      <a class="btn light" href="#/contact">Enquire Now →</a>
    </div></div></section>`));

  route('/services', () => page(`
    <section class="band"><div class="wrap">
      <div class="eyebrow">Our services</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Strategy.<br/>Content. Growth.<br/>Real results.</h2>
        <p style="padding-top:10px">A full suite of digital marketing services designed for ambitious businesses. Simple, effective and accessible.</p>
      </div>
      <div class="grid cards-4" style="margin-top:36px">${SERVICES.map((s) => `<div class="card"><div class="art small" style="min-height:120px;margin:-22px -22px 18px;border-radius:14px 14px 0 0"></div>
        <div class="icon">${s.icon}</div><h3>${s.name}</h3><p style="font-size:.9rem">${esc(s.blurb)}</p>
        <ul class="checks">${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="row between"><div><div class="price-from">Starting from</div><div class="price">${money(s.from)}</div></div>
        <a class="btn sm ghost" href="#/contact">→</a></div></div>`).join('')}</div>
    </div></section>`));

  route('/work', () => page(`
    <section class="band"><div class="wrap">
      <div class="eyebrow">Our work</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Real brands.<br/>Real progress.</h2>
        <p style="padding-top:10px">Thoughtful strategy, powerful execution and measurable results.</p>
      </div>
      <div class="tabs" id="workTabs">${['All', 'Brand', 'Content', 'Growth', 'Digital'].map((t, i) => `<button class="tab ${i === 0 ? 'on' : ''}" data-filter="${t}">${t}</button>`).join('')}</div>
      <div class="grid cards-3" id="workGrid">${WORK.map(workCard).join('')}</div>
    </div></section>`));

  route('/about', () => page(`
    <section class="band"><div class="wrap">
      <div class="eyebrow">About Shai Studios</div>
      <div class="hero-grid" style="padding-top:18px">
        <div><h2>Built on purpose. Driven by progress.</h2>
          <p>Shai Studios is an independent digital marketing agency helping purpose-driven brands grow through strategy, content and digital. We believe great marketing should be accessible, human and results-driven.</p>
          <p style="font-family:var(--serif);font-size:1.4rem;color:var(--ink);margin-top:26px">Tayla</p>
          <div class="muted" style="font-size:.85rem">Founder & Agency Owner</div>
        </div>
        <div class="art"><div class="quote">People.<br/>Purpose.<br/>Progress.</div></div>
      </div>
      <div class="grid cards-3" style="margin-top:44px">
        <div class="card"><div class="icon">◎</div><h3>Our approach</h3><p style="font-size:.9rem">Strategic. Creative. Human. Always results-first.</p></div>
        <div class="card"><div class="icon">♡</div><h3>Our values</h3><p style="font-size:.9rem">Integrity, creativity, accessibility and impact.</p></div>
        <div class="card"><div class="icon">✦</div><h3>Our mission</h3><p style="font-size:.9rem">To help brands create opportunity through thoughtful digital marketing.</p></div>
      </div>
    </div></section>`));

  route('/pricing', () => page(`
    <section class="band"><div class="wrap">
      <div class="eyebrow">Pricing</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Marketing support for every stage.</h2>
        <p style="padding-top:10px">Clear packages. Real value. No hidden fees. All prices exclude VAT.</p>
      </div>
      <div class="grid cards-3" style="margin-top:40px">${PLANS.map((p) => `<div class="card pad-lg plan ${p.featured ? 'featured' : ''}">
        ${p.featured ? '<span class="badge-top">Most popular</span>' : ''}
        <h3>${p.name}</h3><p style="font-size:.88rem">${esc(p.blurb)}</p>
        <div class="price" style="font-size:2.2rem;margin:10px 0 0">${money(p.price)}</div>
        <div class="muted" style="font-size:.8rem">per month</div>
        <ul class="checks">${p.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <a class="btn ${p.featured ? '' : 'ghost'} block" href="#/contact">Get started</a></div>`).join('')}</div>
      <div class="card row between" style="margin-top:24px;flex-wrap:wrap">
        <div><h3>Need something custom?</h3><p style="margin:2px 0 0;font-size:.9rem">We offer bespoke corporate solutions for larger organisations.</p></div>
        <a class="btn ghost" href="#/contact">Request a custom quotation</a></div>
    </div></section>`));

  route('/contact', () => page(`
    <section class="band"><div class="wrap">
      <div class="eyebrow">Let's talk</div>
      <div class="hero-grid" style="padding-top:18px;align-items:start">
        <div><h2>Let's build forward.</h2>
          <p>Tell us about your project and we'll get back to you within 1–2 business days.</p>
          <div class="card" style="margin-top:22px">
            <div class="row" style="gap:10px"><span class="icon" style="margin:0">✉</span><div><div style="font-size:.8rem;font-weight:500">Email us</div><div class="muted" style="font-size:.88rem">${esc(db.settings.email)}</div></div></div>
            <div class="row" style="gap:10px;margin-top:14px"><span class="icon" style="margin:0">☏</span><div><div style="font-size:.8rem;font-weight:500">WhatsApp us</div><div class="muted" style="font-size:.88rem">${esc(db.settings.phone)}</div></div></div>
            <div class="row" style="gap:10px;margin-top:14px"><span class="icon" style="margin:0">⌖</span><div><div style="font-size:.8rem;font-weight:500">Based in</div><div class="muted" style="font-size:.88rem">Cape Town, South Africa</div></div></div>
          </div>
        </div>
        <form class="card pad-lg" id="enqForm">
          <div class="field-row"><div class="field"><label for="eName">Your name</label><input id="eName" required /></div>
          <div class="field"><label for="eEmail">Email address</label><input id="eEmail" type="email" required /></div></div>
          <div class="field-row"><div class="field"><label for="eType">Project type</label><select id="eType">${SERVICES.map((s) => `<option>${s.name}</option>`).join('')}<option>Not sure yet</option></select></div>
          <div class="field"><label for="eBudget">Budget range</label><select id="eBudget"><option>Under R5 000</option><option>R5 000 – R10 000</option><option>R10 000 – R20 000</option><option>R20 000+</option></select></div></div>
          <div class="field"><label for="eMsg">Tell us about your project</label><textarea id="eMsg" rows="4" placeholder="Share a few details about your goals..."></textarea></div>
          <button class="btn block" type="submit">Send enquiry →</button>
          <p class="muted" style="font-size:.76rem;margin-top:10px">Enquiries appear instantly in the agency workspace.</p>
        </form>
      </div>
    </div></section>`));

  /* ---------------- auth ---------------- */
  route('/login', () => `
    <div class="auth">
      <div class="panel"><div class="inner">
        <a href="#/" class="brand">Shai Studios<small>Agency Workspace</small></a>
        <h1 style="font-size:2.6rem;margin:34px 0 10px">Welcome back.</h1>
        <p style="margin-bottom:22px">Sign in to manage your clients, projects and invoices.</p>
        <form id="loginForm">
          <div class="field"><label for="lEmail">Email address</label><input id="lEmail" type="email" value="tayla@shaistudios.co.za" required /></div>
          <div class="field"><label for="lPass">Password</label><input id="lPass" type="password" value="demo1234" required /></div>
          <a class="linkish" style="font-size:.82rem" href="#/login" onclick="return false">Forgot password?</a>
          <button class="btn block" style="margin-top:16px" type="submit">Sign in →</button>
          <div id="loginErr" class="error"></div>
        </form>
        <div class="row" style="margin-top:18px;gap:8px">
          <button class="btn ghost sm" data-demo="agency">Demo: agency owner</button>
          <button class="btn ghost sm" data-demo="client">Demo: client portal</button>
        </div>
        <p class="muted" style="font-size:.76rem;margin-top:22px">🔒 Secure. Simple. Productive.</p>
      </div></div>
      <div class="side"><h2>Ideas.<br/>Strategy.<br/>Real progress.</h2>
        <p style="color:#bcd0c4;margin-top:18px;max-width:34ch">The digital marketing partner for ambitious businesses.</p></div>
    </div>`);

  /* ---------------- workspace shell ---------------- */
  const APPNAV = [['/app', '⌂', 'Overview'], ['/app/clients', '◔', 'Clients'], ['/app/projects', '▤', 'Projects'], ['/app/invoices', '❐', 'Invoices'], ['/app/settings', '⚙', 'Settings']];

  function shell(title, body, actions) {
    const s = db.session || {};
    const on = (h) => (current.path === h || (h !== '/app' && current.path.startsWith(h)) ? 'on' : '');
    return `<div class="shell">
      <aside class="side-nav noprint" id="appnav">
        <a href="#/app" class="brand">Shai Studios<small>Agency Workspace</small></a>
        ${APPNAV.map(([h, i, l]) => `<a href="#${h}" class="${on(h)}"><span>${i}</span>${l}</a>`).join('')}
        <div class="spacer"></div>
        <div class="who"><div class="avatar">${initials(s.name)}</div><div><div style="color:#fff;font-size:.85rem">${esc(s.name || '')}</div><div style="font-size:.72rem">${esc(s.role || '')}</div></div></div>
        <a href="#/login" data-signout>↩ Sign out</a>
      </aside>
      <main class="main">
        <div class="topbar noprint">
          <div class="row"><button class="navtoggle" data-toggle="appnav">☰</button>
          <input id="globalSearch" placeholder="Search clients, invoices or projects..." /></div>
          <div class="row">${actions || ''}<div class="avatar">${initials(s.name)}</div></div>
        </div>
        <div class="page">${body}</div>
      </main></div>`;
  }

  route('/app', () => {
    const paid = db.invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invTotals(i).total, 0);
    const out = db.invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + invTotals(i).total, 0);
    const over = db.invoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + invTotals(i).total, 0);
    const total = db.invoices.reduce((s, i) => s + invTotals(i).total, 0);
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const kpi = (l, v, d, bad) => `<div class="card kpi"><div class="muted" style="font-size:.8rem">${l}</div><div class="v">${money(v)}</div><div class="d ${bad ? 'bad' : ''}">${d}</div></div>`;
    const recent = db.invoices.slice(0, 5).map((i) => `<tr><td>${esc(client(i.clientId).name)}</td><td>${esc(i.number)}</td><td>${money(invTotals(i).total)}</td>
      <td><span class="pill ${i.status.toLowerCase()}">${i.status}</span></td><td>${fmtDate(i.issueDate)}</td>
      <td class="right"><button class="btn sm ghost" data-goto="#/app/invoices/${i.id}">Open</button></td></tr>`).join('');
    const enq = db.enquiries.length ? `<div class="card" style="margin-bottom:20px"><div class="row between"><h3>New enquiries (${db.enquiries.length})</h3><button class="btn sm ghost" data-clear-enq>Clear</button></div>
      <ul class="activity">${db.enquiries.slice(0, 4).map((e) => `<li><span class="avatar">${initials(e.name)}</span><div><div>${esc(e.name)} — ${esc(e.type)} · ${esc(e.budget)}</div><div class="muted" style="font-size:.8rem">${esc(e.email)} · ${esc(e.message || 'No message')}</div></div>
        <span class="when">${ago(e.at)}</span><button class="btn sm" data-convert="${e.id}">Add as client</button></li>`).join('')}</ul></div>` : '';
    return shell('Overview', `
      <div class="page-head"><div><h1 style="font-size:2.6rem">${greet}, ${esc((db.session.name || '').split(' ')[0])}.</h1>
        <p>Here's what's happening at ${esc(db.settings.agency)}.</p></div>
        <div class="muted" style="font-size:.85rem">${new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
      <div class="grid kpis">
        ${kpi('Total invoiced', total, db.invoices.length + ' invoices')}
        ${kpi('Paid', paid, Math.round((paid / (total || 1)) * 100) + '% of total')}
        ${kpi('Outstanding', out, db.invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length + ' awaiting payment')}
        ${kpi('Overdue', over, over > 0 ? 'Needs follow-up' : 'All clear', over > 0)}
      </div>
      <div class="grid cards-2" style="margin-top:20px;grid-template-columns:1.4fr 1fr">
        <div>
          ${enq}
          <div class="table-card"><div class="row between" style="padding:16px 18px"><h3>Recent invoices</h3><a class="linkish" href="#/app/invoices">View all →</a></div>
          <table><thead><tr><th>Client</th><th>Invoice</th><th>Amount</th><th>Status</th><th>Issued</th><th></th></tr></thead><tbody>${recent}</tbody></table></div>
        </div>
        <div>
          <div class="card"><h3>Quick actions</h3>
            <div class="grid cards-2" style="margin-top:12px;gap:10px">
              <button class="btn ghost" data-modal="client">＋ Add client</button>
              <button class="btn ghost" data-modal="project">＋ New project</button>
              <button class="btn" data-goto="#/app/invoices/new">＋ Create invoice</button>
              <button class="btn ghost" data-goto="#/app/clients">View clients</button>
            </div></div>
          <div class="card" style="margin-top:20px"><h3>Recent activity</h3>
            <ul class="activity">${db.activity.slice(0, 6).map((a) => `<li><span>•</span><span>${esc(a.text)}</span><span class="when">${ago(a.at)}</span></li>`).join('')}</ul></div>
        </div>
      </div>`, `<button class="btn sm" data-goto="#/app/invoices/new">Create invoice</button>`);
  });

  route('/app/clients', () => {
    const rows = db.clients.map((c) => `<tr>
      <td><div class="row" style="gap:10px"><span class="avatar">${initials(c.name)}</span><b>${esc(c.name)}</b></div></td>
      <td><span class="pill ${c.status === 'On Hold' ? 'hold' : ''}">${esc(c.status)}</span></td>
      <td>${esc(c.person)}<div class="muted" style="font-size:.78rem">${esc(c.email)}</div></td>
      <td>${esc(c.service)}</td>
      <td>${money(balanceOf(c.id))}</td>
      <td class="right"><button class="btn sm ghost" data-goto="#/app/clients/${c.id}">Open</button>
      <button class="btn sm ghost" data-del-client="${c.id}">Delete</button></td></tr>`).join('');
    return shell('Clients', `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Clients</h1><p>Build and manage lasting client relationships.</p></div>
        <button class="btn" data-modal="client">＋ Add client</button></div>
      <div class="table-card"><table><thead><tr><th>Client</th><th>Status</th><th>Contact person</th><th>Active service</th><th>Outstanding</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">No clients yet.</td></tr>'}</tbody></table></div>`,
      `<button class="btn sm" data-modal="client">Add client</button>`);
  });

  route('/app/clients/:id', (id) => {
    const c = db.clients.find((x) => x.id === id);
    if (!c) return shell('Client', `<div class="empty card">Client not found. <a class="linkish" href="#/app/clients">Back to clients</a></div>`);
    const projs = db.projects.filter((p) => p.clientId === id);
    const invs = db.invoices.filter((i) => i.clientId === id);
    return shell(c.name, `
      <a class="linkish" href="#/app/clients">← Back to clients</a>
      <div class="page-head" style="margin-top:14px"><div class="row" style="gap:16px">
        <span class="avatar" style="width:64px;height:64px;font-size:1.2rem">${initials(c.name)}</span>
        <div><h1 style="font-size:2rem">${esc(c.name)} <span class="pill ${c.status === 'On Hold' ? 'hold' : ''}">${esc(c.status)}</span></h1>
        <p style="margin:2px 0 0">${esc(c.service)} · ${esc(c.email)} · ${esc(c.phone)}</p></div></div>
        <div class="row"><button class="btn ghost" data-modal="project" data-client="${c.id}">＋ New project</button>
        <button class="btn" data-goto="#/app/invoices/new?client=${c.id}">＋ Create invoice</button></div></div>
      <div class="grid cards-2" style="grid-template-columns:1.4fr 1fr">
        <div>
          <div class="table-card" style="margin-bottom:20px"><div style="padding:16px 18px"><h3>Projects</h3></div>
            <table><thead><tr><th>Project</th><th>Deadline</th><th>Progress</th><th>Status</th></tr></thead><tbody>
            ${projs.map((p) => `<tr><td>${esc(p.name)}</td><td>${fmtDate(p.deadline)}</td>
              <td><div class="row"><div class="bar" style="flex:1"><i style="width:${p.progress}%"></i></div><span class="muted" style="font-size:.78rem">${p.progress}%</span></div></td>
              <td><span class="pill">${esc(p.status)}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No projects yet.</td></tr>'}
            </tbody></table></div>
          <div class="table-card"><div style="padding:16px 18px"><h3>Invoices</h3></div>
            <table><thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
            ${invs.map((i) => `<tr><td>${esc(i.number)}</td><td>${fmtDate(i.issueDate)}</td><td>${fmtDate(i.dueDate)}</td><td>${money(invTotals(i).total)}</td>
              <td><span class="pill ${i.status.toLowerCase()}">${i.status}</span></td>
              <td class="right"><button class="btn sm ghost" data-goto="#/app/invoices/${i.id}">Open</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No invoices yet.</td></tr>'}
            </tbody></table></div>
        </div>
        <div>
          <div class="card"><h3>Account</h3>
            <div class="row between" style="margin-top:10px"><span class="muted">Outstanding balance</span><b>${money(balanceOf(c.id))}</b></div>
            <div class="row between" style="margin-top:8px"><span class="muted">Lifetime invoiced</span><b>${money(invs.reduce((s, i) => s + invTotals(i).total, 0))}</b></div>
            <div class="row between" style="margin-top:8px"><span class="muted">Active projects</span><b>${projs.length}</b></div>
          </div>
          <div class="card" style="margin-top:20px"><h3>Notes</h3>
            <textarea id="clientNotes" rows="5" placeholder="Add internal notes...">${esc(c.notes)}</textarea>
            <button class="btn sm" style="margin-top:10px" data-save-notes="${c.id}">Save notes</button></div>
        </div>
      </div>`);
  });

  route('/app/projects', () => {
    const rows = db.projects.map((p) => `<tr>
      <td><b>${esc(p.name)}</b></td><td>${esc(client(p.clientId).name)}</td><td>${esc(p.type)}</td><td>${fmtDate(p.deadline)}</td>
      <td><div class="row"><div class="bar" style="flex:1"><i style="width:${p.progress}%"></i></div><span class="muted" style="font-size:.78rem">${p.progress}%</span></div></td>
      <td><select data-proj-status="${p.id}" style="padding:6px 8px;font-size:.8rem;width:auto">
        ${['Planning', 'In Progress', 'Review', 'Complete'].map((s) => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td class="right"><button class="btn sm ghost" data-del-project="${p.id}">Delete</button></td></tr>`).join('');
    return shell('Projects', `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Projects</h1><p>Track delivery from start to finish.</p></div>
        <button class="btn" data-modal="project">＋ New project</button></div>
      <div class="table-card"><table><thead><tr><th>Project</th><th>Client</th><th>Service type</th><th>Deadline</th><th>Progress</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="empty">No projects yet.</td></tr>'}</tbody></table></div>`,
      `<button class="btn sm" data-modal="project">New project</button>`);
  });

  let invFilter = 'All';
  route('/app/invoices', () => {
    const list = db.invoices.filter((i) => invFilter === 'All' || i.status === invFilter);
    const rows = list.map((i) => `<tr>
      <td><b>${esc(i.number)}</b></td><td>${esc(client(i.clientId).name)}</td><td>${fmtDate(i.issueDate)}</td><td>${fmtDate(i.dueDate)}</td>
      <td>${money(invTotals(i).total)}</td><td><span class="pill ${i.status.toLowerCase()}">${i.status}</span></td>
      <td class="right"><button class="btn sm ghost" data-goto="#/app/invoices/${i.id}">Open</button>
      ${i.status === 'Draft' || i.status === 'Sent' || i.status === 'Overdue' ? `<button class="btn sm" data-mark-paid="${i.id}">Mark paid</button>` : ''}</td></tr>`).join('');
    return shell('Invoices', `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Invoices</h1><p>Create, send and track payments.</p></div>
        <button class="btn" data-goto="#/app/invoices/new">＋ Create invoice</button></div>
      <div class="tabs">${['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map((t) => `<button class="tab ${t === invFilter ? 'on' : ''}" data-inv-filter="${t}">${t}</button>`).join('')}</div>
      <div class="table-card"><table><thead><tr><th>Invoice</th><th>Client</th><th>Issue date</th><th>Due date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="empty">Nothing here.</td></tr>'}</tbody></table></div>`,
      `<button class="btn sm" data-goto="#/app/invoices/new">Create invoice</button>`);
  });

  /* ---- invoice builder ---- */
  let draft = null;
  function newDraft(clientId) {
    return { id: null, number: nextInvoiceNo(), clientId: clientId || (db.clients[0] && db.clients[0].id), issueDate: today(), dueDate: daysFromNow(14), terms: 14, items: [{ desc: '', qty: 1, rate: 0 }], status: 'Draft', notes: 'Thank you for your continued partnership.' };
  }
  route('/app/invoices/new', () => {
    const q = (location.hash.split('?')[1] || '').match(/client=([^&]+)/);
    if (!draft || draft.id) draft = newDraft(q && q[1]);
    const t = invTotals(draft);
    return shell('Create invoice', `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Create invoice</h1><p>Professional billing, made simple.</p></div>
        <button class="btn ghost" data-goto="#/app/invoices">Cancel</button></div>
      <div class="grid cards-2" style="grid-template-columns:1fr 1fr">
        <div class="card pad-lg"><h3>Client information</h3>
          <div class="field" style="margin-top:12px"><label>Client</label>
            <select id="dClient">${db.clients.map((c) => `<option value="${c.id}" ${c.id === draft.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Contact person</label><input value="${esc(client(draft.clientId).person)}" disabled /></div>
          <div class="field"><label>Email</label><input value="${esc(client(draft.clientId).email)}" disabled /></div>
        </div>
        <div class="card pad-lg"><h3>Invoice details</h3>
          <div class="field-row" style="margin-top:12px">
            <div class="field"><label>Invoice number</label><input id="dNumber" value="${esc(draft.number)}" /></div>
            <div class="field"><label>Issue date</label><input id="dIssue" type="date" value="${draft.issueDate}" /></div></div>
          <div class="field-row">
            <div class="field"><label>Due date</label><input id="dDue" type="date" value="${draft.dueDate}" /></div>
            <div class="field"><label>Payment terms</label><select id="dTerms">${[7, 14, 30].map((n) => `<option value="${n}" ${n === draft.terms ? 'selected' : ''}>${n} days</option>`).join('')}</select></div></div>
        </div>
      </div>
      <div class="card pad-lg" style="margin-top:20px"><h3>Line items</h3>
        <table style="margin-top:10px"><thead><tr><th>Description</th><th style="width:90px">Qty</th><th style="width:150px">Rate (ZAR)</th><th style="width:130px">Total</th><th></th></tr></thead>
        <tbody>${draft.items.map((it, n) => `<tr>
          <td><input data-item="desc" data-i="${n}" value="${esc(it.desc)}" placeholder="Service description" /></td>
          <td><input data-item="qty" data-i="${n}" type="number" min="0" step="1" value="${it.qty}" /></td>
          <td><input data-item="rate" data-i="${n}" type="number" min="0" step="0.01" value="${it.rate}" /></td>
          <td>${money(Number(it.qty) * Number(it.rate))}</td>
          <td class="right"><button class="btn sm ghost" data-rm-item="${n}">✕</button></td></tr>`).join('')}</tbody></table>
        <button class="btn ghost sm" style="margin-top:12px" data-add-item>＋ Add item</button>
        <div class="grid cards-2" style="margin-top:22px;align-items:start">
          <div class="field"><label>Notes</label><textarea id="dNotes" rows="4">${esc(draft.notes)}</textarea></div>
          <div class="totals">
            <div><span class="muted">Subtotal</span><span>${money(t.sub)}</span></div>
            <div><span class="muted">VAT (15%)</span><span>${money(t.vat)}</span></div>
            <div class="grand"><span>Total</span><span>${money(t.total)}</span></div>
          </div></div>
        <div class="row" style="justify-content:flex-end;margin-top:18px">
          <button class="btn ghost" data-save-invoice="Draft">Save draft</button>
          <button class="btn" data-save-invoice="Sent">Send to client →</button></div>
      </div>`);
  });

  route('/app/invoices/:id', (id) => {
    const i = db.invoices.find((x) => x.id === id);
    if (!i) return shell('Invoice', `<div class="card empty">Invoice not found. <a class="linkish" href="#/app/invoices">Back</a></div>`);
    const c = client(i.clientId); const t = invTotals(i); const s = db.settings;
    return shell(i.number, `
      <div class="page-head noprint"><a class="linkish" href="#/app/invoices">← Back to invoices</a>
        <div class="row"><button class="btn ghost" onclick="window.print()">Download PDF</button>
        ${i.status !== 'Paid' ? `<button class="btn ghost" data-send="${i.id}">${i.status === 'Draft' ? 'Send to client' : 'Resend'}</button><button class="btn" data-mark-paid="${i.id}">Mark as paid</button>` : '<span class="pill paid">Paid in full</span>'}
        <button class="btn ghost danger" data-del-invoice="${i.id}">Delete</button></div></div>
      <div class="doc">
        <div class="row between" style="align-items:flex-start">
          <div><h2>Invoice</h2><div class="muted" style="font-size:.85rem">${esc(i.number)}</div></div>
          <div class="right"><div class="brand">Shai Studios</div><div class="muted" style="font-size:.8rem">${esc(s.email)}<br/>${esc(s.phone)}<br/>${esc(s.address)}</div></div>
        </div>
        <div class="grid cards-2" style="margin-top:28px">
          <div><div class="eyebrow">Billed to</div><b>${esc(c.name)}</b><div class="muted" style="font-size:.86rem">${esc(c.person)}<br/>${esc(c.email)}<br/>${esc(c.phone || '')}</div></div>
          <div class="right"><div class="eyebrow">Details</div>
            <div style="font-size:.88rem">Issue date: ${fmtDate(i.issueDate)}<br/>Due date: ${fmtDate(i.dueDate)}<br/>Terms: Net ${i.terms} days<br/>Status: <span class="pill ${i.status.toLowerCase()}">${i.status}</span></div></div>
        </div>
        <table style="margin-top:26px"><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
        <tbody>${i.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="right">${x.qty}</td><td class="right">${money(x.rate)}</td><td class="right">${money(x.qty * x.rate)}</td></tr>`).join('')}</tbody></table>
        <div class="totals" style="margin-top:18px">
          <div><span class="muted">Subtotal</span><span>${money(t.sub)}</span></div>
          <div><span class="muted">VAT (15%)</span><span>${money(t.vat)}</span></div>
          <div class="grand"><span>Total due</span><span>${money(t.total)}</span></div></div>
        <p style="margin-top:26px;font-size:.85rem">${esc(i.notes)}</p>
      </div>`);
  });

  route('/app/settings', () => {
    const s = db.settings;
    return shell('Settings', `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Settings</h1><p>Agency details used across invoices and the portal.</p></div></div>
      <div class="card pad-lg" style="max-width:640px">
        <div class="field-row"><div class="field"><label>Agency name</label><input id="sAgency" value="${esc(s.agency)}" /></div>
        <div class="field"><label>Owner</label><input id="sOwner" value="${esc(s.owner)}" /></div></div>
        <div class="field-row"><div class="field"><label>Email</label><input id="sEmail" value="${esc(s.email)}" /></div>
        <div class="field"><label>Phone</label><input id="sPhone" value="${esc(s.phone)}" /></div></div>
        <div class="field"><label>Address</label><input id="sAddress" value="${esc(s.address)}" /></div>
        <button class="btn" data-save-settings>Save changes</button>
      </div>
      <div class="card pad-lg" style="max-width:640px;margin-top:20px"><h3>Demo data</h3>
        <p style="font-size:.9rem">Reset the workspace back to its seeded demo state.</p>
        <button class="btn ghost danger" data-reset>Reset demo data</button></div>`);
  });

  /* ---------------- client portal ---------------- */
  route('/portal', () => {
    const s = db.session;
    const c = db.clients.find((x) => x.id === s.clientId) || db.clients[0];
    const invs = db.invoices.filter((i) => i.clientId === c.id);
    const projs = db.projects.filter((p) => p.clientId === c.id);
    const open = invs.find((i) => i.status !== 'Paid');
    return `<div style="max-width:560px;margin:0 auto;padding:24px;min-height:100vh;background:var(--paper)">
      <div class="row between"><a href="#/" class="brand">Shai Studios<small>Client Portal</small></a>
        <div class="row"><div class="avatar">${initials(c.name)}</div><a class="linkish" href="#/login" data-signout>Sign out</a></div></div>
      <h1 style="font-size:2rem;margin:26px 0 4px">Welcome, ${esc(c.person.split(' ')[0])}.</h1>
      <p>Here's the latest on your projects with ${esc(db.settings.agency)}.</p>
      ${open ? `<div class="card pad-lg" style="margin-top:20px">
        <div class="row between"><div class="muted" style="font-size:.8rem">Invoice ${esc(open.number)}</div><span class="pill ${open.status.toLowerCase()}">${open.status}</span></div>
        <div class="price" style="font-size:2.2rem">${money(invTotals(open).total)}</div>
        <div class="muted" style="font-size:.85rem">Due ${fmtDate(open.dueDate)}</div>
        <ul class="activity" style="margin-top:12px">${open.items.map((x) => `<li><span>${esc(x.desc)}</span><span class="when">${money(x.qty * x.rate)}</span></li>`).join('')}</ul>
        <button class="btn block" style="margin-top:14px" data-pay="${open.id}">Pay invoice</button>
        <button class="btn ghost block" style="margin-top:8px" data-goto="#/app/invoices/${open.id}">Download PDF</button>
      </div>` : '<div class="card" style="margin-top:20px"><h3>All settled 🎉</h3><p>No outstanding invoices.</p></div>'}
      <div class="card" style="margin-top:20px"><h3>Your projects</h3>
        <ul class="activity">${projs.map((p) => `<li><div><div>${esc(p.name)}</div><div class="muted" style="font-size:.78rem">Due ${fmtDate(p.deadline)}</div></div>
          <span class="when"><span class="pill">${esc(p.status)}</span> ${p.progress}%</span></li>`).join('') || '<li class="muted">No active projects.</li>'}</ul></div>
      <div class="card" style="margin-top:20px"><h3>Invoice history</h3>
        <ul class="activity">${invs.map((i) => `<li><span>${esc(i.number)} · ${fmtDate(i.issueDate)}</span><span class="when">${money(invTotals(i).total)} <span class="pill ${i.status.toLowerCase()}">${i.status}</span></span></li>`).join('')}</ul></div>
      <p class="muted center" style="font-size:.78rem;margin:28px 0">Strategy creates opportunity.</p>
    </div>`;
  });

  /* ---------------- modals ---------------- */
  function closeModal() { const m = $('.modal-bg'); if (m) m.remove(); }
  function openModal(kind, preClient) {
    const body = kind === 'client'
      ? `<h3>Add client</h3><p style="font-size:.88rem">Create a new client profile.</p>
         <div class="field-row" style="margin-top:14px"><div class="field"><label>Business name</label><input id="mName" required /></div>
         <div class="field"><label>Contact person</label><input id="mPerson" /></div></div>
         <div class="field-row"><div class="field"><label>Email</label><input id="mEmail" type="email" /></div>
         <div class="field"><label>Phone</label><input id="mPhone" /></div></div>
         <div class="field-row"><div class="field"><label>Service</label><select id="mService">${SERVICES.map((s) => `<option>${s.name}</option>`).join('')}<option>Social Media Management</option></select></div>
         <div class="field"><label>Status</label><select id="mStatus"><option>Active</option><option>On Hold</option></select></div></div>`
      : `<h3>New project</h3><p style="font-size:.88rem">Set up a new project.</p>
         <div class="field" style="margin-top:14px"><label>Project name</label><input id="mPName" required /></div>
         <div class="field-row"><div class="field"><label>Client</label><select id="mPClient">${db.clients.map((c) => `<option value="${c.id}" ${c.id === preClient ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
         <div class="field"><label>Service type</label><select id="mPType">${['Content', 'Strategy', 'Web Design', 'Digital', 'SEO'].map((t) => `<option>${t}</option>`).join('')}</select></div></div>
         <div class="field-row"><div class="field"><label>Deadline</label><input id="mPDate" type="date" value="${daysFromNow(30)}" /></div>
         <div class="field"><label>Status</label><select id="mPStatus">${['Planning', 'In Progress', 'Review'].map((t) => `<option>${t}</option>`).join('')}</select></div></div>`;
    document.body.insertAdjacentHTML('beforeend',
      `<div class="modal-bg"><form class="modal" id="modalForm" data-kind="${kind}">${body}
        <div class="row" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">Save</button></div>
      </form></div>`);
    const first = $('.modal input'); if (first) first.focus();
  }

  /* ---------------- events ---------------- */
  function bind() {
    // public work filter
    const tabs = el('workTabs');
    if (tabs) tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]'); if (!b) return;
      [...tabs.children].forEach((x) => x.classList.toggle('on', x === b));
      const f = b.dataset.filter;
      el('workGrid').innerHTML = WORK.filter((w) => f === 'All' || w.tag === f).map(workCard).join('');
    });

    const enq = el('enqForm');
    if (enq) enq.addEventListener('submit', (e) => {
      e.preventDefault();
      const rec = { id: uid('e'), name: el('eName').value.trim(), email: el('eEmail').value.trim(), type: el('eType').value, budget: el('eBudget').value, message: el('eMsg').value.trim(), at: Date.now() };
      db.enquiries.unshift(rec); log('New client enquiry from ' + rec.name); save();
      enq.reset(); toast('Thanks ' + rec.name.split(' ')[0] + " — we'll be in touch within 1–2 business days.");
    });

    const lf = el('loginForm');
    if (lf) lf.addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = el('lPass').value;
      if (pass.length < 6) { el('loginErr').textContent = 'Password must be at least 6 characters.'; return; }
      db.session = { name: db.settings.owner, role: 'Agency Owner', email: el('lEmail').value, type: 'agency' }; save();
      go('#/app');
    });

    const dc = el('dClient');
    if (dc) dc.addEventListener('change', () => { syncDraft(); draft.clientId = dc.value; render(); });
    ['dNumber', 'dIssue', 'dDue', 'dTerms', 'dNotes'].forEach((idd) => {
      const n = el(idd); if (n) n.addEventListener('change', syncDraft);
    });
    document.querySelectorAll('[data-item]').forEach((inp) => {
      inp.addEventListener('change', () => { syncDraft(); render(); });
    });

    const notes = el('clientNotes');
    if (notes) notes.addEventListener('input', () => {});
  }

  function syncDraft() {
    if (!draft) return;
    const v = (i) => (el(i) ? el(i).value : undefined);
    if (el('dNumber')) draft.number = v('dNumber');
    if (el('dIssue')) draft.issueDate = v('dIssue');
    if (el('dDue')) draft.dueDate = v('dDue');
    if (el('dTerms')) draft.terms = Number(v('dTerms'));
    if (el('dNotes')) draft.notes = v('dNotes');
    if (el('dClient')) draft.clientId = v('dClient');
    document.querySelectorAll('[data-item]').forEach((inp) => {
      const n = Number(inp.dataset.i), f = inp.dataset.item;
      if (!draft.items[n]) return;
      draft.items[n][f] = f === 'desc' ? inp.value : Number(inp.value || 0);
    });
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const hit = (attr) => { const n = t.closest('[' + attr + ']'); return n && n.getAttribute(attr); };

    const toggle = hit('data-toggle');
    if (toggle) { const n = el(toggle); n.classList.toggle(toggle === 'appnav' ? 'open' : 'open'); return; }

    const demo = hit('data-demo');
    if (demo) {
      // for the client demo, pick a client that actually has an open invoice
      const dc = db.clients.find((c) => db.invoices.some((i) => i.clientId === c.id && i.status !== 'Paid')) || db.clients[0];
      db.session = demo === 'agency'
        ? { name: db.settings.owner, role: 'Agency Owner', email: 'tayla@shaistudios.co.za', type: 'agency' }
        : { name: dc.person, role: 'Client', email: dc.email, type: 'client', clientId: dc.id };
      save(); go(demo === 'agency' ? '#/app' : '#/portal'); return;
    }
    if (t.closest('[data-signout]')) { db.session = null; save(); toast('Signed out.'); return; }

    const goto = hit('data-goto');
    if (goto) { go(goto); return; }

    const modal = t.closest('[data-modal]');
    if (modal) { openModal(modal.getAttribute('data-modal'), modal.getAttribute('data-client')); return; }
    if (t.closest('[data-close]') || t.classList.contains('modal-bg')) { closeModal(); return; }

    const f = hit('data-inv-filter');
    if (f) { invFilter = f; render(); return; }

    if (t.closest('[data-add-item]')) { syncDraft(); draft.items.push({ desc: '', qty: 1, rate: 0 }); render(); return; }
    const rm = hit('data-rm-item');
    if (rm !== null && rm !== false && rm !== undefined) {
      syncDraft(); draft.items.splice(Number(rm), 1);
      if (!draft.items.length) draft.items.push({ desc: '', qty: 1, rate: 0 });
      render(); return;
    }

    const saveInv = hit('data-save-invoice');
    if (saveInv) {
      syncDraft();
      if (!draft.items.some((i) => i.desc.trim())) { toast('Add at least one line item first.'); return; }
      const rec = Object.assign({}, draft, { id: uid('i'), status: saveInv, createdAt: Date.now() });
      db.invoices.unshift(rec);
      log('Invoice ' + rec.number + (saveInv === 'Sent' ? ' sent to ' : ' drafted for ') + client(rec.clientId).name);
      draft = null; save();
      toast(saveInv === 'Sent' ? 'Invoice sent to ' + client(rec.clientId).name : 'Draft saved.');
      go('#/app/invoices/' + rec.id); return;
    }

    const paid = hit('data-mark-paid');
    if (paid) {
      const i = db.invoices.find((x) => x.id === paid);
      i.status = 'Paid'; log('Payment received from ' + client(i.clientId).name); save(); toast('Marked as paid.'); render(); return;
    }
    const send = hit('data-send');
    if (send) {
      const i = db.invoices.find((x) => x.id === send);
      i.status = 'Sent'; log('Invoice ' + i.number + ' sent to ' + client(i.clientId).name); save(); toast('Invoice sent.'); render(); return;
    }
    const pay = hit('data-pay');
    if (pay) {
      const i = db.invoices.find((x) => x.id === pay);
      i.status = 'Paid'; log('Payment received from ' + client(i.clientId).name); save(); toast('Payment successful. Thank you!'); render(); return;
    }
    const delInv = hit('data-del-invoice');
    if (delInv) {
      if (!confirm('Delete this invoice? This cannot be undone.')) return;
      db.invoices = db.invoices.filter((x) => x.id !== delInv); save(); toast('Invoice deleted.'); go('#/app/invoices'); return;
    }
    const delC = hit('data-del-client');
    if (delC) {
      const c = client(delC);
      if (!confirm('Delete ' + c.name + ' and all linked projects and invoices?')) return;
      db.clients = db.clients.filter((x) => x.id !== delC);
      db.projects = db.projects.filter((x) => x.clientId !== delC);
      db.invoices = db.invoices.filter((x) => x.clientId !== delC);
      log('Client ' + c.name + ' removed'); save(); render(); return;
    }
    const delP = hit('data-del-project');
    if (delP) { db.projects = db.projects.filter((x) => x.id !== delP); save(); toast('Project deleted.'); render(); return; }

    const notes = hit('data-save-notes');
    if (notes) { const c = db.clients.find((x) => x.id === notes); c.notes = el('clientNotes').value; save(); toast('Notes saved.'); return; }

    if (t.closest('[data-save-settings]')) {
      const s = db.settings;
      s.agency = el('sAgency').value; s.owner = el('sOwner').value; s.email = el('sEmail').value;
      s.phone = el('sPhone').value; s.address = el('sAddress').value;
      if (db.session) db.session.name = s.owner;
      save(); toast('Settings saved.'); render(); return;
    }
    if (t.closest('[data-reset]')) {
      if (!confirm('Reset all demo data?')) return;
      const sess = db.session; db = seed(); db.session = sess; save(); toast('Demo data reset.'); go('#/app'); render(); return;
    }
    if (t.closest('[data-clear-enq]')) { db.enquiries = []; save(); render(); return; }

    const conv = hit('data-convert');
    if (conv) {
      const q = db.enquiries.find((x) => x.id === conv);
      const c = { id: uid('c'), name: q.name, person: q.name, email: q.email, phone: '', service: q.type, status: 'Active', notes: q.message };
      db.clients.unshift(c); db.enquiries = db.enquiries.filter((x) => x.id !== conv);
      log('Enquiry from ' + q.name + ' converted to client'); save(); toast('Client added.'); go('#/app/clients/' + c.id); return;
    }
  });

  document.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-proj-status]');
    if (sel) {
      const p = db.projects.find((x) => x.id === sel.getAttribute('data-proj-status'));
      p.status = sel.value;
      p.progress = { Planning: 10, 'In Progress': 55, Review: 85, Complete: 100 }[p.value] || p.progress;
      if (sel.value === 'Complete') p.progress = 100;
      log('Project ' + p.name + ' moved to ' + p.status); save(); render();
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('#modalForm');
    if (!form) return;
    e.preventDefault();
    if (form.dataset.kind === 'client') {
      const name = el('mName').value.trim();
      if (!name) return;
      const c = { id: uid('c'), name, person: el('mPerson').value.trim(), email: el('mEmail').value.trim(), phone: el('mPhone').value.trim(), service: el('mService').value, status: el('mStatus').value, notes: '' };
      db.clients.unshift(c); log('New client added: ' + name);
    } else {
      const name = el('mPName').value.trim();
      if (!name) return;
      db.projects.unshift({ id: uid('p'), name, clientId: el('mPClient').value, type: el('mPType').value, deadline: el('mPDate').value, progress: 10, status: el('mPStatus').value });
      log('New project created: ' + name);
    }
    save(); closeModal(); toast('Saved.'); render();
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  render();
})();
