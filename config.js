/* Shai Studios — runtime configuration.
   Filled in once shaistudiodb exists. Both values are safe to ship in the
   browser: the publishable (anon) key only grants what row-level security
   allows. Leave them blank and the app runs on local demo data. */
window.SHAI_CONFIG = {
  url: '',   // https://<project-ref>.supabase.co
  key: ''    // publishable / anon key
};
