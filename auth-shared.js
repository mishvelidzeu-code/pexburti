(function () {
  const SUPABASE_URL = 'https://exbakxkfbglnsdescimj.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EGyaVD9bOtD5PHJbT5qPpw_9P4MHhwE';
  const DEFAULT_PROFILE_ROUTE = 'user-profile.html';
  const DEFAULT_ADMIN_ROUTE = 'admin-deshboard.html';
  const DEFAULT_MANAGER_ROUTE = 'team-manager-dashboard.html';

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
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'admin') {
      return DEFAULT_ADMIN_ROUTE;
    }
    if (normalizedRole === 'academy') {
      return DEFAULT_MANAGER_ROUTE;
    }
    return DEFAULT_PROFILE_ROUTE;
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureProfileMenuStyles() {
    if (document.getElementById('siteAuthProfileMenuStyles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'siteAuthProfileMenuStyles';
    style.textContent = [
      '.site-auth-profile-menu{position:relative}',
      '.site-auth-profile-trigger{gap:10px}',
      '.site-auth-profile-trigger::after{content:"";width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-1px);opacity:.82}',
      '.site-auth-profile-panel{position:absolute;top:calc(100% + 10px);right:0;width:min(236px,calc(100vw - 32px));padding:10px;border-radius:20px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.985);box-shadow:0 24px 48px rgba(15,23,42,.14);display:grid;gap:6px;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .22s ease,transform .22s ease,visibility .22s ease;z-index:120}',
      '.site-auth-profile-menu:hover .site-auth-profile-panel,.site-auth-profile-menu:focus-within .site-auth-profile-panel,.site-auth-profile-menu.open .site-auth-profile-panel{opacity:1;visibility:visible;transform:translateY(0)}',
      '.site-auth-profile-label{padding:6px 8px 10px;border-bottom:1px solid rgba(15,23,42,.08)}',
      '.site-auth-profile-label strong{font-size:.9rem;color:#111827;display:block}',
      '.site-auth-profile-link{display:block;padding:10px 12px;border-radius:16px;transition:background .2s ease,transform .2s ease;font-size:.88rem;font-weight:800;color:#111827}',
      '.site-auth-profile-link:hover{background:#fff5f5;transform:translateX(2px)}',
      '.site-auth-profile-logout{margin-top:4px;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:999px;border:none;background:#b91c1c;color:#fff;font-weight:800;font-size:.82rem;box-shadow:0 10px 22px rgba(185,28,28,.18)}',
      '.site-auth-profile-logout:hover{background:#991b1b}'
    ].join('');

    document.head.appendChild(style);
  }

  function getProfileMenuFromPath(currentPath) {
    const normalized = stripAuthHash(currentPath);
    const parts = String(normalized || '').split('?');
    const base = parts[0] || '';
    const search = parts[1] || '';

    if ((base === DEFAULT_PROFILE_ROUTE || base === DEFAULT_ADMIN_ROUTE || base === DEFAULT_MANAGER_ROUTE) && search) {
      const params = new URLSearchParams(search);
      return sanitizeInternalPath(params.get('from'), 'index.html');
    }

    return normalized || 'index.html';
  }

  function buildProfileMenuItems(user, currentPath) {
    const role = getUserRole(user);
    const fromPath = getProfileMenuFromPath(currentPath);

    if (role === 'admin') {
      return [
        {
          href: buildProfileHref(DEFAULT_ADMIN_ROUTE, fromPath),
          title: 'ადმინ პანელი',
          copy: 'სრული ადმინისტრირება, კონტროლი და მიმოხილვა.'
        },
        {
          href: buildProfileHref(`${DEFAULT_PROFILE_ROUTE}?view=data`, fromPath),
          title: 'მონაცემები',
          copy: 'საკუთარი მონაცემების და ანგარიშის პარამეტრების ნახვა.'
        }
      ];
    }

    if (role === 'academy') {
      return [
        {
          href: buildProfileHref(`${DEFAULT_MANAGER_ROUTE}#overview`, fromPath),
          title: 'მენეჯერის დაფა',
          copy: 'გუნდის მართვა, მოთხოვნები და ძირითადი სამუშაო სივრცე.'
        },
        {
          href: buildProfileHref(`${DEFAULT_MANAGER_ROUTE}#team`, fromPath),
          title: 'გუნდის ინფორმაცია',
          copy: 'კლუბის ძირითადი მონაცემები, სტატუსი და გუნდის კონტექსტი.'
        },
        {
          href: buildProfileHref(`${DEFAULT_MANAGER_ROUTE}#requests`, fromPath),
          title: 'მოთხოვნები',
          copy: 'გუნდის მოთხოვნები, დამტკიცების სტატუსი და კომუნიკაცია.'
        }
      ];
    }

    const items = [
      {
        key: 'overview',
        title: 'პროფილი',
        copy: 'საერთო სურათი, სწრაფი ბლოკები და აქტიური სტატუსი.'
      },
      {
        key: 'data',
        title: 'მონაცემები',
        copy: 'რეგისტრაციის მონაცემები, ფოტო და რედაქტირება.'
      },
      {
        key: 'status',
        title: 'სტატუსი',
        copy: 'ასაკობრივი, მიმდინარე პროგრესი და აქტიური მდგომარეობა.'
      }
    ];

    if (role === 'player' || role === 'parent') {
      items.push({
        key: 'team',
        title: role === 'parent' ? 'ბავშვის გუნდი' : 'გუნდი და ასაკობრივი',
        copy: 'გუნდის შეცვლა, ასაკობრივის მართვა და მიბმის განახლება.'
      });
    }

    items.push({
      key: 'portfolio',
      title: 'პორტფოლიო',
      copy: 'ვიდეო CV, ბმები და შემდეგი ნაბიჯები.'
    });

    return items.map(function (item) {
      return {
        href: buildProfileHref(`${DEFAULT_PROFILE_ROUTE}?view=${item.key}`, fromPath),
        title: item.title,
        copy: item.copy
      };
    });
  }

  function clearSupabaseBrowserSession() {
    [window.localStorage, window.sessionStorage].forEach(function (storage) {
      if (!storage) {
        return;
      }

      try {
        Object.keys(storage).forEach(function (key) {
          if (
            String(key).startsWith('sb-') ||
            String(key).includes('supabase.auth.token')
          ) {
            storage.removeItem(key);
          }
        });
      } catch (error) {
        // Ignore storage cleanup issues and continue redirecting the user out.
      }
    });
  }

  async function signOut(options) {
    const settings = options || {};
    const client = getClient();

    try {
      if (client) {
        await client.auth.signOut({ scope: 'local' });
      }
    } catch (error) {
      console.warn('Sign out fallback was used.', error);
    }

    clearSupabaseBrowserSession();
    window.location.replace(sanitizeInternalPath(settings.redirect, 'index.html'));
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
    if (typeof settings.renderLoggedIn === 'function') {
      const handled = await settings.renderLoggedIn({
        currentPath: currentPath,
        displayName: displayName,
        getUserRole: getUserRole,
        profileHref: profileHref,
        profileRoute: getProfileRouteForUser(user),
        signOut: signOut,
        target: target,
        user: user
      });

      if (handled !== false) {
        return;
      }
    }
    ensureProfileMenuStyles();
    const menuItems = buildProfileMenuItems(user, currentPath);
    target.innerHTML = [
      '<div class="site-auth-profile-menu">',
        '<button type="button" class="', profileClass, ' site-auth-profile-trigger" aria-haspopup="true" aria-expanded="false" title="', escapeHtml(displayName), '">პროფილი</button>',
        '<div class="site-auth-profile-panel">',
          '<div class="site-auth-profile-label">',
            '<strong>', escapeHtml(displayName), '</strong>',
          '</div>',
          menuItems.map(function (item) {
            return [
              '<a href="', item.href, '" class="site-auth-profile-link">',
                escapeHtml(item.title),
              '</a>'
            ].join('');
          }).join(''),
          '<button type="button" class="site-auth-profile-logout" data-auth-logout>გასვლა</button>',
        '</div>',
      '</div>'
    ].join('');

    const menu = target.querySelector('.site-auth-profile-menu');
    const trigger = target.querySelector('.site-auth-profile-trigger');
    const logoutButton = target.querySelector('[data-auth-logout]');

    if (trigger && menu) {
      trigger.addEventListener('click', function () {
        const isOpen = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', function (event) {
        if (!menu.contains(event.target)) {
          menu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', async function (event) {
        event.preventDefault();
        event.stopPropagation();
        logoutButton.disabled = true;
        await signOut({ redirect: settings.afterLogout || 'index.html' });
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
