/* Shai Studios — Supabase connection layer.
   Loaded before app.js. When config.js holds a URL + publishable key this file
   connects to shaistudiodb; otherwise the app runs exactly as before on
   localStorage, so the site never breaks because the database is unreachable.

   Exposes window.SHAI:
     .ready          — promise that resolves once auth state is known
     .enabled        — true when Supabase is configured and reachable
     .client         — the supabase-js client (null when disabled)
     .auth           — signIn/signUp/signOut/oauth/magicLink helpers
     .user, .profile — current session user and their role row
     .content()      — site content (services, work, posts, products, copy)
     .submit         — enquiry / quote / order writers (public, RLS-guarded)
*/
(function () {
  'use strict';

  const CFG = window.SHAI_CONFIG || {};
  const SHAI = {
    enabled: false, client: null, user: null, profile: null,
    error: null, ready: null
  };
  window.SHAI = SHAI;

  // supabase-js v2 from the CDN, loaded only when configured
  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load supabase-js'));
      document.head.appendChild(s);
    });
  }

  SHAI.ready = (async function init() {
    if (!CFG.url || !CFG.key) { SHAI.error = 'not-configured'; return SHAI; }
    try {
      await loadSdk();
      SHAI.client = window.supabase.createClient(CFG.url, CFG.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data } = await SHAI.client.auth.getSession();
      SHAI.user = (data && data.session && data.session.user) || null;
      if (SHAI.user) await loadProfile();
      SHAI.client.auth.onAuthStateChange(async (_e, session) => {
        SHAI.user = (session && session.user) || null;
        SHAI.profile = null;
        if (SHAI.user) await loadProfile();
        document.dispatchEvent(new CustomEvent('shai:auth', { detail: { user: SHAI.user, profile: SHAI.profile } }));
      });
      SHAI.enabled = true;
    } catch (e) {
      SHAI.error = e.message;
      console.warn('[shai] Supabase unavailable, falling back to local data:', e.message);
    }
    return SHAI;
  })();

  async function loadProfile() {
    const { data, error } = await SHAI.client.from('profiles').select('*').eq('id', SHAI.user.id).single();
    if (!error) SHAI.profile = data;
  }

  const redirect = () => location.origin + location.pathname;

  SHAI.auth = {
    // email + password, matching how the app signs in today
    async signIn(email, password) {
      const { data, error } = await SHAI.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signUp(email, password, meta) {
      const { data, error } = await SHAI.client.auth.signUp({
        email, password, options: { data: meta || {}, emailRedirectTo: redirect() }
      });
      if (error) throw error;
      return data;
    },
    // one-time sign-in link, no password
    async magicLink(email) {
      const { error } = await SHAI.client.auth.signInWithOtp({
        email, options: { emailRedirectTo: redirect() }
      });
      if (error) throw error;
    },
    // 'google' | 'github'
    async oauth(provider) {
      const { error } = await SHAI.client.auth.signInWithOAuth({
        provider, options: { redirectTo: redirect() }
      });
      if (error) throw error;
    },
    async signOut() { await SHAI.client.auth.signOut(); },
    async resetPassword(email) {
      const { error } = await SHAI.client.auth.resetPasswordForEmail(email, { redirectTo: redirect() });
      if (error) throw error;
    }
  };

  // ------------------------------------------------------------ site content
  SHAI.content = async function () {
    if (!SHAI.enabled) return null;
    const [services, work, posts, products, copy] = await Promise.all([
      SHAI.client.from('services').select('*').order('sort_order'),
      SHAI.client.from('work').select('*').eq('published', true),
      SHAI.client.from('posts').select('*').eq('published', true).order('date', { ascending: false }),
      SHAI.client.from('products').select('*').eq('published', true).order('sort_order'),
      SHAI.client.from('site_copy').select('*')
    ]);
    const site = {};
    (copy.data || []).forEach((r) => (site[r.key] = r.value));
    return {
      services: (services.data || []).map((s) => ({ ...s, from: 0, order: s.sort_order })),
      work: work.data || [],
      posts: posts.data || [],
      products: (products.data || []).map((p) => ({ ...p, order: p.sort_order })),
      site
    };
  };

  // ------------------------------------------------------------ public writes
  SHAI.submit = {
    async enquiry(rec) {
      if (!SHAI.enabled) return { local: true };
      const { error } = await SHAI.client.from('enquiries').insert({
        name: rec.name, email: rec.email, type: rec.type, budget: rec.budget,
        message: rec.message, status: 'New'
      });
      if (error) throw error;
      return { ok: true };
    },
    async quote(d) {
      if (!SHAI.enabled) return { local: true };
      const { error } = await SHAI.client.from('quote_requests').insert({
        name: d.name, email: d.email, phone: d.phone, job_title: d.jobTitle,
        business: d.business, industry: d.industry, website: d.website, size: d.size,
        location: d.location, services: d.services, goals: d.goals,
        budget: d.budget, start_when: d.start, brief: d.brief
      });
      if (error) throw error;
      return { ok: true };
    },
    async order(o) {
      if (!SHAI.enabled) return { local: true };
      const { error } = await SHAI.client.from('orders').insert({
        number: o.number, name: o.name, email: o.email,
        items: o.items, total: o.total, status: 'Pending'
      });
      if (error) throw error;
      return { ok: true };
    }
  };

  SHAI.audit = async function (action, entity, label, detail) {
    if (!SHAI.enabled || !SHAI.user) return;
    await SHAI.client.from('audit_log').insert({
      actor: (SHAI.profile && SHAI.profile.name) || SHAI.user.email,
      actor_role: (SHAI.profile && SHAI.profile.role) || 'client',
      action, entity, label, detail
    });
  };
})();
