-- Shai Studios — bootstrap: super admins, seed content, store data.
-- Safe to run more than once.

-- ---------------------------------------------------------------- super admins
-- Anyone signing in with an email listed here becomes that role automatically,
-- no matter which provider they used (Google, GitHub, magic link or password).
create table if not exists public.role_allowlist (
  email text primary key,
  role  app_role not null default 'superadmin',
  note  text
);

alter table public.role_allowlist enable row level security;
create policy "superadmins manage allowlist" on public.role_allowlist for all
  using (public.has_role(array['superadmin']::app_role[]))
  with check (public.has_role(array['superadmin']::app_role[]));

insert into public.role_allowlist (email, role, note) values
  ('sir.karabom@gmail.com',    'superadmin', 'Karabo N — owner'),
  ('mbalimsereko@gmail.com',   'superadmin', 'Mbali — owner')
on conflict (email) do update set role = excluded.role, note = excluded.note;

-- new sign-ups: allowlisted emails get their role, everyone else is a client
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned app_role;
begin
  select role into assigned from public.role_allowlist
   where lower(email) = lower(new.email);

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)),
    new.email,
    coalesce(assigned, 'client')
  )
  on conflict (id) do update
    set role = coalesce(assigned, public.profiles.role),
        name = coalesce(excluded.name, public.profiles.name);
  return new;
end $$;

-- promote the two owners if they already signed in before this ran
update public.profiles p
   set role = a.role
  from public.role_allowlist a
 where lower(p.email) = lower(a.email) and p.role is distinct from a.role;

-- ---------------------------------------------------------------- agency settings
insert into public.settings (key, value) values
  ('agency',  'Shai Studios'),
  ('owner',   'Karabo N'),
  ('email',   'hello@shaistudios.co.za'),
  ('phone',   '+27 71 123 4567'),
  ('address', '123 Loop Street, Cape Town, 8001')
on conflict (key) do nothing;

insert into public.site_copy (key, value) values
  ('heroEyebrow','Strategy meets creativity'),
  ('heroTitle','Your brand, built forward.'),
  ('heroBody','Professional digital marketing made accessible. We help purpose-driven businesses grow through strategy, content and digital marketing that delivers real results — without the agency jargon.'),
  ('aboutTitle','Small studio. Serious growth.'),
  ('aboutBody','Shai Studios is an independent digital marketing agency helping purpose-driven brands grow through strategy, content and digital. We believe great marketing should be accessible, human and results-driven.'),
  ('tagline','Strategy creates opportunity.'),
  ('heroImage','https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=70'),
  ('aboutImage','https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=1000&q=70'),
  ('ctaImage','https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=70')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- services
insert into public.services (name, icon, blurb, items, image, sort_order)
select * from (values
  ('Brand','◍','Positioning, visual identity and brand strategy.',
   array['Brand strategy','Visual identity','Brand messaging'],
   'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=70',1),
  ('Content','✎','High-performing content for every platform.',
   array['Content strategy','Photo & video','Social media management'],
   'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&w=1000&q=70',2),
  ('Growth','◪','Data-driven marketing to scale your business.',
   array['Paid ads management','SEO optimisation','Performance reporting'],
   'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=70',3),
  ('Digital','▣','Websites and digital experiences that convert.',
   array['Website design','Web development','Conversion optimisation'],
   'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=1000&q=70',4)
) as v(name, icon, blurb, items, image, sort_order)
where not exists (select 1 from public.services);

-- ---------------------------------------------------------------- case studies
insert into public.work (client, service, result, tag, image, published)
select * from (values
  ('Lumi Collective','Social Media Management','+320% engagement','Content','https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1000&q=70',true),
  ('The Wellness Edit','Brand Strategy','+180% revenue','Brand','https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1000&q=70',true),
  ('Moyo Interiors','Website & SEO','+240% organic traffic','Digital','https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=70',true),
  ('Nomu Skincare','Content Creation','+150% online sales','Content','https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=70',true),
  ('Rooted Foods','Digital Campaign','+290% audience growth','Growth','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=70',true),
  ('The Kind Club','Brand & Content','+310% community growth','Brand','https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=70',true)
) as v(client, service, result, tag, image, published)
where not exists (select 1 from public.work);

-- ---------------------------------------------------------------- blog
insert into public.posts (title, slug, category, author, date, image, excerpt, body, published)
select * from (values
  ('Five signs your brand has outgrown its logo','outgrown-your-logo','Brand','Karabo N',current_date - 6,
   'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=70',
   'A logo is not a brand. Here is how to tell when the identity you started with is quietly costing you customers.',
   E'Most founders design a logo in week one and never revisit it. That is fine until the business changes shape around it.\n\nThe first sign is inconsistency: every team member has a different file, and none of them match. The second is the apology — you find yourself explaining the logo before explaining the work.\n\nA rebrand does not have to mean starting over. In most cases we keep the equity you have built and rebuild the system around it: type, colour, layout and tone.',true),
  ('What we actually measure in a social media report','what-we-measure','Growth','Mbali',current_date - 19,
   'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=70',
   'Reach is the easiest number to grow and the least useful. These are the four metrics we put in front of clients instead.',
   E'Every agency sends a monthly report. Very few answer the only question that matters: did this make money?\n\nWe track four things. Qualified reach. Saves and shares, because they predict intent far better than likes. Click-through to a page that can convert. And cost per qualified lead, tracked all the way to the invoice.\n\nEverything else is context, not a result.',true),
  ('A website is a salesperson, not a brochure','website-is-a-salesperson','Digital','Karabo N',current_date - 33,
   'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=1000&q=70',
   'Most small business sites describe the company. The ones that work answer the visitor question by question.',
   E'Open your homepage and read the first screen as a stranger. Does it say what you do, who it is for, and what to do next?\n\nWe build pages in the order a buyer thinks: the promise, the proof, the offer, the objection, the ask.\n\nThe result is usually a shorter site that converts considerably better.',true),
  ('How to brief a content shoot in one page','brief-a-content-shoot','Content','Mbali',current_date - 48,
   'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&w=1000&q=70',
   'Good content starts before the camera. Our one-page brief template, and the three questions it forces you to answer.',
   E'A shoot without a brief produces beautiful images nobody can use. The brief is where strategy becomes a shot list.\n\nAnswer three questions. Where will each asset be published, and in what aspect ratio? What must the viewer believe after seeing it? What do we already have that we should not reshoot?',true)
) as v(title, slug, category, author, date, image, excerpt, body, published)
where not exists (select 1 from public.posts);

-- ---------------------------------------------------------------- store
insert into public.products (name, category, price, blurb, image, badge, sort_order, published)
select * from (values
  ('Brand Strategy Template','Templates',450.00,'The 12-page workbook we use in every brand kickoff.','https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=70','Bestseller',1,true),
  ('Social Media Kit','Social Media',350.00,'60 editable post and story layouts for Canva.','https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1000&q=70','',2,true),
  ('Marketing Planner','Planning',299.00,'A 90-day plan with budget, channel and KPI trackers.','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=70','',3,true),
  ('Canva Template Pack','Design',199.00,'Presentations, one-pagers and proposals in one pack.','https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1000&q=70','New',4,true),
  ('Content Calendar','Planning',120.00,'A 12-month calendar pre-filled with SA retail moments.','https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&w=1000&q=70','',5,true),
  ('Brand Guidelines Kit','Business',249.00,'Document your logo, colour and voice rules properly.','https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=70','',6,true)
) as v(name, category, price, blurb, image, badge, sort_order, published)
where not exists (select 1 from public.products);
