(function () {
  const SUPABASE_URL = 'https://exbakxkfbglnsdescimj.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EGyaVD9bOtD5PHJbT5qPpw_9P4MHhwE';
  const DEFAULT_PROFILE_ROUTE = 'user-profile.html';
  const DEFAULT_ADMIN_ROUTE = 'admin-deshboard.html';

  function getClient() {
    if (window.__mfgSupabaseClient) {
      return window.__mfgSupabaseClient;
    }

    if (!window.supabase || !window.supabase.createClient) {
      return null;
    }

    window.__mfgSupabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    return window.__mfgSupabaseClient;
  }

  function normalizeRole(rawRole) {
    const role = String(rawRole || '').trim().toLowerCase();
    if (['player', 'parent', 'agent', 'scout', 'academy', 'admin'].includes(role)) {
      return role;
    }
    return 'player';
  }

  function getUserRole(user) {
    if (!user) {
      return 'player';
    }

    return normalizeRole(
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      user.role
    );
  }

  function getProfileRouteForRole(role) {
    return normalizeRole(role) === 'admin'
      ? DEFAULT_ADMIN_ROUTE
      : DEFAULT_PROFILE_ROUTE;
  }

  function getProfileRouteForUser(user) {
    return getProfileRouteForRole(getUserRole(user));
  }

  function getCurrentPagePath() {
    return sanitizeInternalPath(
      window.location.pathname.split('/').pop() || 'index.html',
      'index.html'
    );
  }

  function sanitizeInternalPath(path, fallbackPath) {
    const fallback = fallbackPath || 'index.html';
    const value = String(path || '').trim();

    if (!value) {
      return fallback;
    }

    if (/^(https?:|\/\/|javascript:|data:)/i.test(value)) {
      return fallback;
    }

    if (!/^[a-zA-Z0-9._/%#?&=-]+$/.test(value)) {
      return fallback;
    }

    if (!value.includes('.html') && !value.startsWith('#')) {
      return fallback;
    }

    return value;
  }

  function stripAuthHash(path) {
    const value = sanitizeInternalPath(path, '');
    if (!value) {
      return '';
    }

    const hashIndex = value.indexOf('#');
    if (hashIndex === -1) {
      return value;
    }

    const base = value.slice(0, hashIndex);
    const hash = value.slice(hashIndex + 1).toLowerCase();

    if (hash === 'login' || hash === 'register') {
      return base || 'index.html';
    }

    return value;
  }

  function getRedirectParam() {
    const params = new URLSearchParams(window.location.search);
    return stripAuthHash(params.get('redirect'));
  }

  function buildLoginHref(redirectPath) {
    const target = stripAuthHash(redirectPath) || 'index.html';
    return 'login.html?redirect=' + encodeURIComponent(target) + '#login';
  }

  function buildRegisterHref(redirectPath) {
    const target = stripAuthHash(redirectPath) || 'index.html';
    return 'login.html?redirect=' + encodeURIComponent(target) + '#register';
  }

  function buildProfileHref(profileRoute, fromPath) {
    const safeProfileRoute = sanitizeInternalPath(profileRoute, DEFAULT_PROFILE_ROUTE);
    const safeFromPath = stripAuthHash(fromPath);

    if (!safeFromPath) {
      return safeProfileRoute;
    }

    const parts = safeProfileRoute.split('#');
    const base = parts[0];
    const hash = parts[1] ? ('#' + parts[1]) : '';
    const separator = base.includes('?') ? '&' : '?';

    return base + separator + 'from=' + encodeURIComponent(safeFromPath) + hash;
  }

  function resolvePostAuthTarget(user, preferredRedirect) {
    const explicitTarget = stripAuthHash(preferredRedirect || getRedirectParam());
    const profileTarget = getProfileRouteForUser(user);

    if (!explicitTarget) {
      return profileTarget;
    }

    if (explicitTarget.split('#')[0].toLowerCase() === 'login.html') {
      return profileTarget;
    }

    return explicitTarget;
  }

  function getUserDisplayName(user) {
    const fullName = String(user?.user_metadata?.full_name || '').trim();
    if (fullName) {
      return fullName;
    }

    const firstName = String(user?.user_metadata?.first_name || '').trim();
    const lastName = String(user?.user_metadata?.last_name || '').trim();
    const combined = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (combined) {
      return combined;
    }

    if (user?.email) {
      return user.email.split('@')[0];
    }

    return 'პროფილი';
  }

  async function signOut(options) {
    const settings = options || {};
    const client = getClient();

    if (client) {
      await client.auth.signOut();
    }

    window.location.href = sanitizeInternalPath(settings.redirect, 'index.html');
  }

  async function renderAuthNav(container, options) {
    const settings = options || {};
    const target = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!target) {
      return;
    }

    const currentPath = settings.currentPath || getCurrentPagePath();
    const loginHref = settings.loginHref || buildLoginHref(currentPath);
    const registerHref = settings.registerHref || buildRegisterHref(currentPath);
    const loginClass = settings.loginClass || 'btn btn-white';
    const registerClass = settings.registerClass || 'btn btn-red';
    const profileClass = settings.profileClass || loginClass;
    const logoutClass = settings.logoutClass || registerClass;

    const client = getClient();
    if (!client) {
      target.innerHTML = [
        '<a href="', loginHref, '" class="', loginClass, '">შესვლა</a>',
        '<a href="', registerHref, '" class="', registerClass, '">რეგისტრაცია</a>'
      ].join('');
      return;
    }

    const { data } = await client.auth.getSession();
    const user = data?.session?.user || null;

    if (!user) {
      target.innerHTML = [
        '<a href="', loginHref, '" class="', loginClass, '">შესვლა</a>',
        '<a href="', registerHref, '" class="', registerClass, '">რეგისტრაცია</a>'
      ].join('');
      return;
    }

    const profileHref = buildProfileHref(
      getProfileRouteForUser(user),
      currentPath
    );
    const displayName = getUserDisplayName(user);

    target.innerHTML = [
      '<a href="', profileHref, '" class="', profileClass, '" title="', displayName, '">პროფილი</a>',
      '<button type="button" class="', logoutClass, '" data-auth-logout>გასვლა</button>'
    ].join('');

    const logoutButton = target.querySelector('[data-auth-logout]');
    if (logoutButton) {
      logoutButton.addEventListener('click', function () {
        signOut({ redirect: settings.afterLogout || 'index.html' });
      });
    }
  }

  async function requireAuth(options) {
    const settings = options || {};
    const redirectPath = settings.redirect || DEFAULT_PROFILE_ROUTE;
    const client = getClient();

    if (!client) {
      window.location.href = buildLoginHref(redirectPath);
      return { client: null, user: null };
    }

    const { data } = await client.auth.getSession();
    const user = data?.session?.user || null;

    if (!user) {
      window.location.href = buildLoginHref(redirectPath);
      return { client: client, user: null };
    }

    return { client: client, user: user };
  }

  window.siteAuth = {
    buildLoginHref: buildLoginHref,
    buildProfileHref: buildProfileHref,
    buildRegisterHref: buildRegisterHref,
    getClient: getClient,
    getCurrentPagePath: getCurrentPagePath,
    getProfileRouteForRole: getProfileRouteForRole,
    getProfileRouteForUser: getProfileRouteForUser,
    getRedirectParam: getRedirectParam,
    getUserDisplayName: getUserDisplayName,
    getUserRole: getUserRole,
    renderAuthNav: renderAuthNav,
    requireAuth: requireAuth,
    resolvePostAuthTarget: resolvePostAuthTarget,
    sanitizeInternalPath: sanitizeInternalPath,
    signOut: signOut
  };
})();
