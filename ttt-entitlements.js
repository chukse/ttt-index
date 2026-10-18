/* ttt-entitlements.js — the shared TTT membership layer.
 * One account (Supabase) stores the user's tier; every app loads this file and
 * gates features with TTT.has('<feature>'). Hosted on the hub so all apps share it:
 *   <script src="https://chukse.github.io/ttt-index/ttt-entitlements.js"></script>
 *
 * Usage in any app (after your Supabase client `sb` is ready):
 *   await TTT.init(sb);
 *   if (TTT.has('fantasy_pro')) { ...unlock... } else { ...show upgrade CTA... }
 *
 * The tier lives in Supabase user_state.plan  ('free' | 'core' | 'allaccess').
 * Stripe's webhook writes that value on checkout; this file maps it to features.
 */
(function (global) {
  // ONE TTT membership: any paid plan unlocks everything, every app. The free tier
  // keeps the public rankings; the membership unlocks depth, tools and the full apps.
  var ALL = ['index_depth', 'substack', 'fantasy_pro', 'draft_pro'];
  var TIERS = {
    free:      [],
    member:    ALL,   // canonical paid plan name
    pro:       ALL,   // the fantasy app already writes plan='pro'
    core:      ALL,   // legacy aliases — collapsed into the single membership
    allaccess: ALL,
  };
  var MIN_TIER = { index_depth: 'member', substack: 'member', fantasy_pro: 'member', draft_pro: 'member' };

  var TTT = {
    tier: 'free',
    entitlements: [],
    ready: false,

    // true if the current tier includes this feature
    has: function (feature) { return this.entitlements.indexOf(feature) !== -1; },
    isPaid: function () { return this.tier !== 'free'; },
    // the lowest tier that unlocks a feature (for "Upgrade to All-Access" copy)
    tierFor: function (feature) { return MIN_TIER[feature] || 'core'; },

    _set: function (tier) {
      this.tier = TIERS[tier] ? tier : 'free';
      this.entitlements = (TIERS[this.tier] || []).slice();
      this.ready = true;
      return this;
    },

    // read the signed-in user's tier from Supabase; falls back to 'free' on any issue
    init: async function (sb) {
      try {
        if (!sb) return this._set('free');
        var s = await sb.auth.getSession();
        var session = s && s.data && s.data.session;
        if (!session) return this._set('free');
        var r = await sb.from('user_state').select('plan').eq('user_id', session.user.id).maybeSingle();
        var row = r && r.data;
        var tier = (row && row.plan) || 'free';
        return this._set(tier);
      } catch (e) {
        return this._set('free');
      }
    },

    TIERS: TIERS,
  };

  global.TTT = TTT;
})(typeof window !== 'undefined' ? window : this);
