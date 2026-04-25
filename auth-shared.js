(function () {
  const SUPABASE_URL = 'https://exbakxkfbglnsdescimj.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EGyaVD9bOtD5PHJbT5qPpw_9P4MHhwE';
  const DEFAULT_PROFILE_ROUTE = 'user-profile.html';
  const DEFAULT_ADMIN_ROUTE = 'admin/';
  const DEFAULT_MANAGER_ROUTE = 'team-manager-dashboard.html';
  const DEFAULT_AGENT_ROUTE = 'agent-dashboard.html';

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
      user.__resolvedRole ||
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      user.role
    );
  }

  function getRoleLabel(role) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'player') return 'მოთამაშე';
    if (normalizedRole === 'parent') return 'მშობელი';
    if (normalizedRole === 'agent') return 'აგენტი';
    if (normalizedRole === 'scout') return 'სკაუტი';
    if (normalizedRole === 'academy') return 'გუნდის მენეჯერი';
    if (normalizedRole === 'admin') return 'ადმინი';
    return 'მომხმარებელი';
  }

  async function resolveProfileRole(client, user) {
    if (!client || !user?.id) {
      return getUserRole(user);
    }

    try {
      const { data, error } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        return getUserRole(user);
      }

      return normalizeRole(data?.role || getUserRole(user));
    } catch (error) {
      return getUserRole(user);
    }
  }

  async function getCurrentAuthState(client) {
    if (!client?.auth) {
      return { session: null, user: null };
    }

    let session = null;
    let user = null;

    try {
      const { data } = await client.auth.getSession();
      session = data?.session || null;
      user = session?.user || null;
    } catch (error) {
      session = null;
      user = null;
    }

    try {
      if (client.auth.getUser) {
        const { data, error } = await client.auth.getUser();
        if (!error && data?.user) {
          user = data.user;
          if (session) {
            session = { ...session, user };
          }
        }
      }
    } catch (error) {
      // Fall back to session user.
    }

    return { session, user };
  }

  function getProfileRouteForRole(role) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'admin') {
      return DEFAULT_ADMIN_ROUTE;
    }
    if (normalizedRole === 'academy') {
      return DEFAULT_MANAGER_ROUTE;
    }
    if (normalizedRole === 'agent') {
      return DEFAULT_AGENT_ROUTE;
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

    if (!value.includes('.html') && !value.startsWith('#') && !value.endsWith('/')) {
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

  async function resolvePostAuthTarget(user, preferredRedirect) {
    const explicitTarget = stripAuthHash(preferredRedirect || getRedirectParam());
    const client = getClient();
    if (user && !user.__resolvedRole) {
      user.__resolvedRole = await resolveProfileRole(client, user);
    }
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
      '.site-auth-profile-trigger{gap:10px;display:inline-flex;align-items:center}',
      '.site-auth-profile-trigger-text{display:flex;flex-direction:column;align-items:flex-start;line-height:1.05}',
      '.site-auth-profile-trigger-text strong{font-size:.9rem;font-weight:800}',
      '.site-auth-profile-trigger-text span{font-size:.68rem;font-weight:700;opacity:.76}',
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

  function ensureMobileMenuStyles() {
    if (document.getElementById('siteAuthMobileMenuStyles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'siteAuthMobileMenuStyles';
    style.textContent = [
      '.site-mobile-toggle{display:none;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;border:1px solid rgba(15,23,42,.12);background:#fff;color:#0f172a;box-shadow:0 10px 22px rgba(15,23,42,.08);cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}',
      '.site-mobile-toggle:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(15,23,42,.12);border-color:rgba(185,28,28,.22)}',
      '.site-mobile-toggle span,.site-mobile-toggle::before,.site-mobile-toggle::after{content:"";display:block;width:18px;height:2px;border-radius:999px;background:currentColor;transition:transform .22s ease,opacity .22s ease}',
      '.site-mobile-toggle-inner{display:grid;gap:4px}',
      '.site-mobile-toggle.is-open .site-mobile-toggle-inner span:nth-child(1){transform:translateY(6px) rotate(45deg)}',
      '.site-mobile-toggle.is-open .site-mobile-toggle-inner span:nth-child(2){opacity:0}',
      '.site-mobile-toggle.is-open .site-mobile-toggle-inner span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}',
      '.site-mobile-overlay{position:fixed;inset:0;background:rgba(15,23,42,.42);backdrop-filter:blur(6px);opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease;z-index:1090}',
      '.site-mobile-panel{position:fixed;top:0;right:0;width:min(360px,100vw);height:100vh;padding:18px 18px 26px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);box-shadow:-24px 0 48px rgba(15,23,42,.18);transform:translateX(100%);transition:transform .25s ease;z-index:1100;display:grid;grid-template-rows:auto 1fr auto;gap:18px}',
      '.site-mobile-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid rgba(15,23,42,.08)}',
      '.site-mobile-panel-title{font-size:1rem;font-weight:900;color:#0f172a}',
      '.site-mobile-close{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border:none;border-radius:14px;background:#fff;color:#0f172a;box-shadow:0 10px 22px rgba(15,23,42,.08);cursor:pointer}',
      '.site-mobile-body{overflow:auto;display:grid;align-content:start;gap:18px;padding-right:2px}',
      '.site-mobile-links,.site-mobile-actions{display:grid;gap:10px}',
      '.site-mobile-link{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:18px;background:#fff;border:1px solid rgba(15,23,42,.08);font-size:.96rem;font-weight:800;color:#0f172a;box-shadow:0 10px 22px rgba(15,23,42,.05)}',
      '.site-mobile-link::after{content:"›";font-size:1.1rem;color:#94a3b8}',
      '.site-mobile-link.is-active{background:#fff1f2;border-color:rgba(185,28,28,.14);color:#b91c1c}',
      '.site-mobile-section-label{font-size:.74rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#64748b;padding:0 4px}',
      '.site-mobile-actions > *{width:100% !important;justify-content:center}',
      '.site-mobile-open .site-mobile-overlay{opacity:1;visibility:visible}',
      '.site-mobile-open .site-mobile-panel{transform:translateX(0)}',
      '.site-mobile-lock{overflow:hidden}',
      '@media (max-width:760px){.site-mobile-toggle{display:inline-flex}.nav>.nav-links,.nav>.links,.nav>.nav-actions,.nav>.actions{display:none !important}}'
    ].join('');

    document.head.appendChild(style);
  }

  function initMobileMenu(options) {
    const settings = options || {};
    const navRoot = document.querySelector(settings.navRootSelector || '.nav');
    const linkContainer = navRoot?.querySelector(settings.linksSelector || '.nav-links, .links');
    const actionsContainer = navRoot?.querySelector(settings.actionsSelector || '.nav-actions, .actions');

    if (!navRoot || !linkContainer) {
      return null;
    }

    if (navRoot.querySelector('.site-mobile-toggle')) {
      return navRoot.__siteMobileMenu || null;
    }

    ensureMobileMenuStyles();

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'site-mobile-toggle';
    toggle.setAttribute('aria-label', 'მენიუს გახსნა');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="site-mobile-toggle-inner"><span></span><span></span><span></span></span>';

    const host = document.createElement('div');
    host.className = 'site-mobile-host';
    host.innerHTML = [
      '<div class="site-mobile-overlay" hidden></div>',
      '<aside class="site-mobile-panel" aria-hidden="true">',
        '<div class="site-mobile-panel-head">',
          '<div class="site-mobile-panel-title">მენიუ</div>',
          '<button type="button" class="site-mobile-close" aria-label="მენიუს დახურვა">×</button>',
        '</div>',
        '<div class="site-mobile-body">',
          '<div class="site-mobile-links-wrap">',
            '<div class="site-mobile-section-label">გვერდები</div>',
            '<div class="site-mobile-links"></div>',
          '</div>',
          '<div class="site-mobile-actions-wrap">',
            '<div class="site-mobile-section-label">პროფილი</div>',
            '<div class="site-mobile-actions"></div>',
          '</div>',
        '</div>',
      '</aside>'
    ].join('');

    document.body.appendChild(host);
    navRoot.appendChild(toggle);

    const overlay = host.querySelector('.site-mobile-overlay');
    const panel = host.querySelector('.site-mobile-panel');
    const closeButton = host.querySelector('.site-mobile-close');
    const mobileLinks = host.querySelector('.site-mobile-links');
    const mobileActions = host.querySelector('.site-mobile-actions');

    function setOpen(nextOpen) {
      const isOpen = Boolean(nextOpen);
      document.body.classList.toggle('site-mobile-open', isOpen);
      document.body.classList.toggle('site-mobile-lock', isOpen);
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      overlay.hidden = !isOpen;
    }

    function syncMenuContent() {
      const currentPath = getCurrentPagePath().split('?')[0];
      const links = Array.from(linkContainer.querySelectorAll('a')).map(function (anchor) {
        const href = anchor.getAttribute('href') || '#';
        const label = anchor.textContent || '';
        const isActive = anchor.classList.contains('active') || stripAuthHash(href).split('?')[0] === currentPath;
        return '<a class="site-mobile-link' + (isActive ? ' is-active' : '') + '" href="' + href + '">' + escapeHtml(label) + '</a>';
      }).join('');
      mobileLinks.innerHTML = links || '<div class="site-mobile-link">გვერდები ვერ მოიძებნა</div>';

      let actionMarkup = '';
      if (actionsContainer) {
        if (actionsContainer.querySelector('.site-auth-profile-menu')) {
          const profileLabel = actionsContainer.querySelector('.site-auth-profile-label strong')?.textContent || 'პროფილი';
          const profileRole = actionsContainer.querySelector('.site-auth-profile-label span')?.textContent || '';
          const profileLinks = Array.from(actionsContainer.querySelectorAll('.site-auth-profile-link')).map(function (anchor) {
            return '<a class="site-mobile-link" href="' + (anchor.getAttribute('href') || '#') + '">' + escapeHtml(anchor.textContent || '') + '</a>';
          }).join('');
          const logoutButton = actionsContainer.querySelector('[data-auth-logout]');
          actionMarkup = [
            '<div class="site-mobile-section-label">', escapeHtml(profileLabel), '</div>',
            profileRole ? '<div class="site-mobile-section-label" style="margin-top:-8px;font-size:.76rem;opacity:.7;">' + escapeHtml(profileRole) + '</div>' : '',
            profileLinks,
            logoutButton
              ? '<button type="button" class="site-auth-profile-logout site-mobile-logout" data-mobile-auth-logout>გასვლა</button>'
              : ''
          ].join('');
        } else {
          actionMarkup = Array.from(actionsContainer.querySelectorAll('a,button')).map(function (item) {
            if (!item.textContent.trim()) {
              return '';
            }
            const href = item.tagName === 'A' ? (item.getAttribute('href') || '#') : '#';
            const tag = item.tagName === 'A' ? 'a' : 'button';
            const attr = tag === 'a'
              ? 'href="' + href + '"'
              : 'type="button"';
            return '<' + tag + ' class="' + escapeHtml(item.className || 'btn btn-white') + '" ' + attr + '>' + escapeHtml(item.textContent || '') + '</' + tag + '>';
          }).join('');
        }
      }

      mobileActions.innerHTML = actionMarkup || '<a class="btn btn-primary" href="' + buildLoginHref(currentPath) + '">შესვლა</a>';

      const mobileLogout = mobileActions.querySelector('[data-mobile-auth-logout]');
      if (mobileLogout) {
        mobileLogout.addEventListener('click', async function () {
          setOpen(false);
          await signOut({ redirect: settings.afterLogout || 'index.html' });
        });
      }

      Array.from(host.querySelectorAll('a')).forEach(function (anchor) {
        anchor.addEventListener('click', function () {
          setOpen(false);
        });
      });
    }

    toggle.addEventListener('click', function () {
      const nextOpen = toggle.getAttribute('aria-expanded') !== 'true';
      syncMenuContent();
      setOpen(nextOpen);
    });

    overlay.addEventListener('click', function () {
      setOpen(false);
    });

    closeButton.addEventListener('click', function () {
      setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    const observer = new MutationObserver(function () {
      syncMenuContent();
    });
    observer.observe(linkContainer, { childList: true, subtree: true, attributes: true });
    if (actionsContainer) {
      observer.observe(actionsContainer, { childList: true, subtree: true, attributes: true });
    }

    syncMenuContent();

    const api = { sync: syncMenuContent, close: function () { setOpen(false); } };
    navRoot.__siteMobileMenu = api;
    return api;
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

    if (role === 'agent') {
      return [
        {
          href: buildProfileHref(`${DEFAULT_AGENT_ROUTE}`, fromPath),
          title: 'აგენტის დაფა',
          copy: 'კლიენტები, სამიზნეები, გარიგებები და ფეხბურთელების დამატება.'
        },
        {
          href: buildProfileHref(`${DEFAULT_AGENT_ROUTE}`, fromPath),
          title: 'ჩემი კლიენტები',
          copy: 'ჩემი წარმომადგენლობის ქვეშ მყოფი ფეხბურთელები.'
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

    const { user } = await getCurrentAuthState(client);

    if (!user) {
      target.innerHTML = [
        '<a href="', loginHref, '" class="', loginClass, '">შესვლა</a>',
        '<a href="', registerHref, '" class="', registerClass, '">რეგისტრაცია</a>'
      ].join('');
      return;
    }

    user.__resolvedRole = await resolveProfileRole(client, user);

    const profileHref = buildProfileHref(
      getProfileRouteForUser(user),
      currentPath
    );
    const displayName = getUserDisplayName(user);
    const roleLabel = getRoleLabel(getUserRole(user));
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
        '<button type="button" class="', profileClass, ' site-auth-profile-trigger" aria-haspopup="true" aria-expanded="false" title="', escapeHtml(displayName), '">',
          '<span class="site-auth-profile-trigger-text"><strong>პროფილი</strong><span>', escapeHtml(roleLabel), '</span></span>',
        '</button>',
        '<div class="site-auth-profile-panel">',
          '<div class="site-auth-profile-label">',
            '<strong>', escapeHtml(displayName), '</strong>',
            '<span>', escapeHtml(roleLabel), '</span>',
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
    const settings = typeof options === 'string'
      ? { redirect: options }
      : (options || {});
    const redirectPath = settings.redirect || DEFAULT_PROFILE_ROUTE;
    const client = getClient();

    if (!client) {
      window.location.href = buildLoginHref(redirectPath);
      return { client: null, user: null };
    }

    const { session, user } = await getCurrentAuthState(client);

    if (!user) {
      window.location.href = buildLoginHref(redirectPath);
      return { client: client, user: null };
    }

    user.__resolvedRole = await resolveProfileRole(client, user);

    return { client: client, user: user, session: session };
  }

  window.siteAuth = {
    buildLoginHref: buildLoginHref,
    buildProfileHref: buildProfileHref,
    buildRegisterHref: buildRegisterHref,
    getClient: getClient,
    getCurrentPagePath: getCurrentPagePath,
    getProfileRouteForRole: getProfileRouteForRole,
    getProfileRouteForUser: getProfileRouteForUser,
    getCurrentAuthState: getCurrentAuthState,
    getRedirectParam: getRedirectParam,
    getUserDisplayName: getUserDisplayName,
    getUserRole: getUserRole,
    resolveProfileRole: resolveProfileRole,
    renderAuthNav: renderAuthNav,
    initMobileMenu: initMobileMenu,
    requireAuth: requireAuth,
    resolvePostAuthTarget: resolvePostAuthTarget,
    sanitizeInternalPath: sanitizeInternalPath,
    signOut: signOut
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initMobileMenu();
    }, { once: true });
  } else {
    initMobileMenu();
  }
})();
