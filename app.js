/* Shai Studios MVP — public site + role-based admin workspace + client portal.
   Zero dependencies. Every record is CRUD-able, every screen is breadcrumbed,
   every action is permission-checked and written to an audit trail.
   State persists in localStorage. */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const el = document.getElementById.bind(document);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'R ' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtStamp = (ts) => new Date(ts).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
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

  // Unsplash stock photography (all verified 200). Swap any URL from Admin → Site content.
  const IMG = (id, w) => 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=' + (w || 1000) + '&q=70';
  const PHOTOS = {
    hero: IMG('1552664730-d307ca884978', 1200),
    about: IMG('1522199755839-a2bacb67c546', 1000),
    cta: IMG('1497215728101-856f4ea42174', 1200),
    brand: IMG('1600880292203-757bb62b4baf'),
    content: IMG('1606857521015-7f9fcf423740') ,
    growth: IMG('1460925895917-afdab827c52f'),
    digital: IMG('1467232004584-a241de8bcf5d'),
    w1: IMG('1499951360447-b19be8fe80f5'),
    w2: IMG('1556740749-887f6717d7e4'),
    w3: IMG('1524758631624-e2822e304c36'),
    w4: IMG('1556228720-195a672e8a03'),
    w5: IMG('1506905925346-21bda4d32df4'),
    w6: IMG('1531403009284-440f080d1e12'),
    team1: IMG('1573496359142-b8d87734a5a2', 500),
    team2: IMG('1507003211169-0a1dd7228f2d', 500),
    team3: IMG('1519085360753-af0119f7cbe7', 500),
    team4: IMG('1517048676732-d65bc937f952', 500)
  };

  /* ---------------- roles & permissions ---------------- */
  const ROLES = {
    superadmin: { label: 'Super Admin', rank: 4 },
    admin: { label: 'Admin', rank: 3 },
    manager: { label: 'Manager', rank: 2 },
    staff: { label: 'Staff', rank: 1 },
    client: { label: 'Client', rank: 0 }
  };
  // resource -> role -> allowed actions ('*' = view/create/edit/delete)
  const PERMS = {
    dashboard: { superadmin: '*', admin: '*', manager: '*', staff: 'view' },
    clients: { superadmin: '*', admin: '*', manager: '*', staff: 'view,create,edit' },
    projects: { superadmin: '*', admin: '*', manager: '*', staff: 'view,create,edit' },
    invoices: { superadmin: '*', admin: '*', manager: 'view,create,edit', staff: 'view' },
    enquiries: { superadmin: '*', admin: '*', manager: '*', staff: 'view' },
    content: { superadmin: '*', admin: '*', manager: 'view,edit', staff: 'view' },
    users: { superadmin: '*', admin: 'view,create,edit' },
    settings: { superadmin: '*', admin: 'view,edit' },
    audit: { superadmin: '*', admin: 'view' },
    orders: { superadmin: '*', admin: '*', manager: 'view,edit', staff: 'view' },
    portal: { client: 'view', superadmin: 'view', admin: 'view' }
  };
  const role = () => (db.session && db.session.role) || 'client';
  function can(resource, action) {
    const rule = (PERMS[resource] || {})[role()];
    if (!rule) return false;
    return rule === '*' || rule.split(',').indexOf(action) > -1;
  }
  // a user may only act on another user of strictly lower rank (and never on themselves destructively)
  const outranks = (targetRole) => ROLES[role()].rank > ROLES[targetRole].rank;

  /* ---------------- data ---------------- */
  const KEY = 'shai-studios-mvp-v2';
  const VAT = 0.15;

  function seed() {
    const c = (name, person, email, phone, service, status) => ({ id: uid('c'), name, person, email, phone, service, status, notes: '', createdAt: Date.now() });
    const clients = [
      c('LUMI Collective', 'Sarah Ndlovu', 'sarah@lumi.co.za', '+27 82 123 4567', 'Content', 'Active'),
      c('Nomu Skincare', 'Thabo Mokoena', 'thabo@nomu.co.za', '+27 83 221 9087', 'Brand', 'Active'),
      c('The Wellness Edit', 'Jessica Lane', 'jessica@wellnessedit.co.za', '+27 81 442 1190', 'Content', 'Active'),
      c('Moyo Interiors', 'Daniel Kgatle', 'daniel@moyo.co.za', '+27 71 556 3321', 'Digital', 'Active'),
      c('Rooted Foods', 'Ayesha Patel', 'ayesha@rootedfoods.co.za', '+27 84 330 7712', 'Growth', 'On Hold'),
      c('The Kind Club', 'Zoe Martin', 'zoe@thekindclub.co.za', '+27 79 908 4412', 'Growth', 'Active')
    ];
    const byName = (n) => clients.find((x) => x.name === n).id;
    const p = (name, cl, type, deadline, progress, status, owner) => ({ id: uid('p'), name, clientId: byName(cl), type, deadline, progress, status, owner, createdAt: Date.now() });
    const projects = [
      p('Social Media Management', 'LUMI Collective', 'Content', daysFromNow(14), 75, 'In Progress', 'Naledi Khumalo'),
      p('Brand Strategy', 'Nomu Skincare', 'Strategy', daysFromNow(29), 40, 'In Progress', 'Tayla Smith'),
      p('Website Redesign', 'Moyo Interiors', 'Web Design', daysFromNow(42), 20, 'Planning', 'Sipho Dlamini'),
      p('Digital Campaign', 'Rooted Foods', 'Digital', daysFromNow(9), 90, 'Review', 'Naledi Khumalo'),
      p('SEO Optimisation', 'The Kind Club', 'SEO', daysFromNow(60), 10, 'Planning', 'Sipho Dlamini'),
      p('Content Creation', 'The Wellness Edit', 'Content', daysFromNow(24), 60, 'In Progress', 'Naledi Khumalo')
    ];
    const li = (d, q, r) => ({ desc: d, qty: q, rate: r });
    const inv = (no, cl, issue, due, items, status) => ({ id: uid('i'), number: no, clientId: byName(cl), issueDate: issue, dueDate: due, terms: 14, items, status, notes: 'Thank you for your continued partnership.', createdAt: Date.now() });
    const invoices = [
      inv('INV-013', 'Moyo Interiors', daysFromNow(-2), daysFromNow(12), [li('Website Design (Phase 1)', 1, 8500)], 'Draft'),
      inv('INV-012', 'LUMI Collective', daysFromNow(-8), daysFromNow(6), [li('Social Media Strategy', 1, 4500), li('Content Creation (Monthly)', 1, 6000), li('Community Management', 1, 2500)], 'Sent'),
      inv('INV-011', 'Nomu Skincare', daysFromNow(-44), daysFromNow(-30), [li('Brand Strategy Retainer', 2, 6000)], 'Overdue'),
      inv('INV-010', 'The Kind Club', daysFromNow(-60), daysFromNow(-46), [li('SEO Optimisation', 1, 4500)], 'Paid'),
      inv('INV-009', 'Rooted Foods', daysFromNow(-90), daysFromNow(-76), [li('Digital Campaign Management', 1, 9200)], 'Paid'),
      inv('INV-008', 'The Wellness Edit', daysFromNow(-120), daysFromNow(-106), [li('Content Retainer', 1, 5600)], 'Sent')
    ];
    const u = (name, email, r, extra) => Object.assign({ id: uid('u'), name, email, role: r, status: 'Active', password: 'demo1234', createdAt: Date.now() }, extra || {});
    const users = [
      u('Karabo N', 'admin@shaistudios.co.za', 'superadmin'),
      u('Tayla Smith', 'tayla@shaistudios.co.za', 'admin'),
      u('Naledi Khumalo', 'naledi@shaistudios.co.za', 'manager'),
      u('Sipho Dlamini', 'sipho@shaistudios.co.za', 'staff'),
      u('Sarah Ndlovu', 'sarah@lumi.co.za', 'client', { clientId: byName('LUMI Collective') })
    ];
    return {
      clients, projects, invoices, users, enquiries: [], audit: [], onboardings: [], orders: [],
      content: {
        services: [
          { id: uid('s'), icon: '◍', name: 'Brand', blurb: 'Positioning, visual identity and brand strategy.', items: ['Brand strategy', 'Visual identity', 'Brand messaging'], from: 8500, order: 1, image: PHOTOS.brand },
          { id: uid('s'), icon: '✎', name: 'Content', blurb: 'High-performing content for every platform.', items: ['Content strategy', 'Photo & video', 'Social media management'], from: 6500, order: 2, image: PHOTOS.content },
          { id: uid('s'), icon: '◪', name: 'Growth', blurb: 'Data-driven marketing to scale your business.', items: ['Paid ads management', 'SEO optimisation', 'Performance reporting'], from: 7500, order: 3, image: PHOTOS.growth },
          { id: uid('s'), icon: '▣', name: 'Digital', blurb: 'Websites and digital experiences that convert.', items: ['Website design', 'Web development', 'Conversion optimisation'], from: 12000, order: 4, image: PHOTOS.digital }
        ],
        work: [
          { id: uid('w'), client: 'Lumi Collective', service: 'Social Media Management', result: '+320% engagement', tag: 'Content', published: true, image: PHOTOS.w1 },
          { id: uid('w'), client: 'The Wellness Edit', service: 'Brand Strategy', result: '+180% revenue', tag: 'Brand', published: true, image: PHOTOS.w2 },
          { id: uid('w'), client: 'Moyo Interiors', service: 'Website & SEO', result: '+240% organic traffic', tag: 'Digital', published: true, image: PHOTOS.w3 },
          { id: uid('w'), client: 'Nomu Skincare', service: 'Content Creation', result: '+150% online sales', tag: 'Content', published: true, image: PHOTOS.w4 },
          { id: uid('w'), client: 'Rooted Foods', service: 'Digital Campaign', result: '+290% audience growth', tag: 'Growth', published: true, image: PHOTOS.w5 },
          { id: uid('w'), client: 'The Kind Club', service: 'Brand & Content', result: '+310% community growth', tag: 'Brand', published: true, image: PHOTOS.w6 }
        ],
        plans: [
          { id: uid('pl'), name: 'Launch', price: 6500, blurb: 'Get started with the essentials.', items: ['Social media management', '10 posts per month', 'Basic reporting', 'Email support'], featured: false, order: 1 },
          { id: uid('pl'), name: 'Grow', price: 12000, blurb: 'Accelerate your momentum.', items: ['Everything in Launch', 'Content creation (photo & video)', 'Paid ads management', 'Monthly strategy call', 'Priority support'], featured: true, order: 2 },
          { id: uid('pl'), name: 'Partner', price: 20000, blurb: 'A tailored solution for scale.', items: ['Custom strategy & roadmap', 'Full-service support', 'Dedicated account manager', 'Advanced reporting', 'Website & digital projects'], featured: false, order: 3 }
        ],
        products: [
          { id: uid('sp'), name: 'Brand Strategy Template', category: 'Templates', price: 450, blurb: 'The 12-page workbook we use in every brand kickoff.', image: PHOTOS.brand, badge: 'Bestseller', published: true, order: 1 },
          { id: uid('sp'), name: 'Social Media Kit', category: 'Social Media', price: 350, blurb: '60 editable post and story layouts for Canva.', image: PHOTOS.w2, badge: '', published: true, order: 2 },
          { id: uid('sp'), name: 'Marketing Planner', category: 'Planning', price: 299, blurb: 'A 90-day plan with budget, channel and KPI trackers.', image: PHOTOS.w5, badge: '', published: true, order: 3 },
          { id: uid('sp'), name: 'Canva Template Pack', category: 'Design', price: 199, blurb: 'Presentations, one-pagers and proposals in one pack.', image: PHOTOS.w1, badge: 'New', published: true, order: 4 },
          { id: uid('sp'), name: 'Content Calendar', category: 'Planning', price: 120, blurb: 'A 12-month calendar pre-filled with SA retail moments.', image: PHOTOS.content, badge: '', published: true, order: 5 },
          { id: uid('sp'), name: 'Brand Guidelines Kit', category: 'Business', price: 249, blurb: 'Document your logo, colour and voice rules properly.', image: PHOTOS.w3, badge: '', published: true, order: 6 }
        ],
        posts: [
          { id: uid('b'), title: 'Five signs your brand has outgrown its logo', slug: 'outgrown-your-logo', category: 'Brand',
            excerpt: 'A logo is not a brand. Here is how to tell when the identity you started with is quietly costing you customers.',
            body: 'Most founders design a logo in week one and never revisit it. That is fine until the business changes shape around it.\n\nThe first sign is inconsistency: every team member has a different file, and none of them match. The second is the apology — you find yourself explaining the logo before explaining the work.\n\nA rebrand does not have to mean starting over. In most cases we keep the equity you have built and rebuild the system around it: type, colour, layout and tone. The logo is the smallest part of that system.',
            author: 'Tayla Smith', date: daysFromNow(-6), image: PHOTOS.brand, published: true },
          { id: uid('b'), title: 'What we actually measure in a social media report', slug: 'what-we-measure', category: 'Growth',
            excerpt: 'Reach is the easiest number to grow and the least useful. These are the four metrics we put in front of clients instead.',
            body: 'Every agency sends a monthly report. Very few of them answer the only question that matters: did this make money?\n\nWe track four things. Qualified reach — people who look like your buyer. Saves and shares, because they predict intent far better than likes. Click-through to a page that can convert. And cost per qualified lead, tracked all the way to the invoice.\n\nEverything else is context, not a result.',
            author: 'Naledi Khumalo', date: daysFromNow(-19), image: PHOTOS.growth, published: true },
          { id: uid('b'), title: 'A website is a salesperson, not a brochure', slug: 'website-is-a-salesperson', category: 'Digital',
            excerpt: 'Most small business sites describe the company. The ones that work answer the visitor question by question.',
            body: 'Open your homepage and read the first screen as a stranger. Does it say what you do, who it is for, and what to do next?\n\nWe build pages in the order a buyer thinks: the promise, the proof, the offer, the objection, the ask. Design serves that order rather than decorating around it.\n\nThe result is usually a shorter site that converts considerably better.',
            author: 'Sipho Dlamini', date: daysFromNow(-33), image: PHOTOS.digital, published: true },
          { id: uid('b'), title: 'How to brief a content shoot in one page', slug: 'brief-a-content-shoot', category: 'Content',
            excerpt: 'Good content starts before the camera. Our one-page brief template, and the three questions it forces you to answer.',
            body: 'A shoot without a brief produces beautiful images nobody can use. The brief is where the strategy becomes a shot list.\n\nAnswer three questions. Where will each asset be published, and in what aspect ratio? What must the viewer believe after seeing it? What do we already have that we should not reshoot?\n\nEverything else — location, styling, talent — follows from those answers.',
            author: 'Naledi Khumalo', date: daysFromNow(-48), image: PHOTOS.content, published: true }
        ],
        site: {
          heroEyebrow: 'Strategy meets creativity',
          heroTitle: 'Your brand, built forward.',
          heroBody: 'Professional digital marketing made accessible. We help purpose-driven businesses grow through strategy, content and digital marketing that delivers real results — without the agency jargon.',
          aboutTitle: 'Small studio. Serious growth.',
          aboutBody: 'Shai Studios is an independent digital marketing agency helping purpose-driven brands grow through strategy, content and digital. We believe great marketing should be accessible, human and results-driven.',
          tagline: 'Strategy creates opportunity.',
          heroImage: PHOTOS.hero,
          aboutImage: PHOTOS.about,
          ctaImage: PHOTOS.cta
        }
      },
      activity: [
        { text: 'Invoice INV-012 sent to LUMI Collective', at: Date.now() - 2 * 3600e3 },
        { text: 'Project Website Redesign moved to In Progress', at: Date.now() - 4 * 3600e3 },
        { text: 'New client enquiry from The Kind Club', at: Date.now() - 26 * 3600e3 },
        { text: 'Payment received from Nomu Skincare', at: Date.now() - 30 * 3600e3 }
      ],
      settings: { agency: 'Shai Studios', owner: 'Tayla Smith', email: 'hello@shaistudios.co.za', phone: '+27 71 123 4567', address: '123 Loop Street, Cape Town, 8001', vat: 15 },
      session: null
    };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { db = seed(); }
  if (!db || !db.clients || !db.users || !db.content) db = seed();
  if (!db.content.posts) db.content.posts = seed().content.posts;   // v3: blog
  if (!db.onboardings) db.onboardings = [];
  if (!db.content.products) db.content.products = seed().content.products; // v4: store
  if (!db.orders) db.orders = [];                          // v3: onboarding wizard
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const log = (text) => { db.activity.unshift({ text, at: Date.now() }); db.activity = db.activity.slice(0, 60); };
  function audit(action, entity, label, detail) {
    db.audit.unshift({ id: uid('a'), at: Date.now(), who: (db.session && db.session.name) || 'System', role: role(), action, entity, label, detail: detail || '' });
    db.audit = db.audit.slice(0, 300);
  }
  function deny() { toast('Your role does not allow that action.'); }

  const client = (id) => db.clients.find((c) => c.id === id) || { name: 'Unknown', person: '', email: '', phone: '' };
  const invTotals = (i) => {
    const sub = i.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
    const vat = sub * VAT; return { sub, vat, total: sub + vat };
  };
  const balanceOf = (cid) => db.invoices.filter((i) => i.clientId === cid && i.status !== 'Paid').reduce((s, i) => s + invTotals(i).total, 0);
  const nextInvoiceNo = () => 'INV-' + String(db.invoices.reduce((m, i) => Math.max(m, parseInt(String(i.number).replace(/\D/g, ''), 10) || 0), 0) + 1).padStart(3, '0');

  /* ---------------- entity schemas (drive generic create/edit forms) ---------------- */
  const SCHEMAS = {
    client: {
      title: 'Client', resource: 'clients', list: () => db.clients, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Business name', req: true },
        { k: 'person', l: 'Contact person' },
        { k: 'email', l: 'Email address', t: 'email' },
        { k: 'phone', l: 'Phone' },
        { k: 'service', l: 'Primary service', t: 'select', opts: () => db.content.services.map((s) => s.name) },
        { k: 'status', l: 'Status', t: 'select', opts: ['Active', 'Onboarding', 'On Hold', 'Archived'] },
        { k: 'notes', l: 'Internal notes', t: 'textarea', full: true }
      ]
    },
    project: {
      title: 'Project', resource: 'projects', list: () => db.projects, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Project name', req: true },
        { k: 'clientId', l: 'Client', t: 'select', opts: () => db.clients.map((c) => ({ v: c.id, l: c.name })) },
        { k: 'type', l: 'Service type', t: 'select', opts: ['Content', 'Strategy', 'Web Design', 'Digital', 'SEO'] },
        { k: 'owner', l: 'Project owner', t: 'select', opts: () => db.users.filter((u) => u.role !== 'client').map((u) => u.name) },
        { k: 'deadline', l: 'Deadline', t: 'date', def: () => daysFromNow(30) },
        { k: 'status', l: 'Status', t: 'select', opts: ['Planning', 'In Progress', 'Review', 'Complete'] },
        { k: 'progress', l: 'Progress (%)', t: 'number', def: () => 10 }
      ]
    },
    user: {
      title: 'User', resource: 'users', list: () => db.users, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Full name', req: true },
        { k: 'email', l: 'Email address', t: 'email', req: true },
        { k: 'role', l: 'Role', t: 'select', opts: () => Object.keys(ROLES).filter((r) => ROLES[r].rank < ROLES[role()].rank || r === 'client').map((r) => ({ v: r, l: ROLES[r].label })) },
        { k: 'status', l: 'Status', t: 'select', opts: ['Active', 'Suspended'] },
        { k: 'clientId', l: 'Linked client (client role only)', t: 'select', opts: () => [{ v: '', l: '— none —' }].concat(db.clients.map((c) => ({ v: c.id, l: c.name }))) },
        { k: 'password', l: 'Temporary password', def: () => 'demo1234' }
      ]
    },
    service: {
      title: 'Service', resource: 'content', list: () => db.content.services, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Service name', req: true },
        { k: 'icon', l: 'Icon glyph', def: () => '◍' },
        { k: 'blurb', l: 'Short description', full: true },
        { k: 'items', l: 'Included items (one per line)', t: 'lines', full: true },
        { k: 'image', l: 'Photo URL', full: true, def: () => PHOTOS.brand },
        { k: 'from', l: 'Starting price (ZAR)', t: 'number', def: () => 5000 },
        { k: 'order', l: 'Display order', t: 'number', def: () => 9 }
      ]
    },
    work: {
      title: 'Case study', resource: 'content', list: () => db.content.work, labelOf: (r) => r.client,
      fields: [
        { k: 'client', l: 'Client name', req: true },
        { k: 'service', l: 'Service delivered' },
        { k: 'result', l: 'Headline result' },
        { k: 'tag', l: 'Category', t: 'select', opts: ['Brand', 'Content', 'Growth', 'Digital'] },
        { k: 'image', l: 'Photo URL', full: true, def: () => PHOTOS.w1 },
        { k: 'published', l: 'Published on site', t: 'checkbox' }
      ]
    },
    plan: {
      title: 'Pricing plan', resource: 'content', list: () => db.content.plans, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Plan name', req: true },
        { k: 'price', l: 'Monthly price (ZAR)', t: 'number', def: () => 5000 },
        { k: 'blurb', l: 'Short description', full: true },
        { k: 'items', l: 'Features (one per line)', t: 'lines', full: true },
        { k: 'featured', l: 'Highlight as most popular', t: 'checkbox' },
        { k: 'order', l: 'Display order', t: 'number', def: () => 9 }
      ]
    },
    post: {
      title: 'Blog post', resource: 'content', list: () => db.content.posts, labelOf: (r) => r.title,
      fields: [
        { k: 'title', l: 'Title', req: true, full: true },
        { k: 'slug', l: 'URL slug', def: () => '' },
        { k: 'category', l: 'Category', t: 'select', opts: ['Brand', 'Content', 'Growth', 'Digital'] },
        { k: 'author', l: 'Author', t: 'select', opts: () => db.users.filter((u) => u.role !== 'client').map((u) => u.name) },
        { k: 'date', l: 'Publish date', t: 'date', def: () => today() },
        { k: 'image', l: 'Cover photo URL', full: true, def: () => PHOTOS.content },
        { k: 'excerpt', l: 'Excerpt (shown on the blog index)', t: 'textarea', full: true },
        { k: 'body', l: 'Body (blank line between paragraphs)', t: 'textarea', full: true },
        { k: 'published', l: 'Published on site', t: 'checkbox' }
      ]
    },
    product: {
      title: 'Store product', resource: 'content', list: () => db.content.products, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Product name', req: true, full: true },
        { k: 'category', l: 'Category', t: 'select', opts: ['Templates', 'Social Media', 'Planning', 'Business', 'Design'] },
        { k: 'price', l: 'Price (ZAR, incl. VAT)', t: 'number', def: () => 199 },
        { k: 'blurb', l: 'Short description', t: 'textarea', full: true },
        { k: 'image', l: 'Product photo URL', full: true, def: () => PHOTOS.brand },
        { k: 'badge', l: 'Badge (e.g. New, Bestseller)' },
        { k: 'order', l: 'Display order', t: 'number', def: () => 9 },
        { k: 'published', l: 'Visible in store', t: 'checkbox' }
      ]
    },
    enquiry: {
      title: 'Enquiry', resource: 'enquiries', list: () => db.enquiries, labelOf: (r) => r.name,
      fields: [
        { k: 'name', l: 'Name', req: true },
        { k: 'email', l: 'Email', t: 'email' },
        { k: 'type', l: 'Project type' },
        { k: 'budget', l: 'Budget range' },
        { k: 'status', l: 'Status', t: 'select', opts: ['New', 'Contacted', 'Qualified', 'Lost'] },
        { k: 'message', l: 'Message', t: 'textarea', full: true }
      ]
    }
  };
  const findIn = (key, id) => SCHEMAS[key].list().find((r) => r.id === id);

  /* ---------------- router ---------------- */
  const routes = {};
  const route = (path, fn) => (routes[path] = fn);
  let current = { path: '/', params: [] };
  function go(hash) { location.hash = hash; }

  const DYNAMIC = ['clients', 'invoices', 'projects'];
  const ALIASES = { '/pricing': '/quote', '/onboarding': '/quote' }; // retired pages keep working
  function resolve() {
    const raw = (location.hash || '#/').slice(1) || '/';
    const [path] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    let key = '/' + parts.join('/');
    if (ALIASES[key]) key = ALIASES[key];
    if (routes[key]) return { key, params: [] };
    if (parts.length === 2 && parts[0] === 'blog') return { key: '/blog/:slug', params: [parts[1]] };
    if (parts.length === 3 && parts[0] === 'app' && DYNAMIC.indexOf(parts[1]) > -1) return { key: '/app/' + parts[1] + '/:id', params: [parts[2]] };
    return { key: '/', params: [] };
  }

  function render() {
    const { key, params } = resolve();
    current = { path: key, params };
    if ((key.startsWith('/app') || key.startsWith('/portal')) && !db.session) { location.replace('#/login'); return; }
    if (key.startsWith('/app') && role() === 'client') { location.replace('#/portal'); return; }
    closeDrawers();
    el('app').innerHTML = (routes[key] || routes['/'])(...params);
    window.scrollTo(0, 0);
    bind();
  }
  window.addEventListener('hashchange', render);

  /* ---------------- public site ---------------- */
  const NAV = [['/', 'Home'], ['/about', 'About'], ['/work', 'Work'], ['/services', 'Services'], ['/blog', 'Blog'], ['/store', 'Store'], ['/contact', 'Contact']];
  const services = () => db.content.services.slice().sort((a, b) => a.order - b.order);
  const plans = () => db.content.plans.slice().sort((a, b) => a.order - b.order);
  const works = () => db.content.work.filter((w) => w.published);

  function publicNav() {
    return `<header class="nav"><div class="wrap">
      <a href="#/" class="brand">${esc(db.settings.agency)}<small>Digital Marketing Agency</small></a>
      <nav class="navlinks" id="pubnav">${NAV.map(([h, l]) => `<a href="#${h}" class="${current.path === h || (h === '/blog' && current.path === '/blog/:slug') ? 'on' : ''}">${l}</a>`).join('')}
        <a href="#/login">Sign in</a>
        <a class="btn block nav-cta-mobile" href="#/quote">Get a quote →</a></nav>
      <div class="row"><a class="cart-link" href="#/cart" aria-label="Cart">Cart<span class="cart-count">${cartCount()}</span></a>
        <a class="btn nav-cta" href="#/quote">Get a quote →</a>
        <button class="navtoggle" data-toggle="pubnav" aria-label="Menu">☰</button></div>
    </div></header>`;
  }
  function publicFooter() {
    return `<footer class="site"><div class="wrap">
      <div><div class="brand" style="color:#fff">${esc(db.settings.agency)}</div>
      <p style="color:#9fb8ab;font-size:.85rem;margin:6px 0 0">Independent digital marketing agency · Cape Town</p></div>
      <nav class="row" style="flex-wrap:wrap;gap:18px">${NAV.map(([h, l]) => `<a href="#${h}">${l}</a>`).join('')}<a href="#/quote">Get a quote</a><a href="#/login">Sign in</a></nav>
      <div style="font-size:.8rem;color:#9fb8ab">${esc(db.content.site.tagline)}</div>
    </div></footer>`;
  }
  const page = (body) => publicNav() + body + publicFooter();
  const workCard = (w) => `<article class="card work-card"><div class="photo-frame"><img class="photo" loading="lazy" src="${esc(w.image || PHOTOS.w1)}" alt="${esc(w.client)} — ${esc(w.service)}" /></div><div class="body">
      <h3 style="font-size:1.05rem">${esc(w.client)}</h3><p style="margin:2px 0 8px;font-size:.86rem">${esc(w.service)}</p>
      <div class="stat" style="color:var(--green-700)">${esc(w.result)}</div></div></article>`;

  route('/', () => {
    const s = db.content.site;
    return page(`
    <section class="hero"><div class="wrap hero-grid">
      <div><div class="eyebrow">${esc(s.heroEyebrow)}</div>
        <h1 style="margin-top:14px">${esc(s.heroTitle)}</h1>
        <p class="lead">${esc(s.heroBody)}</p>
        <div class="row wrap-row" style="margin-top:22px"><a class="btn" href="#/quote">Get a quote →</a><a class="btn ghost" href="#/services">View our services</a></div></div>
      <div class="photo-frame hero"><img class="photo" src="${esc(s.heroImage)}" alt="Shai Studios client work" />
        <div class="quote">Ideas. Strategy.<br/>Real progress.</div></div>
    </div></section>
    <section style="padding:26px 0;background:var(--paper);border-bottom:1px solid var(--line)"><div class="wrap logo-strip">
      ${db.content.work.slice(0, 6).map((w) => `<span>${esc(w.client)}</span>`).join('')}
    </div></section>
    <section class="band"><div class="wrap"><div class="grid cards-4">${services().map((x) => `<div class="card"><div class="icon">${esc(x.icon)}</div>
      <h3>${esc(x.name)}</h3><p style="font-size:.9rem">${esc(x.blurb)}</p>
      <a class="linkish" href="#/quote?service=${encodeURIComponent(x.name)}">Get a quote →</a></div>`).join('')}</div></div></section>
    <section class="band alt"><div class="wrap">
      <div class="row between" style="margin-bottom:24px"><h2>Selected work</h2><a class="linkish" href="#/work">View all work →</a></div>
      <div class="grid cards-3">${works().slice(0, 3).map(workCard).join('')}</div></div></section>
    <section class="band"><div class="wrap grid cards-2" style="align-items:center">
      <div class="photo-frame wide"><img class="photo" loading="lazy" src="${esc(s.aboutImage)}" alt="The Shai Studios team at work" /></div>
      <div><div class="eyebrow">How we work</div><h2 style="margin:12px 0 6px">A simple, four-step partnership.</h2>
        <ol class="steps">${PROCESS.map((p) => `<li><b>${esc(p[0])}</b><span>${esc(p[1])}</span></li>`).join('')}</ol></div>
    </div></section>
    <section class="band alt"><div class="wrap grid cards-4">
      ${STATS.map((x) => `<div class="card center"><div class="stat-v">${esc(x[0])}</div><div class="muted" style="font-size:.85rem">${esc(x[1])}</div></div>`).join('')}
    </div></section>
    <section class="band"><div class="wrap grid cards-3">
      ${TESTIMONIALS.map((t) => `<div class="quote-card"><p>&ldquo;${esc(t.quote)}&rdquo;</p>
        <div class="row" style="margin-top:18px;gap:10px"><img class="avatar-img" loading="lazy" src="${esc(t.photo)}" alt="${esc(t.name)}" />
        <div><div style="color:#fff;font-size:.9rem">${esc(t.name)}</div><div style="color:#9fb8ab;font-size:.78rem">${esc(t.role)}</div></div></div></div>`).join('')}
    </div></section>
    <section class="band alt"><div class="wrap"><div class="cta" style="background-image:linear-gradient(rgba(19,45,35,.84),rgba(19,45,35,.84)),url('${esc(s.ctaImage)}');background-size:cover;background-position:center">
      <div><h2>Let's build forward.</h2><p style="color:#c6d7cc;margin:6px 0 0">Brand. Content. Growth. Digital.</p></div>
      <a class="btn light" href="#/quote">Get a quote →</a></div></div></section>`);
  });

  route('/services', () => page(`
    <section class="band"><div class="wrap"><div class="eyebrow">Our services</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Strategy.<br/>Content. Growth.<br/>Real results.</h2>
        <p style="padding-top:10px">A full suite of digital marketing services designed for ambitious businesses.</p></div>
      <div class="grid cards-4" style="margin-top:36px">${services().map((x) => `<div class="card">
        <div class="service-photo"><img class="photo" loading="lazy" src="${esc(x.image || PHOTOS.brand)}" alt="${esc(x.name)}" /></div>
        <div class="icon">${esc(x.icon)}</div><h3>${esc(x.name)}</h3><p style="font-size:.9rem">${esc(x.blurb)}</p>
        <ul class="checks">${x.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <a class="btn block" href="#/quote?service=${encodeURIComponent(x.name)}">Get a quote →</a></div>`).join('')}</div>
      <div class="grid cards-2" style="margin-top:56px;align-items:center">
        <div><div class="eyebrow">Our process</div><h2 style="margin:12px 0 6px">From first call to measurable results.</h2>
          <ol class="steps">${PROCESS.map((p) => `<li><b>${esc(p[0])}</b><span>${esc(p[1])}</span></li>`).join('')}</ol></div>
        <div class="photo-frame wide"><img class="photo" loading="lazy" src="${esc(PHOTOS.cta)}" alt="Strategy session" /></div>
      </div>
      <div class="quote-band"><div><h2>Every business is different. So is every quote.</h2>
        <p>Tell us what you need and we'll send a tailored proposal within two business days — no packages, no guesswork.</p></div>
        <a class="btn" href="#/quote">Get a quote →</a></div>
      <h2 style="margin:56px 0 8px">Frequently asked</h2>
      <div class="grid cards-2" style="margin-top:18px">${FAQ.map((f) => `<details class="card faq"><summary>${esc(f[0])}</summary><p style="font-size:.9rem">${esc(f[1])}</p></details>`).join('')}</div>
      </div></section>`));

  route('/work', () => page(`
    <section class="band"><div class="wrap"><div class="eyebrow">Our work</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Real brands.<br/>Real progress.</h2>
        <p style="padding-top:10px">Thoughtful strategy, powerful execution and measurable results.</p></div>
      <div class="tabs" id="workTabs">${['All', 'Brand', 'Content', 'Growth', 'Digital'].map((t, i) => `<button class="tab ${i === 0 ? 'on' : ''}" data-filter="${t}">${t}</button>`).join('')}</div>
      <div class="grid cards-3" id="workGrid">${works().map(workCard).join('')}</div>
      <div class="cta" style="margin-top:48px"><div><h2>Your brand could be next.</h2><p style="margin:6px 0 0">Tell us where you want to be in twelve months.</p></div>
        <a class="btn light" href="#/quote">Get a quote →</a></div>
    </div></section>`));

  /* ---------------- store ---------------- */
  const CART_KEY = 'shai-cart';
  const products = () => db.content.products.filter((p) => p.published).slice().sort((a, b) => a.order - b.order);
  const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } };
  const setCart = (c) => { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} };
  const cartCount = () => getCart().reduce((n, x) => n + x.qty, 0);
  const cartLines = () => getCart().map((x) => ({ ...x, p: db.content.products.find((p) => p.id === x.id) })).filter((x) => x.p);
  const cartTotal = () => cartLines().reduce((t, x) => t + x.p.price * x.qty, 0);
  let storeFilter = 'All';
  let storeQuery = '';
  const productCard = (p) => `<article class="card product-card">
      <div class="photo-frame tile">${p.badge ? `<span class="badge-corner">${esc(p.badge)}</span>` : ''}<img class="photo" loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}" /></div>
      <div class="body"><div class="muted" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.12em">${esc(p.category)}</div>
        <h3>${esc(p.name)}</h3><p style="font-size:.86rem">${esc(p.blurb)}</p>
        <div class="row between" style="margin-top:12px"><div class="price">${money(p.price)}</div>
        <button class="btn sm" data-add-cart="${p.id}">Add to cart</button></div></div></article>`;

  route('/store', () => {
    const cats = ['All'].concat([...new Set(products().map((p) => p.category))]);
    const list = products().filter((p) => (storeFilter === 'All' || p.category === storeFilter) &&
      (!storeQuery || (p.name + ' ' + p.blurb).toLowerCase().includes(storeQuery.toLowerCase())));
    return page(`
    <section class="band"><div class="wrap"><div class="eyebrow">Store</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Digital products<br/>for growing brands.</h2>
        <p style="padding-top:10px">The templates and tools we use with clients — instant download, yours to keep.</p></div>
      <div class="row between store-bar">
        <div class="tabs" style="margin:0">${cats.map((c) => `<button class="tab ${c === storeFilter ? 'on' : ''}" data-store-filter="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <input id="storeSearch" class="store-search" placeholder="Search products..." value="${esc(storeQuery)}" />
      </div>
      <div class="grid cards-3" style="margin-top:22px">${list.map(productCard).join('') || '<div class="card empty">No products match.</div>'}</div>
    </div></section>`);
  });

  route('/cart', () => {
    const lines = cartLines(); const total = cartTotal();
    return page(`
    <section class="band"><div class="wrap" style="max-width:980px">
      <nav class="crumbs" style="margin-bottom:14px"><a href="#/store">Store</a><span class="sep">/</span><span aria-current="page">Cart</span></nav>
      <h2 style="margin-bottom:22px">Your cart</h2>
      ${lines.length ? `<div class="grid cart-grid">
        <div class="card" style="padding:8px 22px">${lines.map((x) => `<div class="cart-line">
          <img src="${esc(x.p.image)}" alt="" /><div style="flex:1;min-width:0"><b>${esc(x.p.name)}</b><div class="muted" style="font-size:.8rem">${esc(x.p.category)} · digital download</div></div>
          <div class="qty"><button data-cart-qty="${x.id}:-1" aria-label="Decrease">−</button><span>${x.qty}</span><button data-cart-qty="${x.id}:1" aria-label="Increase">+</button></div>
          <div class="line-total">${money(x.p.price * x.qty)}</div></div>`).join('')}</div>
        <form class="card pad-lg" id="checkoutForm"><h3>Checkout</h3>
          <div class="totals" style="max-width:none;margin:14px 0">
            <div><span class="muted">Items</span><span>${cartCount()}</span></div>
            <div class="grand"><span>Total</span><span>${money(total)}</span></div>
            <div class="muted" style="font-size:.75rem">Prices include 15% VAT.</div></div>
          <div class="field"><label for="coName">Full name</label><input id="coName" required /></div>
          <div class="field"><label for="coEmail">Email for delivery</label><input id="coEmail" type="email" required /></div>
          <button class="btn block" type="submit">Place order →</button>
          <p class="muted" style="font-size:.75rem;margin-top:10px">We email a secure payment link and your downloads within one business hour.</p>
        </form></div>`
      : `<div class="card empty"><p>Your cart is empty.</p><a class="btn" href="#/store">Browse the store →</a></div>`}
    </div></section>`);
  });

  route('/about', () => page(`
    <section class="band"><div class="wrap"><div class="eyebrow">About ${esc(db.settings.agency)}</div>
      <div class="hero-grid" style="padding-top:18px">
        <div><h2>${esc(db.content.site.aboutTitle)}</h2><p>${esc(db.content.site.aboutBody)}</p>
          <p style="font-family:var(--serif);font-size:1.4rem;color:var(--ink);margin-top:26px">${esc(db.settings.owner)}</p>
          <div class="muted" style="font-size:.85rem">Founder & Agency Owner</div>
          <a class="btn" style="margin-top:22px" href="#/about">Our story →</a></div>
        <div class="photo-frame hero"><img class="photo" src="${esc(db.content.site.aboutImage)}" alt="Inside Shai Studios" />
          <div class="quote">People.<br/>Purpose.<br/>Progress.</div></div></div>
      <div class="grid cards-3" style="margin-top:44px">
        <div class="card"><div class="icon">◎</div><h3>Our approach</h3><p style="font-size:.9rem">Strategic. Creative. Human. Always results-first.</p></div>
        <div class="card"><div class="icon">♡</div><h3>Our values</h3><p style="font-size:.9rem">Integrity, creativity, accessibility and impact.</p></div>
        <div class="card"><div class="icon">✦</div><h3>Our mission</h3><p style="font-size:.9rem">To help brands create opportunity through thoughtful digital marketing.</p></div>
      </div>
      <h2 style="margin:56px 0 6px">The team</h2><p>A small senior team — you work with the people who do the work.</p>
      <div class="grid cards-4" style="margin-top:22px">${TEAM.map((m) => `<div class="card" style="padding:0;overflow:hidden">
        <div class="photo-frame tile" style="border-radius:0;box-shadow:none"><img class="photo" loading="lazy" src="${esc(m.photo)}" alt="${esc(m.name)}" /></div>
        <div style="padding:16px"><h3 style="font-size:1.05rem">${esc(m.name)}</h3><div class="muted" style="font-size:.85rem">${esc(m.role)}</div></div></div>`).join('')}</div>
      </div></section>`));

  route('/contact', () => page(`
    <section class="band"><div class="wrap"><div class="eyebrow">Let's talk</div>
      <div class="hero-grid" style="padding-top:18px;align-items:start">
        <div><h2>Let's build forward.</h2>
          <p>Tell us about your project and we'll get back to you within 1–2 business days.</p>
          <div class="card" style="margin-top:22px">
            <div class="row" style="gap:10px"><span class="icon" style="margin:0">✉</span><div><div style="font-size:.8rem;font-weight:500">Email us</div><div class="muted" style="font-size:.88rem">${esc(db.settings.email)}</div></div></div>
            <div class="row" style="gap:10px;margin-top:14px"><span class="icon" style="margin:0">☏</span><div><div style="font-size:.8rem;font-weight:500">WhatsApp us</div><div class="muted" style="font-size:.88rem">${esc(db.settings.phone)}</div></div></div>
            <div class="row" style="gap:10px;margin-top:14px"><span class="icon" style="margin:0">⌖</span><div><div style="font-size:.8rem;font-weight:500">Based in</div><div class="muted" style="font-size:.88rem">${esc(db.settings.address)}</div></div></div>
            <a class="btn block" style="margin-top:18px" href="#/quote">Need a proposal? Get a quote →</a>
          </div></div>
        <form class="card pad-lg" id="enqForm">
          <div class="field-row"><div class="field"><label for="eName">Your name</label><input id="eName" required /></div>
          <div class="field"><label for="eEmail">Email address</label><input id="eEmail" type="email" required /></div></div>
          <div class="field-row"><div class="field"><label for="eType">Project type</label><select id="eType">${services().map((s) => `<option>${esc(s.name)}</option>`).join('')}<option>Not sure yet</option></select></div>
          <div class="field"><label for="eBudget">Budget range</label><select id="eBudget"><option>Under R5 000</option><option>R5 000 – R10 000</option><option>R10 000 – R20 000</option><option>R20 000+</option></select></div></div>
          <div class="field"><label for="eMsg">Tell us about your project</label><textarea id="eMsg" rows="4" placeholder="Share a few details about your goals..."></textarea></div>
          <button class="btn block" type="submit">Send enquiry →</button>
          <p class="muted" style="font-size:.76rem;margin-top:10px">Enquiries appear instantly in the admin workspace.</p>
        </form></div></div></section>`));

  const PROCESS = [
    ['01 · Discover', 'A free 30-minute call to understand your business, audience and goals.'],
    ['02 · Strategy', 'We map the channels, messaging and budget that will actually move the needle.'],
    ['03 · Build', 'Content, campaigns and websites produced by a senior team — no hand-offs to juniors.'],
    ['04 · Grow', 'Monthly reporting in plain English, with next month planned before it starts.']
  ];
  const STATS = [['R4.2m', 'Client revenue influenced'], ['24', 'Brands partnered with'], ['+280%', 'Average engagement lift'], ['6 yrs', 'Building in South Africa']];
  const TESTIMONIALS = [
    { quote: 'They took our brand from an idea in a notebook to something people recognise on a shelf.', name: 'Sarah Ndlovu', role: 'Founder, LUMI Collective', photo: PHOTOS.team1 },
    { quote: 'The first agency that explained the numbers instead of hiding behind them.', name: 'Thabo Mokoena', role: 'Director, Nomu Skincare', photo: PHOTOS.team2 },
    { quote: 'Our site went live in six weeks and organic traffic has not stopped climbing since.', name: 'Daniel Kgatle', role: 'Owner, Moyo Interiors', photo: PHOTOS.team4 }
  ];
  const TEAM = [
    { name: 'Tayla Smith', role: 'Founder & Agency Owner', photo: PHOTOS.team1 },
    { name: 'Naledi Khumalo', role: 'Content & Social Lead', photo: PHOTOS.team3 },
    { name: 'Sipho Dlamini', role: 'Digital & SEO Lead', photo: PHOTOS.team2 },
    { name: 'Karabo N', role: 'Systems & Technology', photo: PHOTOS.team4 }
  ];
  const FAQ = [
    ['Are you locked into long contracts?', 'No. Retainers run month to month after an initial 3-month commitment so the strategy has time to work.'],
    ['Do prices include VAT?', 'All listed prices exclude 15% VAT, which is shown separately on every invoice.'],
    ['What happens after I enquire?', 'You get a reply within 1-2 business days and a free 30-minute discovery call.'],
    ['Can I change package mid-way?', 'Yes - upgrade, downgrade or pause with 30 days notice via your client portal.']
  ];

  const posts = () => db.content.posts.filter((p) => p.published).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const slugOf = (p) => p.slug || p.id;
  const postBody = (p) => String(p.body || '').split(/\n{2,}|\n/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');

  route('/blog', () => {
    const list = posts();
    const [lead, ...rest] = list;
    return page(`
    <section class="band"><div class="wrap"><div class="eyebrow">The blog</div>
      <div class="grid cards-2" style="align-items:start;margin-top:12px">
        <h2>Ideas worth<br/>stealing.</h2>
        <p style="padding-top:10px">Practical marketing thinking for owner-led businesses — no jargon, no gatekeeping.</p></div>
      ${lead ? `<a class="card post-lead" href="#/blog/${esc(slugOf(lead))}" style="margin-top:36px;padding:0;overflow:hidden;display:block">
        <div class="grid cards-2" style="gap:0;align-items:stretch">
          <div class="photo-frame" style="border-radius:0;box-shadow:none;min-height:280px"><img class="photo" src="${esc(lead.image)}" alt="${esc(lead.title)}" /></div>
          <div style="padding:32px"><span class="pill">${esc(lead.category)}</span>
            <h3 style="font-size:1.9rem;margin:14px 0 8px">${esc(lead.title)}</h3>
            <p>${esc(lead.excerpt)}</p>
            <div class="muted" style="font-size:.8rem;margin-top:14px">${esc(lead.author)} · ${fmtDate(lead.date)}</div>
            <span class="linkish" style="display:inline-block;margin-top:14px">Read article →</span></div>
        </div></a>` : '<div class="card empty" style="margin-top:32px">No posts published yet.</div>'}
      <div class="grid cards-3" style="margin-top:22px">${rest.map((p) => `<a class="card work-card" href="#/blog/${esc(slugOf(p))}" style="display:block">
        <div class="photo-frame"><img class="photo" loading="lazy" src="${esc(p.image)}" alt="${esc(p.title)}" /></div>
        <div class="body"><span class="pill">${esc(p.category)}</span>
          <h3 style="font-size:1.15rem;margin:10px 0 6px">${esc(p.title)}</h3>
          <p style="font-size:.88rem">${esc(p.excerpt)}</p>
          <div class="muted" style="font-size:.78rem;margin-top:10px">${esc(p.author)} · ${fmtDate(p.date)}</div></div></a>`).join('')}</div>
    </div></section>`);
  });

  route('/blog/:slug', (slug) => {
    const p = db.content.posts.find((x) => slugOf(x) === slug && x.published);
    if (!p) return page('<section class="band"><div class="wrap"><h2>Post not found.</h2><p><a class="linkish" href="#/blog">Back to the blog</a></p></div></section>');
    const more = posts().filter((x) => x.id !== p.id).slice(0, 3);
    return page(`
    <article class="band"><div class="wrap article">
      <nav class="crumbs" style="margin-bottom:18px"><a href="#/">Home</a><span class="sep">/</span><a href="#/blog">Blog</a><span class="sep">/</span><span aria-current="page">${esc(p.category)}</span></nav>
      <span class="pill">${esc(p.category)}</span>
      <h1 style="font-size:clamp(2rem,4vw,3.2rem);margin:14px 0 10px">${esc(p.title)}</h1>
      <div class="muted" style="font-size:.88rem">${esc(p.author)} · ${fmtDate(p.date)}</div>
      <div class="photo-frame wide" style="margin:28px 0"><img class="photo" src="${esc(p.image)}" alt="${esc(p.title)}" /></div>
      <div class="prose"><p class="lead-para">${esc(p.excerpt)}</p>${postBody(p)}</div>
      <div class="cta" style="margin-top:44px"><div><h2>Want this done for you?</h2>
        <p style="color:#c6d7cc;margin:6px 0 0">Tell us about your business in three minutes.</p></div>
        <a class="btn light" href="#/quote">Get a quote →</a></div>
    </div></article>
    <section class="band alt"><div class="wrap"><h2 style="margin-bottom:22px">More reading</h2>
      <div class="grid cards-3">${more.map((x) => `<a class="card work-card" href="#/blog/${esc(slugOf(x))}" style="display:block">
        <div class="photo-frame"><img class="photo" loading="lazy" src="${esc(x.image)}" alt="${esc(x.title)}" /></div>
        <div class="body"><h3 style="font-size:1.05rem">${esc(x.title)}</h3><div class="muted" style="font-size:.78rem;margin-top:6px">${fmtDate(x.date)}</div></div></a>`).join('')}</div>
    </div></section>`);
  });

  /* ---------------- client onboarding wizard ---------------- */
  const WIZ_KEY = 'shai-onboarding-draft';
  const WIZ_STEPS = ['About you', 'Your business', 'What you need', 'Budget & timeline', 'Your account', 'Review'];
  const GOALS = ['More qualified leads', 'Brand awareness', 'Online sales', 'Social media growth', 'A new website', 'Better reporting'];
  let wiz = null;
  function loadWiz() {
    if (!wiz) { try { wiz = JSON.parse(localStorage.getItem(WIZ_KEY)); } catch (e) { wiz = null; } }
    if (!wiz || !wiz.data) wiz = { step: 0, data: { name: '', email: '', phone: '', jobTitle: '', business: '', industry: '', website: '', size: '', location: '', services: [], goals: [], plan: '', budget: '', start: '', brief: '', password: '', terms: false } };
    const q = (location.hash.split('?')[1] || '').match(/plan=([^&]+)/);
    if (q && !wiz.data.plan) wiz.data.plan = decodeURIComponent(q[1]);
    const sv = (location.hash.split('?')[1] || '').match(/service=([^&]+)/);
    if (sv) { const v = decodeURIComponent(sv[1]); if (wiz.data.services.indexOf(v) < 0) { wiz.data.services.push(v); saveWiz(); } }
    return wiz;
  }
  const saveWiz = () => { try { localStorage.setItem(WIZ_KEY, JSON.stringify(wiz)); } catch (e) {} };
  function wizErrors(step) {
    const d = wiz.data; const e = [];
    if (step === 0) {
      if (!d.name.trim()) e.push('Your name is required.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) e.push('A valid email address is required.');
    }
    if (step === 1 && !d.business.trim()) e.push('Business name is required.');
    if (step === 2 && !d.services.length) e.push('Choose at least one service.');
    if (step === 3 && !d.budget) e.push('Choose a budget range.');
    if (step === 4) {
      if ((d.password || '').length < 8) e.push('Choose a password of at least 8 characters.');
      if (!d.terms) e.push('Please accept the terms to continue.');
      if (db.users.some((u) => u.email.toLowerCase() === d.email.trim().toLowerCase())) e.push('An account already exists for that email — sign in instead.');
    }
    return e;
  }
  const chips = (name, opts, chosen) => `<div class="chips">${opts.map((o) => `<button type="button" class="chip ${chosen.indexOf(o) > -1 ? 'on' : ''}" data-chip="${name}:${esc(o)}">${esc(o)}</button>`).join('')}</div>`;

  route('/quote', () => {
    loadWiz();
    const d = wiz.data; const step = wiz.step;
    const errs = wiz.showErrors ? wizErrors(step) : [];
    const field = (k, l, t, ph) => `<div class="field"><label for="w_${k}">${l}</label><input id="w_${k}" data-wiz="${k}" type="${t || 'text'}" value="${esc(d[k])}" placeholder="${esc(ph || '')}" /></div>`;
    const select = (k, l, opts) => `<div class="field"><label for="w_${k}">${l}</label><select id="w_${k}" data-wiz="${k}">${['— select —'].concat(opts).map((o, i) => `<option value="${i ? esc(o) : ''}" ${(i ? o : '') === d[k] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    let body = '';
    if (step === 0) body = `<h2>First, who are we speaking to?</h2><p>We reply to every enquiry within one business day.</p>
      <div class="field-row">${field('name', 'Your full name')}${field('email', 'Email address', 'email')}</div>
      <div class="field-row">${field('phone', 'Phone / WhatsApp', 'tel')}${field('jobTitle', 'Your role', 'text', 'Founder, Marketing Manager…')}</div>`;
    else if (step === 1) body = `<h2>Tell us about the business.</h2><p>This shapes the strategy we bring to the first call.</p>
      <div class="field-row">${field('business', 'Business name')}${select('industry', 'Industry', ['Retail & e-commerce', 'Health & wellness', 'Professional services', 'Hospitality & food', 'Property & interiors', 'Non-profit', 'Other'])}</div>
      <div class="field-row">${field('website', 'Website (if you have one)', 'text', 'https://')}${select('size', 'Team size', ['Just me', '2–10 people', '11–50 people', '50+ people'])}</div>
      ${field('location', 'Where are you based?', 'text', 'Cape Town, South Africa')}`;
    else if (step === 2) body = `<h2>What do you need help with?</h2><p>Pick everything that applies — you can change this later.</p>
      <label>Services</label>${chips('services', db.content.services.map((x) => x.name), d.services)}
      <label style="margin-top:22px">Your goals for the next 12 months</label>${chips('goals', GOALS, d.goals)}
`;
    else if (step === 3) body = `<h2>Budget and timing.</h2><p>An honest range helps us recommend something that actually fits.</p>
      <div class="field-row">${select('budget', 'Monthly budget', ['Under R5 000', 'R5 000 – R10 000', 'R10 000 – R20 000', 'R20 000+'])}
      ${select('start', 'When would you like to start?', ['As soon as possible', 'Within a month', 'This quarter', 'Just exploring'])}</div>
      <div class="field"><label for="w_brief">Anything else we should know?</label>
        <textarea id="w_brief" data-wiz="brief" rows="5" placeholder="Your audience, what you have tried before, competitors you admire...">${esc(d.brief)}</textarea></div>`;
    else if (step === 4) body = `<h2>Where should we send your quote?</h2><p>Your proposal lands in a private client portal — create your login now and it is ready the moment we reply.</p>
      <div class="field"><label>Your sign-in email</label><input value="${esc(d.email)}" disabled /></div>
      <div class="field"><label for="w_password">Choose a password</label><input id="w_password" data-wiz="password" type="password" value="${esc(d.password)}" placeholder="At least 8 characters" /></div>
      <label class="row check-row" style="gap:10px;font-weight:400"><input type="checkbox" id="w_terms" data-wiz="terms" ${d.terms ? 'checked' : ''} style="width:auto" />
        <span style="font-size:.88rem">I agree to be contacted about this enquiry and accept the terms of service.</span></label>`;
    else {
      const line = (l, v) => `<div class="row between review-line"><span class="muted">${l}</span><span>${esc(v || '—')}</span></div>`;
      body = `<h2>One last look.</h2><p>Check the details, then request your quote — a tailored proposal follows within two business days.</p>
        <div class="card" style="margin-top:18px">
          ${line('Name', d.name)}${line('Email', d.email)}${line('Phone', d.phone)}${line('Business', d.business)}
          ${line('Industry', d.industry)}${line('Team size', d.size)}${line('Website', d.website)}${line('Location', d.location)}
          ${line('Services', d.services.join(', '))}${line('Goals', d.goals.join(', '))}
          ${line('Budget', d.budget)}${line('Timing', d.start)}${line('Brief', d.brief)}</div>`;
    }
    const pct = Math.round((step / (WIZ_STEPS.length - 1)) * 100);
    return page(`
    <section class="band wizard-band"><div class="wrap wizard">
      <div class="wizard-head">
        <div class="row between" style="flex-wrap:wrap;gap:10px">
          <div><div class="eyebrow">Get a quote</div><h1 style="font-size:clamp(1.8rem,3.5vw,2.6rem);margin-top:8px">Tell us what you need.</h1></div>
          <div class="muted" style="font-size:.85rem">Step ${step + 1} of ${WIZ_STEPS.length} · ${esc(WIZ_STEPS[step])}</div>
        </div>
        <div class="wizard-steps">${WIZ_STEPS.map((l, i) => `<div class="wstep ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}"><span class="dot">${i < step ? '✓' : i + 1}</span><span class="lbl">${esc(l)}</span></div>`).join('')}</div>
        <div class="bar" style="margin-top:14px"><i style="width:${pct}%"></i></div>
      </div>
      <form class="card pad-lg wizard-card" id="wizForm">
        ${body}
        ${errs.length ? `<div class="error-box">${errs.map((x) => `<div>${esc(x)}</div>`).join('')}</div>` : ''}
        <div class="row between wizard-actions">
          <button type="button" class="btn ghost" data-wiz-back ${step === 0 ? 'disabled' : ''}>← Back</button>
          <div class="row" style="gap:10px">
            <span class="muted saved-note">Progress saved on this device</span>
            ${step === WIZ_STEPS.length - 1
              ? '<button type="submit" class="btn" data-wiz-submit>Request my quote →</button>'
              : '<button type="submit" class="btn" data-wiz-next>Continue →</button>'}
          </div></div>
      </form>
      <p class="muted center" style="font-size:.8rem;margin-top:18px">Prefer to just talk? <a class="linkish" href="#/contact">Send us a message instead.</a></p>
    </div></section>`);
  });

  function submitWizard() {
    const d = wiz.data;
    const c = { id: uid('c'), name: d.business || d.name, person: d.name, email: d.email, phone: d.phone,
      service: d.services[0] || 'Brand', status: 'Onboarding',
      notes: [d.brief, d.website && ('Website: ' + d.website), d.location].filter(Boolean).join('\n'), createdAt: Date.now() };
    db.clients.unshift(c);
    const u = { id: uid('u'), name: d.name, email: d.email, role: 'client', status: 'Active', password: d.password, clientId: c.id, createdAt: Date.now() };
    db.users.unshift(u);
    db.projects.unshift({ id: uid('p'), name: 'Quote & discovery', clientId: c.id, type: 'Strategy', owner: db.settings.owner,
      deadline: daysFromNow(14), progress: 10, status: 'Planning', createdAt: Date.now() });
    db.enquiries.unshift({ id: uid('e'), name: d.name, email: d.email, type: d.services.join(', ') || 'Not sure yet',
      budget: d.budget, message: d.brief, status: 'Qualified', at: Date.now() });
    db.onboardings.unshift(Object.assign({ id: uid('o'), clientId: c.id, at: Date.now() }, d, { password: undefined }));
    if (liveAuth()) {
      // create a real portal account, then store the quote against it
      window.SHAI.auth.signUp(d.email, d.password, { name: d.name, business: d.business })
        .catch((err) => console.warn('[shai] signup', err.message))
        .finally(() => window.SHAI.submit.quote(d).catch((err) => console.warn('[shai] quote', err.message)));
    }
    audit('created', 'Client', c.name, 'self-serve onboarding');
    audit('created', 'User', u.name, 'client portal account');
    log('New client ' + c.name + ' completed onboarding');
    localStorage.removeItem(WIZ_KEY); wiz = null;
    save(); signIn(u);
    toast('Quote requested — thanks, ' + d.name.split(' ')[0] + '!');
  }

  /* ---------------- sign in ---------------- */
  const liveAuth = () => !!(window.SHAI && window.SHAI.enabled);

  route('/login', () => `
    <div class="auth">
      <div class="panel"><div class="inner">
        <a href="#/" class="brand">${esc(db.settings.agency)}<small>Agency Workspace</small></a>
        <h1 style="font-size:2.6rem;margin:34px 0 10px">Welcome back.</h1>
        <p style="margin-bottom:22px">Sign in to manage clients, projects, invoices and your team.</p>
        ${liveAuth() ? `<div class="oauth-row">
          <button class="btn ghost block" data-oauth="google"><span class="oauth-mark">G</span> Continue with Google</button>
          <button class="btn ghost block" data-oauth="github"><span class="oauth-mark">GH</span> Continue with GitHub</button>
        </div>
        <div class="or-line"><span>or</span></div>` : ''}
        <form id="loginForm">
          <div class="field"><label for="lEmail">Email address</label><input id="lEmail" type="email" value="${liveAuth() ? '' : 'admin@shaistudios.co.za'}" required /></div>
          <div class="field"><label for="lPass">Password</label><input id="lPass" type="password" value="${liveAuth() ? '' : 'demo1234'}" required /></div>
          <button class="btn block" style="margin-top:16px" type="submit">Sign in →</button>
          <div id="loginErr" class="error"></div>
        </form>
        ${liveAuth() ? `<div class="row" style="gap:10px;margin-top:12px">
            <button class="btn ghost sm" data-magic>Email me a sign-in link</button>
            <button class="btn ghost sm" data-reset-pw>Forgot password</button></div>
          <p class="muted" style="font-size:.76rem;margin-top:18px">Connected to shaistudiodb. New sign-ups become clients; the owners are super admins automatically.</p>`
        : `<p class="muted" style="font-size:.78rem;margin:20px 0 8px">Demo mode — no database connected yet. Sign in as any role:</p>
        <div class="row" style="flex-wrap:wrap;gap:8px">
          ${db.users.map((u) => `<button class="btn ghost sm" data-demo="${u.id}">${esc(ROLES[u.role].label)}</button>`).join('')}
        </div>
        <p class="muted" style="font-size:.76rem;margin-top:22px">🔒 Demo password for all accounts: demo1234</p>`}
      </div></div>
      <div class="side"><h2>Ideas.<br/>Strategy.<br/>Real progress.</h2>
        <p style="color:#bcd0c4;margin-top:18px;max-width:34ch">The digital marketing partner for ambitious businesses.</p></div>
    </div>`);

  /* ---------------- workspace shell ---------------- */
  const APPNAV = [
    ['/app', '⌂', 'Overview', 'dashboard'],
    ['/app/clients', '◔', 'Clients', 'clients'],
    ['/app/projects', '▤', 'Projects', 'projects'],
    ['/app/invoices', '❐', 'Invoices', 'invoices'],
    ['/app/enquiries', '✉', 'Enquiries', 'enquiries'],
    ['/app/orders', '🛒', 'Store orders', 'orders'],
    ['/app/content', '✎', 'Site content', 'content'],
    ['/app/users', '⚇', 'Users & roles', 'users'],
    ['/app/audit', '⟲', 'Audit log', 'audit'],
    ['/app/settings', '⚙', 'Settings', 'settings']
  ];

  function crumbs(trail) {
    const all = [['#/app', 'Workspace']].concat(trail || []);
    return `<nav class="crumbs" aria-label="Breadcrumb">${all.map((c, i) => {
      const last = i === all.length - 1;
      return last ? `<span aria-current="page">${esc(c[1])}</span>` : `<a href="${c[0]}">${esc(c[1])}</a><span class="sep">/</span>`;
    }).join('')}</nav>`;
  }

  function shell(trail, body, actions) {
    const s = db.session || {};
    const on = (h) => (current.path === h || (h !== '/app' && current.path.indexOf(h) === 0) ? 'on' : '');
    return `<div class="shell">
      <aside class="side-nav noprint" id="appnav">
        <a href="#/app" class="brand">${esc(db.settings.agency)}<small>Agency Workspace</small></a>
        ${APPNAV.filter(([, , , res]) => can(res, 'view')).map(([h, i, l]) => `<a href="#${h}" class="${on(h)}"><span>${i}</span>${l}</a>`).join('')}
        <div class="spacer"></div>
        <div class="who"><div class="avatar">${initials(s.name)}</div><div><div style="color:#fff;font-size:.85rem">${esc(s.name || '')}</div>
          <div style="font-size:.72rem">${esc(ROLES[s.role] ? ROLES[s.role].label : '')}</div></div></div>
        <a href="#/login" data-signout>↩ Sign out</a>
      </aside>
      <main class="main">
        <div class="topbar noprint">
          <div class="row"><button class="navtoggle" data-toggle="appnav">☰</button>${crumbs(trail)}</div>
          <div class="row">${actions || ''}<span class="pill">${esc(ROLES[s.role] ? ROLES[s.role].label : '')}</span><div class="avatar">${initials(s.name)}</div></div>
        </div>
        <div class="page">${body}</div>
      </main></div>`;
  }

  // onboarding answers captured by the public wizard, shown on the client record
  function onboardingCard(clientId) {
    const o = db.onboardings.find((x) => x.clientId === clientId);
    if (!o) return '';
    const rows = [['Role', o.jobTitle], ['Industry', o.industry], ['Team size', o.size], ['Website', o.website],
      ['Location', o.location], ['Services', (o.services || []).join(', ')], ['Goals', (o.goals || []).join(', ')],
      ['Package', o.plan], ['Budget', o.budget], ['Timing', o.start]];
    return `<div class="card" style="margin-top:20px"><h3>Onboarding answers</h3>
      <div class="muted" style="font-size:.78rem;margin-bottom:8px">Submitted ${fmtStamp(o.at)}</div>
      ${rows.map((r) => `<div class="row between review-line"><span class="muted">${esc(r[0])}</span><span>${esc(r[1] || '—')}</span></div>`).join('')}
      ${o.brief ? `<p style="font-size:.88rem;margin-top:10px">${esc(o.brief)}</p>` : ''}</div>`;
  }

  // row action buttons, permission aware
  function rowActions(entity, id, extra) {
    const sc = SCHEMAS[entity];
    let h = extra || '';
    if (can(sc.resource, 'edit')) h += `<button class="btn sm ghost" data-edit="${entity}:${id}">Edit</button>`;
    if (can(sc.resource, 'delete')) h += `<button class="btn sm ghost danger-text" data-delete="${entity}:${id}">Delete</button>`;
    return h || '<span class="muted" style="font-size:.78rem">View only</span>';
  }

  /* ---------------- overview ---------------- */
  route('/app', () => {
    const paid = db.invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invTotals(i).total, 0);
    const out = db.invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + invTotals(i).total, 0);
    const over = db.invoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + invTotals(i).total, 0);
    const total = db.invoices.reduce((s, i) => s + invTotals(i).total, 0);
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const kpi = (l, v, d, bad) => `<div class="card kpi"><div class="muted" style="font-size:.8rem">${l}</div><div class="v">${money(v)}</div><div class="d ${bad ? 'bad' : ''}">${d}</div></div>`;
    const newEnq = db.enquiries.filter((e) => e.status === 'New');
    return shell([], `
      <div class="page-head"><div><h1 style="font-size:2.6rem">${greet}, ${esc((db.session.name || '').split(' ')[0])}.</h1>
        <p>You are signed in as <b>${esc(ROLES[role()].label)}</b> — here's what's happening at ${esc(db.settings.agency)}.</p></div>
        <div class="muted" style="font-size:.85rem">${new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
      <div class="grid kpis">
        ${kpi('Total invoiced', total, db.invoices.length + ' invoices')}
        ${kpi('Paid', paid, Math.round((paid / (total || 1)) * 100) + '% of total')}
        ${kpi('Outstanding', out, db.invoices.filter((i) => i.status !== 'Paid').length + ' awaiting payment')}
        ${kpi('Overdue', over, over > 0 ? 'Needs follow-up' : 'All clear', over > 0)}
      </div>
      <div class="grid cards-2" style="margin-top:20px;grid-template-columns:1.4fr 1fr">
        <div>
          ${newEnq.length && can('enquiries', 'view') ? `<div class="card" style="margin-bottom:20px"><div class="row between"><h3>New enquiries (${newEnq.length})</h3><a class="linkish" href="#/app/enquiries">Manage →</a></div>
            <ul class="activity">${newEnq.slice(0, 3).map((e) => `<li><span class="avatar">${initials(e.name)}</span>
              <div><div>${esc(e.name)} — ${esc(e.type)} · ${esc(e.budget)}</div><div class="muted" style="font-size:.8rem">${esc(e.email)}</div></div>
              <span class="when">${ago(e.at)}</span>${can('clients', 'create') ? `<button class="btn sm" data-convert="${e.id}">Convert</button>` : ''}</li>`).join('')}</ul></div>` : ''}
          <div class="table-card"><div class="row between" style="padding:16px 18px"><h3>Recent invoices</h3><a class="linkish" href="#/app/invoices">View all →</a></div>
          <table><thead><tr><th>Client</th><th>Invoice</th><th>Amount</th><th>Status</th><th>Issued</th><th></th></tr></thead><tbody>
          ${db.invoices.slice(0, 5).map((i) => `<tr><td>${esc(client(i.clientId).name)}</td><td>${esc(i.number)}</td><td>${money(invTotals(i).total)}</td>
            <td><span class="pill ${i.status.toLowerCase()}">${i.status}</span></td><td>${fmtDate(i.issueDate)}</td>
            <td class="right"><button class="btn sm ghost" data-goto="#/app/invoices/${i.id}">Open</button></td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div>
          <div class="card"><h3>Quick actions</h3><div class="grid cards-2" style="margin-top:12px;gap:10px">
            ${can('clients', 'create') ? '<button class="btn ghost" data-new="client">＋ Add client</button>' : ''}
            ${can('projects', 'create') ? '<button class="btn ghost" data-new="project">＋ New project</button>' : ''}
            ${can('invoices', 'create') ? '<button class="btn" data-goto="#/app/invoices/new">＋ Create invoice</button>' : ''}
            ${can('users', 'create') ? '<button class="btn ghost" data-new="user">＋ Add user</button>' : ''}
          </div>${!can('clients', 'create') && !can('invoices', 'create') ? '<p style="font-size:.85rem">Your role has read-only access to this workspace.</p>' : ''}</div>
          <div class="card" style="margin-top:20px"><h3>Recent activity</h3>
            <ul class="activity">${db.activity.slice(0, 6).map((a) => `<li><span>•</span><span>${esc(a.text)}</span><span class="when">${ago(a.at)}</span></li>`).join('')}</ul>
            ${can('audit', 'view') ? '<a class="linkish" href="#/app/audit">Full audit log →</a>' : ''}</div>
        </div></div>`,
      can('invoices', 'create') ? `<button class="btn sm" data-goto="#/app/invoices/new">Create invoice</button>` : '');
  });

  /* ---------------- clients ---------------- */
  route('/app/clients', () => {
    if (!can('clients', 'view')) return shell([], '<div class="card empty">You do not have access to clients.</div>');
    const rows = db.clients.map((c) => `<tr>
      <td><div class="row" style="gap:10px"><span class="avatar">${initials(c.name)}</span><a class="linkish" href="#/app/clients/${c.id}"><b>${esc(c.name)}</b></a></div></td>
      <td><span class="pill ${c.status === 'On Hold' ? 'hold' : c.status === 'Archived' ? 'draft' : ''}">${esc(c.status)}</span></td>
      <td>${esc(c.person)}<div class="muted" style="font-size:.78rem">${esc(c.email)}</div></td>
      <td>${esc(c.service)}</td><td>${money(balanceOf(c.id))}</td>
      <td class="right">${rowActions('client', c.id, `<button class="btn sm ghost" data-goto="#/app/clients/${c.id}">Open</button>`)}</td></tr>`).join('');
    return shell([['#/app/clients', 'Clients']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Clients</h1><p>${db.clients.length} client records. Build and manage lasting relationships.</p></div>
        ${can('clients', 'create') ? '<button class="btn" data-new="client">＋ Add client</button>' : ''}</div>
      <div class="table-card"><table><thead><tr><th>Client</th><th>Status</th><th>Contact person</th><th>Service</th><th>Outstanding</th><th class="right">Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">No clients yet.</td></tr>'}</tbody></table></div>`);
  });

  route('/app/clients/:id', (id) => {
    const c = db.clients.find((x) => x.id === id);
    if (!c) return shell([['#/app/clients', 'Clients']], `<div class="card empty">Client not found. <a class="linkish" href="#/app/clients">Back to clients</a></div>`);
    const projs = db.projects.filter((p) => p.clientId === id);
    const invs = db.invoices.filter((i) => i.clientId === id);
    const users = db.users.filter((u) => u.clientId === id);
    return shell([['#/app/clients', 'Clients'], ['#/app/clients/' + id, c.name]], `
      <div class="page-head"><div class="row" style="gap:16px">
        <span class="avatar" style="width:64px;height:64px;font-size:1.2rem">${initials(c.name)}</span>
        <div><h1 style="font-size:2rem">${esc(c.name)} <span class="pill ${c.status === 'On Hold' ? 'hold' : ''}">${esc(c.status)}</span></h1>
        <p style="margin:2px 0 0">${esc(c.service)} · ${esc(c.email)} · ${esc(c.phone)}</p></div></div>
        <div class="row">${rowActions('client', c.id)}
        ${can('projects', 'create') ? `<button class="btn ghost" data-new="project" data-preset="clientId:${c.id}">＋ New project</button>` : ''}
        ${can('invoices', 'create') ? `<button class="btn" data-goto="#/app/invoices/new?client=${c.id}">＋ Create invoice</button>` : ''}</div></div>
      <div class="grid cards-2" style="grid-template-columns:1.4fr 1fr">
        <div>
          <div class="table-card" style="margin-bottom:20px"><div style="padding:16px 18px"><h3>Projects (${projs.length})</h3></div>
            <table><thead><tr><th>Project</th><th>Owner</th><th>Deadline</th><th>Progress</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>
            ${projs.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.owner || '—')}</td><td>${fmtDate(p.deadline)}</td>
              <td><div class="row"><div class="bar" style="flex:1"><i style="width:${p.progress}%"></i></div><span class="muted" style="font-size:.78rem">${p.progress}%</span></div></td>
              <td><span class="pill">${esc(p.status)}</span></td><td class="right">${rowActions('project', p.id)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No projects yet.</td></tr>'}
            </tbody></table></div>
          <div class="table-card"><div style="padding:16px 18px"><h3>Invoices (${invs.length})</h3></div>
            <table><thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>
            ${invs.map((i) => `<tr><td>${esc(i.number)}</td><td>${fmtDate(i.issueDate)}</td><td>${fmtDate(i.dueDate)}</td><td>${money(invTotals(i).total)}</td>
              <td><span class="pill ${i.status.toLowerCase()}">${i.status}</span></td>
              <td class="right"><button class="btn sm ghost" data-goto="#/app/invoices/${i.id}">Open</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No invoices yet.</td></tr>'}
            </tbody></table></div>
        </div>
        <div>
          <div class="card"><h3>Account</h3>
            <div class="row between" style="margin-top:10px"><span class="muted">Outstanding balance</span><b>${money(balanceOf(c.id))}</b></div>
            <div class="row between" style="margin-top:8px"><span class="muted">Lifetime invoiced</span><b>${money(invs.reduce((s, i) => s + invTotals(i).total, 0))}</b></div>
            <div class="row between" style="margin-top:8px"><span class="muted">Projects</span><b>${projs.length}</b></div>
            <div class="row between" style="margin-top:8px"><span class="muted">Portal users</span><b>${users.length}</b></div>
          </div>
          ${onboardingCard(id)}
          <div class="card" style="margin-top:20px"><h3>Internal notes</h3>
            <textarea id="clientNotes" rows="5" ${can('clients', 'edit') ? '' : 'disabled'}>${esc(c.notes)}</textarea>
            ${can('clients', 'edit') ? `<button class="btn sm" style="margin-top:10px" data-save-notes="${c.id}">Save notes</button>` : ''}</div>
        </div></div>`);
  });

  /* ---------------- projects ---------------- */
  route('/app/projects', () => {
    if (!can('projects', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const rows = db.projects.map((p) => `<tr>
      <td><b>${esc(p.name)}</b></td><td><a class="linkish" href="#/app/clients/${p.clientId}">${esc(client(p.clientId).name)}</a></td>
      <td>${esc(p.type)}</td><td>${esc(p.owner || '—')}</td><td>${fmtDate(p.deadline)}</td>
      <td><div class="row"><div class="bar" style="flex:1"><i style="width:${p.progress}%"></i></div><span class="muted" style="font-size:.78rem">${p.progress}%</span></div></td>
      <td>${can('projects', 'edit')
        ? `<select data-proj-status="${p.id}" style="padding:6px 8px;font-size:.8rem;width:auto">${['Planning', 'In Progress', 'Review', 'Complete'].map((s) => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`
        : `<span class="pill">${esc(p.status)}</span>`}</td>
      <td class="right">${rowActions('project', p.id)}</td></tr>`).join('');
    return shell([['#/app/projects', 'Projects']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Projects</h1><p>Track delivery from start to finish.</p></div>
        ${can('projects', 'create') ? '<button class="btn" data-new="project">＋ New project</button>' : ''}</div>
      <div class="table-card"><table><thead><tr><th>Project</th><th>Client</th><th>Type</th><th>Owner</th><th>Deadline</th><th>Progress</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="empty">No projects yet.</td></tr>'}</tbody></table></div>`);
  });

  /* ---------------- invoices ---------------- */
  let invFilter = 'All';
  route('/app/invoices', () => {
    if (!can('invoices', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const list = db.invoices.filter((i) => invFilter === 'All' || i.status === invFilter);
    const rows = list.map((i) => `<tr>
      <td><b>${esc(i.number)}</b></td><td><a class="linkish" href="#/app/clients/${i.clientId}">${esc(client(i.clientId).name)}</a></td>
      <td>${fmtDate(i.issueDate)}</td><td>${fmtDate(i.dueDate)}</td><td>${money(invTotals(i).total)}</td>
      <td><span class="pill ${i.status.toLowerCase()}">${i.status}</span></td>
      <td class="right"><button class="btn sm ghost" data-goto="#/app/invoices/${i.id}">Open</button>
      ${can('invoices', 'edit') ? `<button class="btn sm ghost" data-goto="#/app/invoices/new?edit=${i.id}">Edit</button>` : ''}
      ${can('invoices', 'edit') && i.status !== 'Paid' ? `<button class="btn sm" data-mark-paid="${i.id}">Mark paid</button>` : ''}
      ${can('invoices', 'delete') ? `<button class="btn sm ghost danger-text" data-del-invoice="${i.id}">Delete</button>` : ''}</td></tr>`).join('');
    return shell([['#/app/invoices', 'Invoices']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Invoices</h1><p>Create, send and track payments.</p></div>
        ${can('invoices', 'create') ? '<button class="btn" data-goto="#/app/invoices/new">＋ Create invoice</button>' : ''}</div>
      <div class="tabs">${['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map((t) => `<button class="tab ${t === invFilter ? 'on' : ''}" data-inv-filter="${t}">${t}</button>`).join('')}</div>
      <div class="table-card"><table><thead><tr><th>Invoice</th><th>Client</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="empty">Nothing here.</td></tr>'}</tbody></table></div>`);
  });

  let draft = null;
  const newDraft = (clientId) => ({ id: null, number: nextInvoiceNo(), clientId: clientId || (db.clients[0] && db.clients[0].id), issueDate: today(), dueDate: daysFromNow(14), terms: 14, items: [{ desc: '', qty: 1, rate: 0 }], status: 'Draft', notes: 'Thank you for your continued partnership.' });

  route('/app/invoices/new', () => {
    if (!can('invoices', 'create') && !can('invoices', 'edit')) return shell([], '<div class="card empty">No access.</div>');
    const qs = location.hash.split('?')[1] || '';
    const editId = (qs.match(/edit=([^&]+)/) || [])[1];
    const preset = (qs.match(/client=([^&]+)/) || [])[1];
    if (editId) { const src = db.invoices.find((x) => x.id === editId); if (src && (!draft || draft.id !== editId)) draft = JSON.parse(JSON.stringify(src)); }
    if (!draft || (!editId && draft.id)) draft = newDraft(preset);
    const t = invTotals(draft); const editing = !!draft.id;
    return shell([['#/app/invoices', 'Invoices'], ['#', editing ? 'Edit ' + draft.number : 'New invoice']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">${editing ? 'Edit invoice' : 'Create invoice'}</h1><p>Professional billing, made simple.</p></div>
        <button class="btn ghost" data-goto="#/app/invoices">Cancel</button></div>
      <div class="grid cards-2" style="grid-template-columns:1fr 1fr">
        <div class="card pad-lg"><h3>Client information</h3>
          <div class="field" style="margin-top:12px"><label>Client</label>
            <select id="dClient">${db.clients.map((c) => `<option value="${c.id}" ${c.id === draft.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Contact person</label><input value="${esc(client(draft.clientId).person)}" disabled /></div>
          <div class="field"><label>Email</label><input value="${esc(client(draft.clientId).email)}" disabled /></div></div>
        <div class="card pad-lg"><h3>Invoice details</h3>
          <div class="field-row" style="margin-top:12px"><div class="field"><label>Invoice number</label><input id="dNumber" value="${esc(draft.number)}" /></div>
          <div class="field"><label>Issue date</label><input id="dIssue" type="date" value="${draft.issueDate}" /></div></div>
          <div class="field-row"><div class="field"><label>Due date</label><input id="dDue" type="date" value="${draft.dueDate}" /></div>
          <div class="field"><label>Payment terms</label><select id="dTerms">${[7, 14, 30].map((n) => `<option value="${n}" ${n === draft.terms ? 'selected' : ''}>${n} days</option>`).join('')}</select></div></div>
          <div class="field"><label>Status</label><select id="dStatus">${['Draft', 'Sent', 'Paid', 'Overdue'].map((s) => `<option ${s === draft.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
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
          <div class="totals"><div><span class="muted">Subtotal</span><span>${money(t.sub)}</span></div>
            <div><span class="muted">VAT (15%)</span><span>${money(t.vat)}</span></div>
            <div class="grand"><span>Total</span><span>${money(t.total)}</span></div></div></div>
        <div class="row" style="justify-content:flex-end;margin-top:18px">
          <button class="btn ghost" data-save-invoice="Draft">${editing ? 'Save changes' : 'Save draft'}</button>
          <button class="btn" data-save-invoice="Sent">${editing ? 'Save & send' : 'Send to client →'}</button></div>
      </div>`);
  });

  route('/app/invoices/:id', (id) => {
    const i = db.invoices.find((x) => x.id === id);
    if (!i) return shell([['#/app/invoices', 'Invoices']], `<div class="card empty">Invoice not found.</div>`);
    const c = client(i.clientId); const t = invTotals(i); const s = db.settings;
    return shell([['#/app/invoices', 'Invoices'], ['#', i.number]], `
      <div class="page-head noprint"><div></div>
        <div class="row"><button class="btn ghost" onclick="window.print()">Download PDF</button>
        ${can('invoices', 'edit') ? `<button class="btn ghost" data-goto="#/app/invoices/new?edit=${i.id}">Edit</button>` : ''}
        ${can('invoices', 'edit') && i.status !== 'Paid' ? `<button class="btn ghost" data-send="${i.id}">${i.status === 'Draft' ? 'Send to client' : 'Resend'}</button><button class="btn" data-mark-paid="${i.id}">Mark as paid</button>` : ''}
        ${i.status === 'Paid' ? '<span class="pill paid">Paid in full</span>' : ''}
        ${can('invoices', 'delete') ? `<button class="btn ghost danger-text" data-del-invoice="${i.id}">Delete</button>` : ''}</div></div>
      <div class="doc">
        <div class="row between" style="align-items:flex-start">
          <div><h2>Invoice</h2><div class="muted" style="font-size:.85rem">${esc(i.number)}</div></div>
          <div class="right"><div class="brand">${esc(s.agency)}</div><div class="muted" style="font-size:.8rem">${esc(s.email)}<br/>${esc(s.phone)}<br/>${esc(s.address)}</div></div></div>
        <div class="grid cards-2" style="margin-top:28px">
          <div><div class="eyebrow">Billed to</div><b>${esc(c.name)}</b><div class="muted" style="font-size:.86rem">${esc(c.person)}<br/>${esc(c.email)}<br/>${esc(c.phone || '')}</div></div>
          <div class="right"><div class="eyebrow">Details</div><div style="font-size:.88rem">Issue date: ${fmtDate(i.issueDate)}<br/>Due date: ${fmtDate(i.dueDate)}<br/>Terms: Net ${i.terms} days<br/>Status: <span class="pill ${i.status.toLowerCase()}">${i.status}</span></div></div></div>
        <table style="margin-top:26px"><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
        <tbody>${i.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="right">${x.qty}</td><td class="right">${money(x.rate)}</td><td class="right">${money(x.qty * x.rate)}</td></tr>`).join('')}</tbody></table>
        <div class="totals" style="margin-top:18px"><div><span class="muted">Subtotal</span><span>${money(t.sub)}</span></div>
          <div><span class="muted">VAT (15%)</span><span>${money(t.vat)}</span></div>
          <div class="grand"><span>Total due</span><span>${money(t.total)}</span></div></div>
        <p style="margin-top:26px;font-size:.85rem">${esc(i.notes)}</p></div>`);
  });

  /* ---------------- enquiries ---------------- */
  route('/app/enquiries', () => {
    if (!can('enquiries', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const rows = db.enquiries.map((e) => `<tr>
      <td><b>${esc(e.name)}</b><div class="muted" style="font-size:.78rem">${esc(e.email)}</div></td>
      <td>${esc(e.type)}</td><td>${esc(e.budget)}</td><td>${esc(e.message || '—')}</td>
      <td><span class="pill ${e.status === 'New' ? 'sent' : e.status === 'Lost' ? 'overdue' : 'paid'}">${esc(e.status)}</span></td>
      <td>${ago(e.at)}</td>
      <td class="right">${can('clients', 'create') ? `<button class="btn sm" data-convert="${e.id}">Convert</button>` : ''}${rowActions('enquiry', e.id)}</td></tr>`).join('');
    return shell([['#/app/enquiries', 'Enquiries']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Enquiries</h1><p>Every enquiry from the public contact form.</p></div>
        ${can('enquiries', 'create') ? '<button class="btn ghost" data-new="enquiry">＋ Log enquiry</button>' : ''}</div>
      <div class="table-card"><table><thead><tr><th>From</th><th>Type</th><th>Budget</th><th>Message</th><th>Status</th><th>Received</th><th class="right">Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="empty">No enquiries yet — submit the public contact form to see one here.</td></tr>'}</tbody></table></div>`);
  });

  /* ---------------- site content ---------------- */
  let contentTab = 'services';
  route('/app/content', () => {
    if (!can('content', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const s = db.content.site;
    const tabBtn = (k, l) => `<button class="${contentTab === k ? 'on' : ''}" data-ctab="${k}">${l}</button>`;
    let body = '';
    if (contentTab === 'services') {
      body = `<div class="table-card"><table><thead><tr><th>Order</th><th>Service</th><th>Description</th><th>Includes</th><th>From</th><th class="right">Actions</th></tr></thead><tbody>
        ${services().map((x) => `<tr><td>${x.order}</td><td><b>${esc(x.icon)} ${esc(x.name)}</b></td><td>${esc(x.blurb)}</td>
          <td class="muted" style="font-size:.8rem">${x.items.map(esc).join(', ')}</td><td>${money(x.from)}</td>
          <td class="right">${rowActions('service', x.id)}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (contentTab === 'work') {
      body = `<div class="table-card"><table><thead><tr><th>Client</th><th>Service</th><th>Result</th><th>Category</th><th>Published</th><th class="right">Actions</th></tr></thead><tbody>
        ${db.content.work.map((x) => `<tr><td><b>${esc(x.client)}</b></td><td>${esc(x.service)}</td><td>${esc(x.result)}</td><td><span class="pill">${esc(x.tag)}</span></td>
          <td>${x.published ? '<span class="pill paid">Live</span>' : '<span class="pill draft">Hidden</span>'}</td>
          <td class="right">${rowActions('work', x.id)}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (contentTab === 'posts') {
      body = `<div class="table-card"><table><thead><tr><th>Post</th><th>Category</th><th>Author</th><th>Date</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>
        ${db.content.posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((x) => `<tr>
          <td><b>${esc(x.title)}</b><div class="muted" style="font-size:.78rem">/blog/${esc(x.slug || x.id)}</div></td>
          <td><span class="pill">${esc(x.category)}</span></td><td>${esc(x.author)}</td><td>${fmtDate(x.date)}</td>
          <td>${x.published ? '<span class="pill paid">Live</span>' : '<span class="pill draft">Draft</span>'}</td>
          <td class="right">${rowActions('post', x.id)}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (contentTab === 'products') {
      body = `<div class="table-card"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Badge</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>
        ${db.content.products.slice().sort((a, b) => a.order - b.order).map((x) => `<tr><td><b>${esc(x.name)}</b><div class="muted" style="font-size:.78rem">${esc(x.blurb)}</div></td>
          <td><span class="pill">${esc(x.category)}</span></td><td>${money(x.price)}</td><td>${esc(x.badge || '—')}</td>
          <td>${x.published ? '<span class="pill paid">Live</span>' : '<span class="pill draft">Hidden</span>'}</td>
          <td class="right">${rowActions('product', x.id)}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (contentTab === 'plans') {
      body = `<div class="table-card"><table><thead><tr><th>Order</th><th>Plan</th><th>Price</th><th>Features</th><th>Featured</th><th class="right">Actions</th></tr></thead><tbody>
        ${plans().map((x) => `<tr><td>${x.order}</td><td><b>${esc(x.name)}</b><div class="muted" style="font-size:.78rem">${esc(x.blurb)}</div></td><td>${money(x.price)}</td>
          <td class="muted" style="font-size:.8rem">${x.items.length} features</td><td>${x.featured ? '★' : '—'}</td>
          <td class="right">${rowActions('plan', x.id)}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      const f = (k, l, ta) => `<div class="field"><label>${l}</label>${ta ? `<textarea id="site_${k}" rows="3" ${can('content', 'edit') ? '' : 'disabled'}>${esc(s[k])}</textarea>` : `<input id="site_${k}" value="${esc(s[k])}" ${can('content', 'edit') ? '' : 'disabled'} />`}</div>`;
      body = `<div class="card pad-lg" style="max-width:720px">
        ${f('heroEyebrow', 'Hero eyebrow')}${f('heroTitle', 'Hero headline')}${f('heroBody', 'Hero paragraph', true)}
        ${f('aboutTitle', 'About headline')}${f('aboutBody', 'About paragraph', true)}${f('tagline', 'Footer tagline')}
        ${f('heroImage', 'Hero photo URL')}${f('aboutImage', 'About photo URL')}${f('ctaImage', 'CTA banner photo URL')}
        ${can('content', 'edit') ? '<button class="btn" data-save-site>Save site copy</button>' : ''}</div>`;
    }
    if (contentTab === 'plans') contentTab = 'services';
    const newBtn = { services: 'service', work: 'work', posts: 'post', products: 'product' }[contentTab];
    return shell([['#/app/content', 'Site content'], ['#', { services: 'Services', posts: 'Blog posts', work: 'Case studies', products: 'Store products', copy: 'Page copy' }[contentTab]]], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Site content</h1><p>Everything on the public website is editable here — changes go live instantly.</p></div>
        ${newBtn && can('content', 'create') ? `<button class="btn" data-new="${newBtn}">＋ Add ${SCHEMAS[newBtn].title.toLowerCase()}</button>` : ''}</div>
      <div class="tabbar">${tabBtn('services', 'Services')}${tabBtn('posts', 'Blog posts')}${tabBtn('work', 'Case studies')}${tabBtn('products', 'Store products')}${tabBtn('copy', 'Page copy')}</div>
      ${body}`);
  });

  /* ---------------- store orders ---------------- */
  route('/app/orders', () => {
    if (!can('orders', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const rev = db.orders.filter((o) => o.status === 'Paid' || o.status === 'Delivered').reduce((t, o) => t + o.total, 0);
    const rows = db.orders.map((o) => `<tr><td><b>${esc(o.number)}</b><div class="muted" style="font-size:.78rem">${fmtStamp(o.at)}</div></td>
      <td>${esc(o.name)}<div class="muted" style="font-size:.78rem">${esc(o.email)}</div></td>
      <td style="font-size:.84rem">${o.items.map((i) => esc(i.name) + ' × ' + i.qty).join('<br/>')}</td><td>${money(o.total)}</td>
      <td>${can('orders', 'edit') ? `<select data-order-status="${o.id}" style="padding:6px 8px;font-size:.8rem;width:auto">${['Pending', 'Paid', 'Delivered', 'Refunded'].map((st) => `<option ${st === o.status ? 'selected' : ''}>${st}</option>`).join('')}</select>` : `<span class="pill">${esc(o.status)}</span>`}</td>
      <td class="right">${can('orders', 'delete') ? `<button class="btn sm ghost danger-text" data-del-order="${o.id}">Delete</button>` : ''}</td></tr>`).join('');
    return shell([['#/app/orders', 'Store orders']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Store orders</h1><p>${db.orders.length} orders · ${money(rev)} paid revenue.</p></div>
        ${can('content', 'edit') ? '<button class="btn ghost" data-goto="#/app/content" data-ctab-go="products">Manage products</button>' : ''}</div>
      <div class="table-card"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">No orders yet — they appear here the moment someone checks out in the store.</td></tr>'}</tbody></table></div>`);
  });

  /* ---------------- users & roles ---------------- */
  route('/app/users', () => {
    if (!can('users', 'view')) return shell([], '<div class="card empty">Only administrators can manage users.</div>');
    const rows = db.users.map((u) => {
      const editable = outranks(u.role) || u.id === (db.session && db.session.uid);
      let acts = '';
      if (can('users', 'edit') && editable) acts += `<button class="btn sm ghost" data-edit="user:${u.id}">Edit</button>`;
      if (can('users', 'delete') && outranks(u.role)) acts += `<button class="btn sm ghost danger-text" data-delete="user:${u.id}">Delete</button>`;
      return `<tr><td><div class="row" style="gap:10px"><span class="avatar">${initials(u.name)}</span><b>${esc(u.name)}</b></div></td>
        <td>${esc(u.email)}</td><td><span class="pill ${u.role === 'superadmin' ? 'sent' : ''}">${esc(ROLES[u.role].label)}</span></td>
        <td>${u.clientId ? esc(client(u.clientId).name) : '—'}</td>
        <td><span class="pill ${u.status === 'Active' ? 'paid' : 'overdue'}">${esc(u.status)}</span></td>
        <td class="right">${acts || '<span class="muted" style="font-size:.78rem">Protected</span>'}</td></tr>`;
    }).join('');
    const matrix = Object.keys(PERMS).map((res) => `<tr><td><b>${res}</b></td>${Object.keys(ROLES).map((r) => {
      const rule = PERMS[res][r];
      return `<td>${rule === '*' ? '<span class="pill paid">full</span>' : rule ? `<span class="pill">${esc(rule.replace(/,/g, ' · '))}</span>` : '<span class="muted">—</span>'}</td>`;
    }).join('')}</tr>`).join('');
    return shell([['#/app/users', 'Users & roles']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Users & roles</h1><p>You can only edit accounts below your own role level.</p></div>
        ${can('users', 'create') ? '<button class="btn" data-new="user">＋ Add user</button>' : ''}</div>
      <div class="table-card"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Linked client</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <h3 style="margin:28px 0 12px">Permission matrix</h3>
      <div class="table-card"><table><thead><tr><th>Resource</th>${Object.keys(ROLES).map((r) => `<th>${ROLES[r].label}</th>`).join('')}</tr></thead>
      <tbody>${matrix}</tbody></table></div>`);
  });

  /* ---------------- audit log ---------------- */
  route('/app/audit', () => {
    if (!can('audit', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const rows = db.audit.map((a) => `<tr><td>${fmtStamp(a.at)}</td><td>${esc(a.who)}<div class="muted" style="font-size:.78rem">${esc(ROLES[a.role] ? ROLES[a.role].label : a.role)}</div></td>
      <td><span class="pill ${a.action === 'deleted' ? 'overdue' : a.action === 'created' ? 'paid' : 'sent'}">${esc(a.action)}</span></td>
      <td>${esc(a.entity)}</td><td>${esc(a.label)}</td><td class="muted">${esc(a.detail)}</td></tr>`).join('');
    return shell([['#/app/audit', 'Audit log']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Audit log</h1><p>Every create, edit and delete across the workspace — ${db.audit.length} entries.</p></div>
        ${can('audit', 'delete') ? '<button class="btn ghost danger-text" data-clear-audit>Clear log</button>' : ''}</div>
      <div class="table-card"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Type</th><th>Record</th><th>Detail</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">Nothing logged yet.</td></tr>'}</tbody></table></div>`);
  });

  /* ---------------- settings ---------------- */
  route('/app/settings', () => {
    if (!can('settings', 'view')) return shell([], '<div class="card empty">No access.</div>');
    const s = db.settings; const ro = can('settings', 'edit') ? '' : 'disabled';
    return shell([['#/app/settings', 'Settings']], `
      <div class="page-head"><div><h1 style="font-size:2.2rem">Settings</h1><p>Agency details used across invoices, the site and the portal.</p></div></div>
      <div class="card pad-lg" style="max-width:640px">
        <div class="field-row"><div class="field"><label>Agency name</label><input id="sAgency" value="${esc(s.agency)}" ${ro} /></div>
        <div class="field"><label>Owner</label><input id="sOwner" value="${esc(s.owner)}" ${ro} /></div></div>
        <div class="field-row"><div class="field"><label>Email</label><input id="sEmail" value="${esc(s.email)}" ${ro} /></div>
        <div class="field"><label>Phone</label><input id="sPhone" value="${esc(s.phone)}" ${ro} /></div></div>
        <div class="field"><label>Address</label><input id="sAddress" value="${esc(s.address)}" ${ro} /></div>
        ${can('settings', 'edit') ? '<button class="btn" data-save-settings>Save changes</button>' : ''}</div>
      ${role() === 'superadmin' ? `<div class="card pad-lg" style="max-width:640px;margin-top:20px"><h3>Danger zone</h3>
        <p style="font-size:.9rem">Reset the entire workspace back to seeded demo data. Super Admin only.</p>
        <button class="btn ghost danger-text" data-reset>Reset all data</button></div>` : ''}`);
  });

  /* ---------------- client portal ---------------- */
  route('/portal', () => {
    const s = db.session;
    const c = db.clients.find((x) => x.id === s.clientId) || db.clients[0];
    const invs = db.invoices.filter((i) => i.clientId === c.id);
    const projs = db.projects.filter((p) => p.clientId === c.id);
    const open = invs.find((i) => i.status !== 'Paid');
    return `<div style="max-width:560px;margin:0 auto;padding:24px;min-height:100vh;background:var(--paper)">
      <div class="row between"><a href="#/" class="brand">${esc(db.settings.agency)}<small>Client Portal</small></a>
        <div class="row"><div class="avatar">${initials(c.name)}</div><a class="linkish" href="#/login" data-signout>Sign out</a></div></div>
      <nav class="crumbs" style="margin-top:14px"><a href="#/">Home</a><span class="sep">/</span><span>Client portal</span></nav>
      <h1 style="font-size:2rem;margin:18px 0 4px">Welcome, ${esc((c.person || '').split(' ')[0])}.</h1>
      <p>Here's the latest on your projects with ${esc(db.settings.agency)}.</p>
      ${c.status === 'Onboarding' ? `<div class="card pad-lg" style="margin-top:20px;border-color:var(--green-600)">
        <span class="pill sent">Onboarding</span>
        <h3 style="margin:10px 0 4px">Quote requested. Here's what happens next.</h3>
        <ol class="steps" style="margin-top:8px">
          <li><b>1 · We review your brief</b><span>Within one business day, by ${esc(db.settings.owner)}.</span></li>
          <li><b>2 · Discovery call</b><span>A 30-minute call to confirm scope, budget and timing.</span></li>
          <li><b>3 · Your tailored quote</b><span>Your proposal lands right here in your portal.</span></li>
        </ol>
        <a class="btn block" style="margin-top:14px" href="#/contact">Ask us a question</a></div>` : ''}
      ${open ? `<div class="card pad-lg" style="margin-top:20px">
        <div class="row between"><div class="muted" style="font-size:.8rem">Invoice ${esc(open.number)}</div><span class="pill ${open.status.toLowerCase()}">${open.status}</span></div>
        <div class="price" style="font-size:2.2rem">${money(invTotals(open).total)}</div>
        <div class="muted" style="font-size:.85rem">Due ${fmtDate(open.dueDate)}</div>
        <ul class="activity" style="margin-top:12px">${open.items.map((x) => `<li><span>${esc(x.desc)}</span><span class="when">${money(x.qty * x.rate)}</span></li>`).join('')}</ul>
        <button class="btn block" style="margin-top:14px" data-pay="${open.id}">Pay invoice</button></div>`
      : '<div class="card" style="margin-top:20px"><h3>All settled 🎉</h3><p>No outstanding invoices.</p></div>'}
      <div class="card" style="margin-top:20px"><h3>Your projects</h3>
        <ul class="activity">${projs.map((p) => `<li><div><div>${esc(p.name)}</div><div class="muted" style="font-size:.78rem">Due ${fmtDate(p.deadline)}</div></div>
          <span class="when"><span class="pill">${esc(p.status)}</span> ${p.progress}%</span></li>`).join('') || '<li class="muted">No active projects.</li>'}</ul></div>
      <div class="card" style="margin-top:20px"><h3>Invoice history</h3>
        <ul class="activity">${invs.map((i) => `<li><span>${esc(i.number)} · ${fmtDate(i.issueDate)}</span><span class="when">${money(invTotals(i).total)} <span class="pill ${i.status.toLowerCase()}">${i.status}</span></span></li>`).join('')}</ul></div>
      <p class="muted center" style="font-size:.78rem;margin:28px 0">${esc(db.content.site.tagline)}</p></div>`;
  });

  /* ---------------- generic entity form ---------------- */
  function fieldHtml(f, val) {
    const id = 'f_' + f.k;
    const opts = typeof f.opts === 'function' ? f.opts() : f.opts;
    const norm = (o) => (typeof o === 'object' ? o : { v: o, l: o });
    let input;
    if (f.t === 'select') input = `<select id="${id}">${(opts || []).map(norm).map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    else if (f.t === 'textarea') input = `<textarea id="${id}" rows="3">${esc(val)}</textarea>`;
    else if (f.t === 'lines') input = `<textarea id="${id}" rows="4">${esc((val || []).join('\n'))}</textarea>`;
    else if (f.t === 'checkbox') input = `<label class="row" style="gap:8px;font-weight:400"><input type="checkbox" id="${id}" style="width:auto" ${val ? 'checked' : ''} /> Yes</label>`;
    else input = `<input id="${id}" type="${f.t || 'text'}" value="${esc(val)}" ${f.req ? 'required' : ''} />`;
    return `<div class="field ${f.full ? 'full' : ''}">${f.t === 'checkbox' ? `<label>${esc(f.l)}</label>` : `<label for="${id}">${esc(f.l)}</label>`}${input}</div>`;
  }

  function openForm(entity, id, preset) {
    const sc = SCHEMAS[entity];
    const editing = !!id;
    if (!can(sc.resource, editing ? 'edit' : 'create')) return deny();
    const rec = editing ? findIn(entity, id) : {};
    if (editing && !rec) return;
    const val = (f) => {
      if (editing) return rec[f.k];
      if (preset && preset[f.k] !== undefined) return preset[f.k];
      return typeof f.def === 'function' ? f.def() : f.t === 'checkbox' ? false : f.t === 'lines' ? [] : '';
    };
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg"><form class="modal" id="entityForm" data-entity="${entity}" data-id="${editing ? id : ''}">
      <h3>${editing ? 'Edit' : 'New'} ${sc.title.toLowerCase()}</h3>
      <p style="font-size:.86rem">${editing ? 'Update this record. The change is written to the audit log.' : 'Create a new record.'}</p>
      <div class="form-grid" style="margin-top:14px">${sc.fields.map((f) => fieldHtml(f, val(f))).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:16px">
        <button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">${editing ? 'Save changes' : 'Create'}</button></div>
    </form></div>`);
    const first = $('.modal input, .modal select'); if (first) first.focus();
  }
  function closeDrawers() {
    ['pubnav', 'appnav'].forEach((k) => { const n = el(k); if (n) n.classList.remove('open'); });
    const sc = document.querySelector('.scrim'); if (sc) sc.remove();
  }

  const closeModal = () => { const m = $('.modal-bg'); if (m) m.remove(); };

  function readForm(entity) {
    const out = {};
    SCHEMAS[entity].fields.forEach((f) => {
      const n = el('f_' + f.k); if (!n) return;
      if (f.t === 'checkbox') out[f.k] = n.checked;
      else if (f.t === 'lines') out[f.k] = n.value.split('\n').map((x) => x.trim()).filter(Boolean);
      else if (f.t === 'number') out[f.k] = Number(n.value || 0);
      else out[f.k] = n.value.trim();
    });
    return out;
  }

  function removeRecord(entity, id) {
    const sc = SCHEMAS[entity];
    const list = sc.list();
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const label = sc.labelOf(list[idx]);
    list.splice(idx, 1);
    if (entity === 'client') {
      db.projects = db.projects.filter((p) => p.clientId !== id);
      db.invoices = db.invoices.filter((i) => i.clientId !== id);
      db.users.forEach((u) => { if (u.clientId === id) u.clientId = ''; });
    }
    audit('deleted', sc.title, label);
    log(sc.title + ' ' + label + ' deleted');
    save(); toast(sc.title + ' deleted.'); render();
  }

  /* ---------------- events ---------------- */
  function bind() {
    const tabs = el('workTabs');
    if (tabs) tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]'); if (!b) return;
      [...tabs.children].forEach((x) => x.classList.toggle('on', x === b));
      const f = b.dataset.filter;
      el('workGrid').innerHTML = works().filter((w) => f === 'All' || w.tag === f).map(workCard).join('');
    });

    const enq = el('enqForm');
    if (enq) enq.addEventListener('submit', (e) => {
      e.preventDefault();
      const rec = { id: uid('e'), name: el('eName').value.trim(), email: el('eEmail').value.trim(), type: el('eType').value, budget: el('eBudget').value, message: el('eMsg').value.trim(), status: 'New', at: Date.now() };
      db.enquiries.unshift(rec); log('New client enquiry from ' + rec.name);
      if (liveAuth()) window.SHAI.submit.enquiry(rec).catch((err) => console.warn('[shai] enquiry not saved remotely', err.message));
      db.audit.unshift({ id: uid('a'), at: Date.now(), who: rec.name, role: 'client', action: 'created', entity: 'Enquiry', label: rec.name, detail: 'via public contact form' });
      save(); enq.reset(); toast('Thanks ' + rec.name.split(' ')[0] + " — we'll be in touch within 1–2 business days.");
    });

    const lf = el('loginForm');
    if (lf && liveAuth()) lf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = el('lEmail').value.trim().toLowerCase(), pass = el('lPass').value;
      el('loginErr').textContent = '';
      try { await window.SHAI.auth.signIn(email, pass); await adoptSupabaseSession(); }
      catch (err) { el('loginErr').textContent = err.message || 'Could not sign in.'; }
    });
    if (lf && !liveAuth()) lf.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = el('lEmail').value.trim().toLowerCase();
      const u = db.users.find((x) => x.email.toLowerCase() === email);
      if (!u || u.password !== el('lPass').value) { el('loginErr').textContent = 'Those credentials do not match an account.'; return; }
      if (u.status !== 'Active') { el('loginErr').textContent = 'This account is suspended.'; return; }
      signIn(u);
    });

    const wf = el('wizForm');
    if (wf) {
      wf.addEventListener('input', (e) => {
        const n = e.target.closest('[data-wiz]'); if (!n) return;
        wiz.data[n.dataset.wiz] = n.type === 'checkbox' ? n.checked : n.value; saveWiz();
      });
      wf.addEventListener('change', (e) => {
        const n = e.target.closest('[data-wiz]'); if (!n) return;
        wiz.data[n.dataset.wiz] = n.type === 'checkbox' ? n.checked : n.value; saveWiz();
      });
      wf.addEventListener('submit', (e) => {
        e.preventDefault();
        const errs = wizErrors(wiz.step);
        if (errs.length) { wiz.showErrors = true; saveWiz(); render(); return; }
        wiz.showErrors = false;
        if (wiz.step === WIZ_STEPS.length - 1) { submitWizard(); return; }
        wiz.step++; saveWiz(); render();
      });
    }

    const ss = el('storeSearch');
    if (ss) ss.addEventListener('input', () => {
      storeQuery = ss.value; const pos = ss.selectionStart; render();
      const n = el('storeSearch'); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
    });
    const co = el('checkoutForm');
    if (co) co.addEventListener('submit', (e) => {
      e.preventDefault();
      const lines = cartLines(); if (!lines.length) return;
      const n = db.orders.reduce((m, o) => Math.max(m, parseInt(String(o.number).replace(/\D/g, ''), 10) || 0), 1000) + 1;
      const o = { id: uid('o'), number: 'SH-' + n, name: el('coName').value.trim(), email: el('coEmail').value.trim(),
        items: lines.map((x) => ({ id: x.id, name: x.p.name, price: x.p.price, qty: x.qty })), total: cartTotal(), status: 'Pending', at: Date.now() };
      db.orders.unshift(o);
      if (liveAuth()) window.SHAI.submit.order(o).catch((err) => console.warn('[shai] order not saved remotely', err.message));
      db.audit.unshift({ id: uid('a'), at: Date.now(), who: o.name, role: 'client', action: 'created', entity: 'Order', label: o.number, detail: money(o.total) + ' via store' });
      log('Store order ' + o.number + ' from ' + o.name); save(); setCart([]);
      el('app').innerHTML = page(`<section class="band"><div class="wrap" style="max-width:640px"><div class="card pad-lg center">
        <div class="icon" style="margin:0 auto 14px">✓</div><h2>Order ${esc(o.number)} received.</h2>
        <p>Thanks, ${esc(o.name.split(' ')[0])} — a payment link and your downloads are on their way to <b>${esc(o.email)}</b>.</p>
        <div class="row" style="justify-content:center;margin-top:18px;flex-wrap:wrap"><a class="btn" href="#/store">Keep browsing</a><a class="btn ghost" href="#/quote">Need more than a template? Get a quote</a></div>
      </div></div></section>`);
      window.scrollTo(0, 0);
    });

    if (liveAuth()) {
      $('[data-oauth]').forEach((b) => b.addEventListener('click', async () => {
        try { await window.SHAI.auth.oauth(b.dataset.oauth); }
        catch (err) { el('loginErr').textContent = err.message; }
      }));
      const mg = $('[data-magic]');
      if (mg) mg.addEventListener('click', async () => {
        const email = el('lEmail').value.trim();
        if (!email) { el('loginErr').textContent = 'Enter your email address first.'; return; }
        try { await window.SHAI.auth.magicLink(email); toast('Sign-in link sent to ' + email); }
        catch (err) { el('loginErr').textContent = err.message; }
      });
      const rp = $('[data-reset-pw]');
      if (rp) rp.addEventListener('click', async () => {
        const email = el('lEmail').value.trim();
        if (!email) { el('loginErr').textContent = 'Enter your email address first.'; return; }
        try { await window.SHAI.auth.resetPassword(email); toast('Password reset link sent.'); }
        catch (err) { el('loginErr').textContent = err.message; }
      });
    }

    const dc = el('dClient');
    if (dc) dc.addEventListener('change', () => { syncDraft(); render(); });
    ['dNumber', 'dIssue', 'dDue', 'dTerms', 'dNotes', 'dStatus'].forEach((k) => { const n = el(k); if (n) n.addEventListener('change', syncDraft); });
    $$('[data-item]').forEach((inp) => inp.addEventListener('change', () => { syncDraft(); render(); }));
  }

  // turn a Supabase profile row into the session the workspace already understands
  async function adoptSupabaseSession() {
    const S = window.SHAI;
    if (!S || !S.enabled || !S.user) return false;
    if (!S.profile) { await new Promise((r) => setTimeout(r, 400)); }
    const p = S.profile || { name: S.user.email, role: 'client', client_id: null };
    db.session = { uid: S.user.id, name: p.name, role: p.role, email: p.email || S.user.email, clientId: p.client_id || null, live: true };
    save();
    go(p.role === 'client' ? '#/portal' : '#/app');
    render();
    return true;
  }
  window.addEventListener('DOMContentLoaded', () => {
    if (window.SHAI && window.SHAI.ready) {
      window.SHAI.ready.then(async () => {
        if (window.SHAI.enabled) { await syncContentFromDb(); if (window.SHAI.user) await adoptSupabaseSession(); else render(); }
      });
    }
  });
  document.addEventListener('shai:auth', () => { if (window.SHAI.user) adoptSupabaseSession(); });

  // live site content replaces the seeded demo content when the database is reachable
  async function syncContentFromDb() {
    try {
      const c = await window.SHAI.content();
      if (!c) return;
      if (c.services.length) db.content.services = c.services.map((x) => ({ ...x, items: x.items || [] }));
      if (c.work.length) db.content.work = c.work;
      if (c.posts.length) db.content.posts = c.posts;
      if (c.products.length) db.content.products = c.products;
      if (Object.keys(c.site).length) Object.assign(db.content.site, c.site);
      render();
    } catch (e) { console.warn('[shai] content sync failed', e.message); }
  }

  function signIn(u) {
    db.session = { uid: u.id, name: u.name, role: u.role, email: u.email, clientId: u.clientId || null };
    audit('signed in', 'Session', u.name, ROLES[u.role].label);
    save(); go(u.role === 'client' ? '#/portal' : '#/app');
    if (location.hash === '#/portal' || location.hash === '#/app') render();
  }

  function syncDraft() {
    if (!draft) return;
    const v = (i) => (el(i) ? el(i).value : undefined);
    if (el('dNumber')) draft.number = v('dNumber');
    if (el('dIssue')) draft.issueDate = v('dIssue');
    if (el('dDue')) draft.dueDate = v('dDue');
    if (el('dTerms')) draft.terms = Number(v('dTerms'));
    if (el('dNotes')) draft.notes = v('dNotes');
    if (el('dStatus')) draft.status = v('dStatus');
    if (el('dClient')) draft.clientId = v('dClient');
    $$('[data-item]').forEach((inp) => {
      const n = Number(inp.dataset.i), f = inp.dataset.item;
      if (!draft.items[n]) return;
      draft.items[n][f] = f === 'desc' ? inp.value : Number(inp.value || 0);
    });
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const hit = (attr) => { const n = t.closest('[' + attr + ']'); return n ? n.getAttribute(attr) : null; };

    const chip = hit('data-chip');
    if (chip) {
      const [k, v] = chip.split(':'); const arr = wiz.data[k];
      const i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else arr.push(v);
      saveWiz(); render(); return;
    }
    if (t.closest('[data-wiz-back]')) { if (wiz.step > 0) { wiz.step--; wiz.showErrors = false; saveWiz(); render(); } return; }

    if (t.classList.contains('scrim')) { closeDrawers(); return; }
    const addc = hit('data-add-cart');
    if (addc) {
      const c = getCart(); const x = c.find((i) => i.id === addc);
      if (x) x.qty++; else c.push({ id: addc, qty: 1 });
      setCart(c); const p = db.content.products.find((i) => i.id === addc);
      toast((p ? p.name : 'Item') + ' added to cart.');
      $$('.cart-count').forEach((n) => (n.textContent = cartCount())); return;
    }
    const cq = hit('data-cart-qty');
    if (cq) {
      const [pid, d] = cq.split(':'); let c = getCart(); const x = c.find((i) => i.id === pid);
      if (x) { x.qty += Number(d); if (x.qty <= 0) c = c.filter((i) => i.id !== pid); }
      setCart(c); render(); return;
    }
    const sf = hit('data-store-filter');
    if (sf) { storeFilter = sf; render(); return; }
    const delo = hit('data-del-order');
    if (delo) {
      if (!can('orders', 'delete')) return deny();
      const o = db.orders.find((x) => x.id === delo);
      if (!confirm('Delete order ' + o.number + '?')) return;
      db.orders = db.orders.filter((x) => x.id !== delo); audit('deleted', 'Order', o.number); save(); render(); return;
    }
    const ctg = hit('data-ctab-go');
    if (ctg) contentTab = ctg;

    const toggle = hit('data-toggle');
    if (toggle) {
      const n = el(toggle); const opening = !n.classList.contains('open');
      closeDrawers();
      if (opening) {
        n.classList.add('open');
        if (toggle === 'appnav') document.body.insertAdjacentHTML('beforeend', '<div class="scrim"></div>');
      }
      return;
    }

    const demo = hit('data-demo');
    if (demo) { const u = db.users.find((x) => x.id === demo); if (u) signIn(u); return; }

    if (t.closest('[data-signout]')) {
      audit('signed out', 'Session', (db.session || {}).name || '');
      if (liveAuth()) window.SHAI.auth.signOut();
      db.session = null; save(); toast('Signed out.'); return;
    }

    const goto = hit('data-goto');
    if (goto) { go(goto); return; }

    const neu = hit('data-new');
    if (neu) {
      const ps = hit('data-preset'); const preset = {};
      if (ps) { const [k, v] = ps.split(':'); preset[k] = v; }
      openForm(neu, null, preset); return;
    }
    const edit = hit('data-edit');
    if (edit) { const [en, id] = edit.split(':'); openForm(en, id); return; }
    const del = hit('data-delete');
    if (del) {
      const [en, id] = del.split(':'); const sc = SCHEMAS[en];
      if (!can(sc.resource, 'delete')) return deny();
      const rec = findIn(en, id); if (!rec) return;
      if (en === 'user' && !outranks(rec.role)) return deny();
      if (!confirm('Delete ' + sc.title.toLowerCase() + ' "' + sc.labelOf(rec) + '"?' + (en === 'client' ? '\n\nLinked projects and invoices will also be removed.' : ''))) return;
      removeRecord(en, id); return;
    }

    if (t.closest('[data-close]') || t.classList.contains('modal-bg')) { closeModal(); return; }

    const ctab = hit('data-ctab');
    if (ctab) { contentTab = ctab; render(); return; }
    const f = hit('data-inv-filter');
    if (f) { invFilter = f; render(); return; }

    if (t.closest('[data-add-item]')) { syncDraft(); draft.items.push({ desc: '', qty: 1, rate: 0 }); render(); return; }
    const rm = hit('data-rm-item');
    if (rm !== null) {
      syncDraft(); draft.items.splice(Number(rm), 1);
      if (!draft.items.length) draft.items.push({ desc: '', qty: 1, rate: 0 });
      render(); return;
    }

    const saveInv = hit('data-save-invoice');
    if (saveInv) {
      syncDraft();
      if (!draft.items.some((i) => i.desc.trim())) { toast('Add at least one line item first.'); return; }
      if (draft.id) {
        if (!can('invoices', 'edit')) return deny();
        const rec = db.invoices.find((x) => x.id === draft.id);
        Object.assign(rec, draft, { status: saveInv === 'Sent' ? 'Sent' : draft.status });
        audit('updated', 'Invoice', rec.number, client(rec.clientId).name);
        log('Invoice ' + rec.number + ' updated');
        const rid = rec.id; draft = null; save(); toast('Invoice updated.'); go('#/app/invoices/' + rid); return;
      }
      if (!can('invoices', 'create')) return deny();
      const rec = Object.assign({}, draft, { id: uid('i'), status: saveInv, createdAt: Date.now() });
      db.invoices.unshift(rec);
      audit('created', 'Invoice', rec.number, client(rec.clientId).name + ' · ' + money(invTotals(rec).total));
      log('Invoice ' + rec.number + (saveInv === 'Sent' ? ' sent to ' : ' drafted for ') + client(rec.clientId).name);
      draft = null; save(); toast(saveInv === 'Sent' ? 'Invoice sent.' : 'Draft saved.'); go('#/app/invoices/' + rec.id); return;
    }

    const paid = hit('data-mark-paid');
    if (paid) {
      if (!can('invoices', 'edit')) return deny();
      const i = db.invoices.find((x) => x.id === paid); i.status = 'Paid';
      audit('updated', 'Invoice', i.number, 'marked paid'); log('Payment received from ' + client(i.clientId).name);
      save(); toast('Marked as paid.'); render(); return;
    }
    const send = hit('data-send');
    if (send) {
      if (!can('invoices', 'edit')) return deny();
      const i = db.invoices.find((x) => x.id === send); i.status = 'Sent';
      audit('updated', 'Invoice', i.number, 'sent to client'); log('Invoice ' + i.number + ' sent to ' + client(i.clientId).name);
      save(); toast('Invoice sent.'); render(); return;
    }
    const pay = hit('data-pay');
    if (pay) {
      const i = db.invoices.find((x) => x.id === pay); i.status = 'Paid';
      audit('updated', 'Invoice', i.number, 'paid via client portal'); log('Payment received from ' + client(i.clientId).name);
      save(); toast('Payment successful. Thank you!'); render(); return;
    }
    const delInv = hit('data-del-invoice');
    if (delInv) {
      if (!can('invoices', 'delete')) return deny();
      const i = db.invoices.find((x) => x.id === delInv);
      if (!confirm('Delete invoice ' + i.number + '? This cannot be undone.')) return;
      db.invoices = db.invoices.filter((x) => x.id !== delInv);
      audit('deleted', 'Invoice', i.number, client(i.clientId).name); save(); toast('Invoice deleted.'); go('#/app/invoices'); render(); return;
    }

    const notes = hit('data-save-notes');
    if (notes) {
      if (!can('clients', 'edit')) return deny();
      const c = db.clients.find((x) => x.id === notes); c.notes = el('clientNotes').value;
      audit('updated', 'Client', c.name, 'notes'); save(); toast('Notes saved.'); return;
    }
    if (t.closest('[data-save-settings]')) {
      if (!can('settings', 'edit')) return deny();
      const s = db.settings;
      s.agency = el('sAgency').value; s.owner = el('sOwner').value; s.email = el('sEmail').value;
      s.phone = el('sPhone').value; s.address = el('sAddress').value;
      audit('updated', 'Settings', s.agency); save(); toast('Settings saved.'); render(); return;
    }
    if (t.closest('[data-save-site]')) {
      if (!can('content', 'edit')) return deny();
      Object.keys(db.content.site).forEach((k) => { const n = el('site_' + k); if (n) db.content.site[k] = n.value; });
      audit('updated', 'Site copy', 'Public pages'); save(); toast('Site copy updated — the public pages now show it.'); render(); return;
    }
    if (t.closest('[data-clear-audit]')) {
      if (!can('audit', 'delete')) return deny();
      if (!confirm('Clear the entire audit log?')) return;
      db.audit = []; audit('cleared', 'Audit log', 'all entries'); save(); render(); return;
    }
    if (t.closest('[data-reset]')) {
      if (role() !== 'superadmin') return deny();
      if (!confirm('Reset ALL workspace data back to the demo seed?')) return;
      const sess = db.session; db = seed(); db.session = sess; audit('reset', 'Workspace', 'demo data'); save(); toast('Workspace reset.'); go('#/app'); render(); return;
    }

    const conv = hit('data-convert');
    if (conv) {
      if (!can('clients', 'create')) return deny();
      const q = db.enquiries.find((x) => x.id === conv);
      const c = { id: uid('c'), name: q.name, person: q.name, email: q.email, phone: '', service: q.type, status: 'Active', notes: q.message, createdAt: Date.now() };
      db.clients.unshift(c); q.status = 'Qualified';
      audit('created', 'Client', c.name, 'converted from enquiry');
      log('Enquiry from ' + q.name + ' converted to client'); save(); toast('Client created.'); go('#/app/clients/' + c.id); return;
    }
  });

  document.addEventListener('change', (e) => {
    const os = e.target.closest('[data-order-status]');
    if (os) {
      if (!can('orders', 'edit')) { deny(); render(); return; }
      const o = db.orders.find((x) => x.id === os.getAttribute('data-order-status'));
      o.status = os.value; audit('updated', 'Order', o.number, 'status → ' + o.status); save(); render(); return;
    }
    const sel = e.target.closest('[data-proj-status]');
    if (sel) {
      if (!can('projects', 'edit')) { deny(); render(); return; }
      const p = db.projects.find((x) => x.id === sel.getAttribute('data-proj-status'));
      p.status = sel.value;
      p.progress = { Planning: 10, 'In Progress': 55, Review: 85, Complete: 100 }[sel.value] || p.progress;
      audit('updated', 'Project', p.name, 'status → ' + p.status);
      log('Project ' + p.name + ' moved to ' + p.status); save(); render();
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('#entityForm');
    if (!form) return;
    e.preventDefault();
    const entity = form.dataset.entity, id = form.dataset.id;
    const sc = SCHEMAS[entity];
    const data = readForm(entity);
    const req = sc.fields.filter((f) => f.req).find((f) => !String(data[f.k] || '').trim());
    if (req) { toast(req.l + ' is required.'); return; }
    if (entity === 'user') {
      if (data.role && !outranks(data.role) && ROLES[data.role].rank >= ROLES[role()].rank) { deny(); return; }
      const clash = db.users.find((u) => u.email.toLowerCase() === String(data.email).toLowerCase() && u.id !== id);
      if (clash) { toast('That email already belongs to another user.'); return; }
    }
    if (id) {
      if (!can(sc.resource, 'edit')) return deny();
      const rec = findIn(entity, id);
      const changed = Object.keys(data).filter((k) => JSON.stringify(rec[k]) !== JSON.stringify(data[k]));
      Object.assign(rec, data);
      audit('updated', sc.title, sc.labelOf(rec), changed.length ? 'fields: ' + changed.join(', ') : 'no changes');
      log(sc.title + ' ' + sc.labelOf(rec) + ' updated');
      if (entity === 'user' && db.session && db.session.uid === id) { db.session.name = rec.name; db.session.role = rec.role; }
    } else {
      if (!can(sc.resource, 'create')) return deny();
      const rec = Object.assign({ id: uid(entity[0]), createdAt: Date.now() }, data);
      if (entity === 'enquiry') rec.at = Date.now();
      sc.list().unshift(rec);
      audit('created', sc.title, sc.labelOf(rec));
      log(sc.title + ' ' + sc.labelOf(rec) + ' created');
    }
    save(); closeModal(); toast('Saved.'); render();
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawers(); } });

  render();
})();
