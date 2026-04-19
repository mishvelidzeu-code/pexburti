(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const safe = (value, fallback = 'არ არის დამატებული') => String(value ?? '').trim() || fallback;
  const ageApi = window.siteAgeGroups || {};
  const TEAM_FREE_AGENT = 'უგუნდოდ';

  const teamManageState = {
    user: null,
    profile: {},
    role: '',
    client: null,
    back: 'index.html',
    config: null
  };

  const from = () => window.siteAuth?.sanitizeInternalPath(
    new URLSearchParams(location.search).get('from'),
    'index.html'
  ) || 'index.html';

  const here = () => 'user-profile.html' + (location.search || '');

  function showApp() {
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');

    if (loading) {
      loading.hidden = true;
      loading.style.display = 'none';
    }

    if (app) {
      app.hidden = false;
      app.style.display = 'block';
    }

    window.scrollTo(0, 0);
  }

  function showLoadingError(message) {
    const loading = document.getElementById('loading');
    const loadingBox = document.querySelector('#loading .box');
    const app = document.getElementById('app');

    if (app) {
      app.hidden = true;
      app.style.display = 'none';
    }

    if (loading) {
      loading.hidden = false;
      loading.style.display = 'grid';
    }

    if (loadingBox) {
      loadingBox.innerHTML = `<h1>პროფილის ჩატვირთვა ვერ შესრულდა</h1><p>${esc(message || 'სცადე ხელახლა შესვლა ან გვერდის განახლება.')}</p>`;
    }
  }

  const backLabel = (path) => {
    const base = String(path || '').split('?')[0].split('#')[0];
    if (base === 'gundebi.html') return 'გუნდების გვერდზე დაბრუნება';
    if (base === 'pexburtelebi.html') return 'ფეხბურთელების გვერდზე დაბრუნება';
    if (base === 'team-dinamo-tbilisi.html') return 'გუნდის გვერდზე დაბრუნება';
    if (base === 'admin-deshboard.html') return 'ადმინ პანელზე დაბრუნება';
    return 'მთავარ გვერდზე დაბრუნება';
  };

  const roleLabel = (role) => ({
    player: 'მოთამაშე',
    parent: 'მშობელი',
    agent: 'აგენტი',
    admin: 'ადმინისტრატორი'
  })[role] || 'მომხმარებელი';

  const initials = (user) => (
    (user.user_metadata?.full_name || user.email || 'MF')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  ) || 'MF';

  const renderItems = (list) => list.map((item) => (
    `<div class="info"><div class="label">${esc(item.l)}</div>${
      item.h
        ? `<a href="${esc(item.h)}" class="value">${esc(item.v)}</a>`
        : `<div class="value">${esc(item.v)}</div>`
    }</div>`
  )).join('');

  const renderStats = (list) => list.map((item) => (
    `<div class="stat"><div class="label">${esc(item.l)}</div><strong>${esc(item.v)}</strong><div class="copy">${esc(item.c)}</div></div>`
  )).join('');

  const renderNotes = (list) => list.map((item) => (
    `<div class="note"><strong>${esc(item.t)}</strong><span>${esc(item.c)}</span></div>`
  )).join('');

  const renderMini = (list) => list.map((item) => (
    `<div class="mini"><strong>${esc(item.t)}</strong><span>${esc(item.c)}</span></div>`
  )).join('');

  const renderQuick = (list) => list.map((item) => (
    `<div class="tile"><div class="label">${esc(item.l)}</div><div class="value">${esc(item.v)}</div></div>`
  )).join('');

  const renderActions = (list) => list.map((item) => (
    `<a href="${esc(item.h)}" class="btn ${esc(item.c)}">${esc(item.l)}</a>`
  )).join('');

  function parseBirthDate(value) {
    return ageApi.parseBirthDate ? ageApi.parseBirthDate(value) : null;
  }

  function actualAge(value) {
    return ageApi.calculateActualAgeFromBirthDate
      ? ageApi.calculateActualAgeFromBirthDate(value)
      : null;
  }

  function dateText(value) {
    return parseBirthDate(value)?.formatted || String(value || '').trim();
  }

  function teamStatusText(status) {
    if (status === 'registered') return 'დარეგისტრირებული';
    if (status === 'free-agent') return 'უგუნდოდ';
    if (status === 'custom') return 'ახალი გუნდი';
    return safe(status);
  }

  function normalizeTeamText(value) {
    if (window.siteTeams?.normalizeText) {
      return window.siteTeams.normalizeText(value);
    }
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function normalizeAgeGroupKey(value) {
    return ageApi.normalizeAgeGroupKey
      ? ageApi.normalizeAgeGroupKey(value)
      : String(value || '').trim().toLowerCase();
  }

  function getAgeGroups() {
    return ageApi.getAgeGroups ? ageApi.getAgeGroups() : [
      { key: 'pro', label: 'PRO' },
      { key: 'u19', label: 'U19' },
      { key: 'u17', label: 'U17' },
      { key: 'u16', label: 'U16' },
      { key: 'u15', label: 'U15' },
      { key: 'u14', label: 'U14' },
      { key: 'u13', label: 'U13' },
      { key: 'u12', label: 'U12' },
      { key: 'u11', label: 'U11' },
      { key: 'u10', label: 'U10' },
      { key: 'u9', label: 'U9' },
      { key: 'u8', label: 'U8' }
    ];
  }

  function ageGroupLabel(key) {
    return ageApi.getAgeGroupLabel
      ? ageApi.getAgeGroupLabel(key)
      : String(key || '').toUpperCase();
  }

  function getManagedConfig(role) {
    if (role === 'player') {
      return {
        title: 'ჩემი გუნდი და ასაკობრივი',
        copy: 'აქედან შეგიძლია საკუთარი გუნდის შეცვლა, უგუნდოდ გადასვლა და ასაკობრივი კატეგორიის ხელით კორექტირება.',
        teamLabel: 'მიმდინარე გუნდი',
        saveLabel: 'ცვლილებების შენახვა',
        removeLabel: 'უგუნდოდ გადაყვანა',
        teamKey: 'playerTeam',
        teamRouteKey: 'playerTeamRoute',
        teamSlugKey: 'playerTeamSlug',
        teamStatusKey: 'playerTeamStatus',
        teamRegisteredKey: 'playerTeamRegistered',
        birthDateKey: 'playerBirthDate',
        birthYearKey: 'playerBirthYear',
        ageValueKey: 'playerAge',
        ageCategoryKey: 'playerAgeCategory',
        ageCategoryAutoKey: 'playerAgeCategoryAuto',
        ageCategoryOverrideKey: 'playerAgeCategoryOverride',
        ageSeasonYearKey: 'playerAgeSeasonYear'
      };
    }

    if (role === 'parent') {
      return {
        title: 'ბავშვის გუნდი და ასაკობრივი',
        copy: 'აქედან შეგიძლია ბავშვის გუნდის შეცვლა, გუნდიდან მოხსნა და საჭიროების შემთხვევაში ასაკობრივი კატეგორიის ხელით გადაკეთება.',
        teamLabel: 'ბავშვის მიმდინარე გუნდი',
        saveLabel: 'ბავშვის მონაცემების შენახვა',
        removeLabel: 'ბავშვის უგუნდოდ გადაყვანა',
        teamKey: 'childTeam',
        teamRouteKey: 'childTeamRoute',
        teamSlugKey: 'childTeamSlug',
        teamStatusKey: 'childTeamStatus',
        teamRegisteredKey: 'childTeamRegistered',
        birthDateKey: 'childBirthDate',
        birthYearKey: 'childBirthYear',
        ageValueKey: 'childAge',
        ageCategoryKey: 'childAgeCategory',
        ageCategoryAutoKey: 'childAgeCategoryAuto',
        ageCategoryOverrideKey: 'childAgeCategoryOverride',
        ageSeasonYearKey: 'childAgeSeasonYear'
      };
    }

    return null;
  }

  function resolveAgeState(profile, config, overrideValue) {
    const settings = {
      birthDate: profile?.[config.birthDateKey],
      birthYear: profile?.[config.birthYearKey],
      overrideKey: overrideValue ?? profile?.[config.ageCategoryOverrideKey],
      autoKey: profile?.[config.ageCategoryAutoKey],
      fallbackKey: profile?.[config.ageCategoryKey]
    };

    if (ageApi.resolveAgeGroupState) {
      return ageApi.resolveAgeGroupState(settings);
    }

    const effectiveKey = normalizeAgeGroupKey(
      settings.overrideKey || settings.autoKey || settings.fallbackKey || 'pro'
    ) || 'pro';

    return {
      seasonYear: new Date().getFullYear(),
      birthYear: Number(settings.birthYear) || null,
      autoKey: effectiveKey,
      overrideKey: normalizeAgeGroupKey(settings.overrideKey),
      effectiveKey,
      manual: Boolean(settings.overrideKey),
      actualAge: actualAge(settings.birthDate)
    };
  }

  function ageCategoryValue(state) {
    const effectiveLabel = ageGroupLabel(state.effectiveKey);
    const autoLabel = ageGroupLabel(state.autoKey);
    if (state.manual && state.effectiveKey !== state.autoKey) {
      return `${effectiveLabel} (ხელით, ავტომატურად ${autoLabel})`;
    }
    if (state.manual) {
      return `${effectiveLabel} (ხელით მითითებული)`;
    }
    return `${effectiveLabel} (ავტომატური)`;
  }

  function resolveTeamSelection(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) {
      return { name: '', city: '', route: '', slug: '', registered: false, kind: 'empty' };
    }

    if (normalizeTeamText(value) === normalizeTeamText(TEAM_FREE_AGENT)) {
      return { name: TEAM_FREE_AGENT, city: '', route: '', slug: '', registered: false, kind: 'free-agent' };
    }

    const matched = window.siteTeams?.findTeamByName
      ? window.siteTeams.findTeamByName(value)
      : null;

    if (matched) {
      return {
        name: matched.name,
        city: matched.city || '',
        route: matched.route || '',
        slug: matched.slug || '',
        registered: true,
        kind: 'registered'
      };
    }

    return { name: value, city: '', route: '', slug: '', registered: false, kind: 'custom' };
  }

  function getTeamSuggestions(query) {
    const value = String(query || '').trim();
    const suggestions = [];
    const seen = new Set();

    const push = (selection) => {
      if (!selection?.name) return;
      const key = `${selection.kind}:${normalizeTeamText(selection.name)}`;
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push(selection);
    };

    const teams = window.siteTeams?.searchTeams
      ? window.siteTeams.searchTeams(value, 6)
      : [];

    teams.forEach((team) => push({
      name: team.name,
      city: team.city || '',
      route: team.route || '',
      slug: team.slug || '',
      registered: true,
      kind: 'registered'
    }));

    if (!value || normalizeTeamText(TEAM_FREE_AGENT).includes(normalizeTeamText(value))) {
      push(resolveTeamSelection(TEAM_FREE_AGENT));
    }

    const exact = resolveTeamSelection(value);
    if (value && exact.kind === 'custom') {
      push(exact);
    }

    return suggestions.slice(0, 7);
  }

  function setTeamEditorStatus(message, state) {
    const status = document.getElementById('teamEditorStatus');
    if (!status) return;
    if (!message) {
      status.hidden = true;
      status.textContent = '';
      status.dataset.state = 'info';
      return;
    }
    status.hidden = false;
    status.dataset.state = state || 'info';
    status.textContent = message;
  }

  function updateTeamFieldHint() {
    const input = document.getElementById('teamEditorInput');
    const hint = document.getElementById('teamEditorHint');
    if (!input || !hint) {
      return resolveTeamSelection('');
    }

    const selection = resolveTeamSelection(input.value);
    const defaultHelper = hint.dataset.defaultHelper || '';
    if (!selection.name) {
      hint.textContent = defaultHelper;
      return selection;
    }
    if (selection.kind === 'registered') {
      hint.textContent = selection.route
        ? `${selection.name} უკვე დარეგისტრირებულია და გუნდის გვერდიც აქვს.`
        : `${selection.name} უკვე დარეგისტრირებულია, მაგრამ ცალკე გუნდის გვერდი ჯერ არ არის.`;
      return selection;
    }
    if (selection.kind === 'free-agent') {
      hint.textContent = 'თუ შეინახავ, პროფილი გუნდიდან მოიხსნება და უგუნდოდ გამოჩნდება.';
      return selection;
    }
    hint.textContent = `${selection.name} ახალი ჩანაწერის სახით შეინახება, რადგან გუნდების სიაში ჯერ არ არსებობს.`;
    return selection;
  }

  function hideTeamSuggestions() {
    const box = document.getElementById('teamEditorSuggestions');
    if (!box) return;
    box.hidden = true;
    box.innerHTML = '';
  }

  function renderTeamSuggestions(showWhenEmpty) {
    const input = document.getElementById('teamEditorInput');
    const box = document.getElementById('teamEditorSuggestions');
    if (!input || !box) return;

    const value = String(input.value || '').trim();
    const suggestions = getTeamSuggestions(value);
    if ((!value && !showWhenEmpty) || !suggestions.length) {
      hideTeamSuggestions();
      return;
    }

    box.innerHTML = suggestions.map((selection) => {
      const tag = selection.kind === 'registered'
        ? 'გუნდი'
        : (selection.kind === 'free-agent' ? 'თავისუფალი' : 'ახალი');
      const copy = selection.kind === 'registered'
        ? safe(selection.city, 'დარეგისტრირებული გუნდი')
        : (selection.kind === 'free-agent' ? 'გუნდთან ბმა მოიხსნება' : 'ახალი ტექსტური ჩანაწერი');

      return `
        <button type="button" class="team-option" data-team-value="${esc(selection.name)}">
          <span class="team-option-main">
            <strong>${esc(selection.name)}</strong>
            <span>${esc(copy)}</span>
          </span>
          <span class="team-option-tag">${esc(tag)}</span>
        </button>
      `;
    }).join('');
    box.hidden = false;

    box.querySelectorAll('[data-team-value]').forEach((button) => {
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        input.value = button.dataset.teamValue || '';
        hideTeamSuggestions();
        updateTeamFieldHint();
      });
    });
  }

  function updateAgeGroupHint(state) {
    const hint = document.getElementById('ageGroupHint');
    if (!hint) return;
    const autoLabel = ageGroupLabel(state.autoKey);
    const effectiveLabel = ageGroupLabel(state.effectiveKey);

    if (state.manual && state.effectiveKey !== state.autoKey) {
      hint.textContent = `ახლა ხელით არჩეულია ${effectiveLabel}. ავტომატური გადათვლა ამ სეზონზე ${autoLabel}-ს გაძლევს და იანვრიდან თავიდან განახლდება.`;
      return;
    }
    if (state.manual) {
      hint.textContent = `ხელით მითითებული კატეგორია ემთხვევა ავტომატურს: ${effectiveLabel}. სურვილის შემთხვევაში შეგიძლია ისევ ავტომატურზე დაბრუნდე.`;
      return;
    }
    hint.textContent = `ავტომატური რეჟიმი ამ სეზონზე გაძლევს ${autoLabel}-ს. დაბადების დღეზე ჯგუფი არ იცვლება და იანვრიდან თავიდან ითვლება.`;
  }

  function buildCommonPassport(user) {
    return [
      { l: 'სახელი და გვარი', v: safe(user.user_metadata?.full_name || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ')) },
      { l: 'ელ-ფოსტა', v: safe(user.email) },
      { l: 'ტელეფონი', v: safe(user.user_metadata?.phone_number) },
      { l: 'პირადი ნომერი', v: safe(user.user_metadata?.personal_number) }
    ];
  }

  function buildManageNotes(profile, config, state) {
    return [
      {
        t: 'მიმდინარე გუნდი',
        c: profile?.[config.teamKey]
          ? `${profile[config.teamKey]} არის მიმდინარე ჩანაწერი. სურვილის შემთხვევაში შეგიძლია სხვა გუნდში გადაიყვანო ან უგუნდოდ გადაყვანა.`
          : 'თუ გუნდი არ არის შერჩეული, შეგიძლია აქედან დაუკავშირო არსებული კლუბი ან ახალი ჩანაწერი შექმნა.'
      },
      {
        t: 'სეზონური გადათვლა',
        c: `ავტომატური კატეგორია ახლა არის ${ageGroupLabel(state.autoKey)} და ითვლება მიმდინარე წლის 1 იანვრის ასაკით. დაბადების დღეზე ჯგუფი არ იცვლება, იანვრიდან კი თავიდან ითვლება.`
      },
      {
        t: 'ხელით შეცვლა',
        c: state.manual
          ? `ახლა ხელით არჩეულია ${ageGroupLabel(state.effectiveKey)}. თუ ავტომატურ რეჟიმზე დაბრუნება გინდა, ასაკობრივში აირჩიე "ავტომატური".`
          : 'თუ მოთამაშე უფროსებში თამაშობს, შეგიძლია ასაკობრივი ჯგუფი ხელით გადააყვანო და შეინახო.'
      }
    ];
  }

  function buildRoleView(role, profile, user, back) {
    const common = buildCommonPassport(user);
    const displayName = window.siteAuth?.getUserDisplayName
      ? window.siteAuth.getUserDisplayName(user)
      : (user.email || 'პროფილი');

    if (role === 'player') {
      const config = getManagedConfig(role);
      const state = resolveAgeState(profile, config);
      const currentAge = state.actualAge ?? profile.playerAge ?? '-';
      return {
        eye: 'ციფრული საფეხბურთო პასპორტი',
        lead: 'ეს არის შენი მოთამაშის პროფილი. აქ დაგიგროვდება გუნდი, ვიდეო CV, სტატისტიკა და სეზონური ასაკობრივი ისტორია.',
        side: 'აქედან შეგიძლია მართო გუნდი, ასაკობრივი ჯგუფი და დაბრუნდე ზუსტად იმავე გვერდზე, საიდანაც გახსენი პროფილი.',
        quick: [
          { l: 'ასაკი', v: safe(currentAge, '-') },
          { l: 'ასაკობრივი', v: ageCategoryValue(state) },
          { l: 'პოზიცია', v: safe(profile.playerPosition) },
          { l: 'გუნდი', v: safe(profile.playerTeam, TEAM_FREE_AGENT) }
        ],
        pass: common.concat([
          { l: 'დაბადების თარიღი', v: safe(dateText(profile.playerBirthDate)) },
          { l: 'ასაკი', v: safe(currentAge, '-') },
          { l: 'ასაკობრივი კატეგორია', v: ageCategoryValue(state) },
          { l: 'პოზიცია', v: safe(profile.playerPosition) },
          { l: 'უპირატესი ფეხი', v: safe(profile.playerFoot) },
          { l: 'მიმდინარე გუნდი', v: safe(profile.playerTeam, TEAM_FREE_AGENT), h: profile.playerTeamRoute || '' },
          { l: 'გუნდის სტატუსი', v: teamStatusText(profile.playerTeamStatus) }
        ]),
        stat: [
          { l: 'ვიდეო CV', v: '0', c: 'ატვირთული highlights აქ გამოჩნდება.' },
          { l: 'სტატისტიკა', v: 'მალე', c: 'გოლები, ასისტები და წუთები ამ პროფილს დაემატება.' },
          { l: 'ასაკობრივი', v: ageGroupLabel(state.effectiveKey), c: state.manual ? 'კატეგორია ახლა ხელით არის მითითებული.' : 'კატეგორია სეზონურად ავტომატურად ითვლება.' }
        ],
        port: {
          t: 'მოთამაშის კარიერული ჰაბი',
          c: 'ეს სექცია გახდება შენი ძირითადი სამუშაო სივრცე ვიდეო CV-სთვის, სტატისტიკისთვის და სკაუტინგის ბმებისთვის.',
          a: [
            profile.playerTeamRoute
              ? { h: profile.playerTeamRoute, l: 'ჩემი გუნდის გვერდი', c: 'btn-red' }
              : { h: back, l: 'წინა გვერდზე დაბრუნება', c: 'btn-red' },
            { h: 'pexburtelebi.html', l: 'ფეხბურთელების ბაზა', c: 'btn-white' },
            { h: 'gundebi.html', l: 'გუნდების გვერდი', c: 'btn-white' }
          ],
          n: [
            { t: 'პროფილი', c: 'რეგისტრაციისას შევსებული მოთამაშის მონაცემები უკვე ჩანს.' },
            { t: 'სეზონი', c: 'ასაკობრივი ჯგუფი დაბადების დღეზე არ იცვლება და იანვრიდან ახლდება.' },
            { t: 'შემდეგი ნაბიჯი', c: 'შემდეგ ეტაპზე აქ შეგვიძლია ვიდეო CV-ს ატვირთვაც მივაბათ.' }
          ]
        },
        mini: [
          { t: 'როლი', c: 'მოთამაშის პროფილი აქტიურია და მზად არის მართვისთვის.' },
          { t: 'კონტაქტი', c: `${safe(user.email)} / ${safe(user.user_metadata?.phone_number, 'ტელეფონი არ არის დამატებული')}` },
          { t: 'გუნდი', c: profile.playerTeamRoute ? 'თუ გუნდის გვერდი არსებობს, ერთი კლიკით გადახვალ.' : 'თუ გუნდის გვერდი ჯერ არ არსებობს, ჩანაწერი მაინც შეინახება.' }
        ],
        config,
        manageNotes: buildManageNotes(profile, config, state),
        name: displayName
      };
    }

    if (role === 'parent') {
      const config = getManagedConfig(role);
      const state = resolveAgeState(profile, config);
      const currentAge = state.actualAge ?? profile.childAge ?? '-';
      return {
        eye: 'მშობლის პროფილი',
        lead: 'ეს არის მშობლის სამუშაო სივრცე, სადაც ბავშვის მონაცემები, გუნდი და ასაკობრივი კატეგორია ერთად იმართება.',
        side: 'აქედან დაინახავ ბავშვის ასაკს, პოზიციას, გუნდს, ასაკობრივს და დაბრუნდები იმავე გვერდზე, საიდანაც გახსენი პროფილი.',
        quick: [
          { l: 'ბავშვი', v: safe(profile.childName) },
          { l: 'ბავშვის ასაკი', v: safe(currentAge, '-') },
          { l: 'ასაკობრივი', v: ageCategoryValue(state) },
          { l: 'გუნდი', v: safe(profile.childTeam, TEAM_FREE_AGENT) }
        ],
        pass: common.concat([
          { l: 'ბავშვის სახელი', v: safe(profile.childName) },
          { l: 'ბავშვის დაბადების თარიღი', v: safe(dateText(profile.childBirthDate)) },
          { l: 'ბავშვის ასაკი', v: safe(currentAge, '-') },
          { l: 'ბავშვის ასაკობრივი კატეგორია', v: ageCategoryValue(state) },
          { l: 'ბავშვის პოზიცია', v: safe(profile.childPosition) },
          { l: 'ბავშვის გუნდი', v: safe(profile.childTeam, TEAM_FREE_AGENT), h: profile.childTeamRoute || '' },
          { l: 'ბავშვის გუნდის სტატუსი', v: teamStatusText(profile.childTeamStatus) },
          { l: 'ბავშვის ფეხი', v: safe(profile.childFoot) },
          { l: 'კავშირი ბავშვთან', v: safe(profile.parentRelation) }
        ]),
        stat: [
          { l: 'პროგრესი', v: 'მალე', c: 'შვილის პროგრესის მონიტორინგი აქ დაემატება.' },
          { l: 'ვიდეოები', v: '0', c: 'ვიდეო CV-ები და ატვირთვები აქ გამოჩნდება.' },
          { l: 'ასაკობრივი', v: ageGroupLabel(state.effectiveKey), c: state.manual ? 'ბავშვის კატეგორია ხელით არის მორგებული.' : 'ბავშვის კატეგორია სეზონურად ავტომატურად ითვლება.' }
        ],
        port: {
          t: 'მშობლის პანელი',
          c: 'ეს სივრცე განკუთვნილია შვილის პროგრესის, გუნდის ბმის, ვიდეოების და მომავალში გამოწერების ან გადახდების მართვისთვის.',
          a: [
            profile.childTeamRoute
              ? { h: profile.childTeamRoute, l: 'ბავშვის გუნდის გვერდი', c: 'btn-red' }
              : { h: back, l: 'წინა გვერდზე დაბრუნება', c: 'btn-red' },
            { h: 'gundebi.html', l: 'გუნდების ნახვა', c: 'btn-white' },
            { h: 'pexburtelebi.html', l: 'ტალანტების ბაზა', c: 'btn-white' }
          ],
          n: [
            { t: 'აქტიური პროფილი', c: 'მშობლის საკონტაქტო მონაცემები უკვე შენახულია.' },
            { t: 'ბავშვის გუნდი', c: 'თუ გუნდი დარეგისტრირებულია, პროფილიდან პირდაპირ შეგიძლია გუნდზე გადასვლაც.' },
            { t: 'შემდეგი ნაბიჯი', c: 'შემდეგ ეტაპზე ბავშვის სტატისტიკაც აქვე დაემატება.' }
          ]
        },
        mini: [
          { t: 'როლი', c: 'მშობლის პროფილი აქტიურია და ბავშვის მონაცემებს მართავს.' },
          { t: 'კონტაქტი', c: `${safe(user.email)} / ${safe(user.user_metadata?.phone_number, 'ტელეფონი არ არის დამატებული')}` },
          { t: 'ასაკობრივი', c: 'ბავშვის ასაკობრივი ჯგუფი იანვრიდან თავიდან გადაითვლება, მაგრამ შეგიძლია ხელითაც მორგება.' }
        ],
        config,
        manageNotes: buildManageNotes(profile, config, state),
        name: displayName
      };
    }

    return {
      eye: 'აგენტის პროფილი',
      lead: 'ეს არის აგენტის პროფილი, სადაც მოთამაშეების პორტფოლიო და მომავალი შეთავაზებები გაერთიანდება.',
      side: 'აქედან დაინახავ სააგენტოს ძირითად ინფორმაციას და დაბრუნდები საწყის გვერდზე.',
      quick: [
        { l: 'სააგენტო', v: safe(profile.agencyName) },
        { l: 'მოთამაშეები', v: safe(profile.playersManaged, '0') },
        { l: 'რეგიონი', v: safe(profile.agencyRegion) },
        { l: 'მიმართულება', v: safe(profile.agentFocus) }
      ],
      pass: buildCommonPassport(user).concat([
        { l: 'სააგენტო / ბრენდი', v: safe(profile.agencyName) },
        { l: 'რამდენ მოთამაშეს წარმოადგენს', v: safe(profile.playersManaged, '0') },
        { l: 'რეგიონი / ბაზარი', v: safe(profile.agencyRegion) },
        { l: 'ძირითადი მიმართულება', v: safe(profile.agentFocus) }
      ]),
      stat: [
        { l: 'მოთამაშეები', v: safe(profile.playersManaged, '0'), c: 'რეგისტრაციაში მითითებული რაოდენობა.' },
        { l: 'აქტიური კავშირები', v: '0', c: 'კლუბებთან და სკაუტებთან ბმები აქ დაემატება.' },
        { l: 'შეთავაზებები', v: 'მალე', c: 'აგენტის სამუშაო მოდულები აქ გამოჩნდება.' }
      ],
      port: {
        t: 'აგენტის სამუშაო სივრცე',
        c: 'შემდეგ ეტაპზე შეგვიძლია ამ პროფილზე მოთამაშეების ცალკე დამატება, შეთავაზებები და კლუბებთან ბმებიც მივაბათ.',
        a: [
          { h: back, l: 'წინა გვერდზე დაბრუნება', c: 'btn-red' },
          { h: 'pexburtelebi.html', l: 'ფეხბურთელების ბაზა', c: 'btn-white' },
          { h: 'gundebi.html', l: 'გუნდების ბაზა', c: 'btn-white' }
        ],
        n: [
          { t: 'სააგენტო', c: 'აგენტის ძირითადი მონაცემები უკვე შენახულია.' },
          { t: 'ნავიგაცია', c: 'სხვა გვერდებზე გადასვლა ზედა მენიუდან შეგიძლია.' },
          { t: 'შემდეგი ნაბიჯი', c: 'შემდეგ ეტაპზე მოთამაშეების მიბმასაც დავამატებთ.' }
        ]
      },
      mini: [
        { t: 'როლი', c: 'აგენტის პროფილი უკვე შექმნილია.' },
        { t: 'კონტაქტი', c: `${safe(user.email)} / ${safe(user.user_metadata?.phone_number, 'ტელეფონი არ არის დამატებული')}` },
        { t: 'დაბრუნება', c: 'ღილაკი დაგაბრუნებს იმავე გვერდზე, საიდანაც გახსენი პროფილი.' }
      ],
      config: null,
      manageNotes: [],
      name: displayName
    };
  }

  async function syncSeasonalProfile(user, role, profile, client) {
    const config = getManagedConfig(role);
    if (!config || !client) {
      return { user, profile };
    }

    const nextProfile = { ...(profile || {}) };
    const state = resolveAgeState(nextProfile, config);
    let changed = false;

    if (state.birthYear && String(nextProfile[config.birthYearKey] || '') !== String(state.birthYear)) {
      nextProfile[config.birthYearKey] = String(state.birthYear);
      changed = true;
    }
    if (state.actualAge !== null && String(nextProfile[config.ageValueKey] || '') !== String(state.actualAge)) {
      nextProfile[config.ageValueKey] = String(state.actualAge);
      changed = true;
    }
    if (String(nextProfile[config.ageCategoryAutoKey] || '') !== String(state.autoKey || '')) {
      nextProfile[config.ageCategoryAutoKey] = state.autoKey || '';
      changed = true;
    }
    if (String(nextProfile[config.ageCategoryKey] || '') !== String(state.effectiveKey || '')) {
      nextProfile[config.ageCategoryKey] = state.effectiveKey || '';
      changed = true;
    }
    if (String(nextProfile[config.ageSeasonYearKey] || '') !== String(state.seasonYear || '')) {
      nextProfile[config.ageSeasonYearKey] = String(state.seasonYear || '');
      changed = true;
    }

    if (!changed) {
      return { user, profile: nextProfile };
    }

    try {
      const { data, error } = await client.auth.updateUser({
        data: {
          ...user.user_metadata,
          profile: nextProfile
        }
      });

      if (error) {
        throw error;
      }

      return { user: data?.user || user, profile: nextProfile };
    } catch (error) {
      console.error(error);
      return { user, profile: nextProfile };
    }
  }

  function renderAgeGroupSelect(profile, config) {
    const select = document.getElementById('ageGroupSelect');
    if (!select) {
      return resolveAgeState(profile, config);
    }

    const state = resolveAgeState(profile, config);
    const autoLabel = ageGroupLabel(state.autoKey);
    select.innerHTML = [
      `<option value="">ავტომატური (${esc(autoLabel)})</option>`,
      ...getAgeGroups().map((group) => `<option value="${esc(group.key)}">${esc(group.label)}</option>`)
    ].join('');
    select.value = state.manual ? state.overrideKey : '';
    updateAgeGroupHint(state);
    return state;
  }

  function renderTeamManagement(role, profile) {
    const section = document.getElementById('teamManage');
    const config = getManagedConfig(role);
    if (!section || !config) {
      if (section) {
        section.hidden = true;
      }
      return;
    }

    section.hidden = false;
    teamManageState.config = config;
    teamManageState.profile = { ...(profile || {}) };

    document.getElementById('teamManageTitle').textContent = config.title;
    document.getElementById('teamManageCopy').textContent = config.copy;
    document.getElementById('teamEditorLabel').textContent = config.teamLabel;
    document.getElementById('saveTeamBtn').textContent = config.saveLabel;
    document.getElementById('removeTeamBtn').textContent = config.removeLabel;

    const input = document.getElementById('teamEditorInput');
    if (input) {
      input.value = String(profile?.[config.teamKey] || '').trim() || TEAM_FREE_AGENT;
    }

    updateTeamFieldHint();
    const state = renderAgeGroupSelect(profile, config);
    document.getElementById('teamManageNotes').innerHTML = renderNotes(buildManageNotes(profile, config, state));
    setTeamEditorStatus('');
  }

  function initializeTeamEditor() {
    const input = document.getElementById('teamEditorInput');
    const select = document.getElementById('ageGroupSelect');
    const saveButton = document.getElementById('saveTeamBtn');
    const removeButton = document.getElementById('removeTeamBtn');

    if (input && input.dataset.ready !== 'true') {
      input.dataset.ready = 'true';
      input.addEventListener('focus', () => renderTeamSuggestions(true));
      input.addEventListener('input', () => {
        renderTeamSuggestions(false);
        updateTeamFieldHint();
        setTeamEditorStatus('');
      });
      input.addEventListener('blur', () => {
        window.setTimeout(() => {
          hideTeamSuggestions();
          updateTeamFieldHint();
        }, 120);
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          hideTeamSuggestions();
        }
      });
    }

    if (select && select.dataset.ready !== 'true') {
      select.dataset.ready = 'true';
      select.addEventListener('change', () => {
        if (!teamManageState.config) {
          return;
        }
        const state = resolveAgeState(teamManageState.profile, teamManageState.config, select.value || '');
        updateAgeGroupHint(state);
        setTeamEditorStatus('');
      });
    }

    if (saveButton && saveButton.dataset.ready !== 'true') {
      saveButton.dataset.ready = 'true';
      saveButton.addEventListener('click', () => persistManagedProfile(false));
    }

    if (removeButton && removeButton.dataset.ready !== 'true') {
      removeButton.dataset.ready = 'true';
      removeButton.addEventListener('click', () => persistManagedProfile(true));
    }
  }

  async function persistManagedProfile(removeTeam) {
    const config = teamManageState.config;
    const user = teamManageState.user;
    const client = teamManageState.client;
    if (!config || !user || !client) {
      return;
    }

    const input = document.getElementById('teamEditorInput');
    const select = document.getElementById('ageGroupSelect');
    const saveButton = document.getElementById('saveTeamBtn');
    const removeButton = document.getElementById('removeTeamBtn');
    const selection = removeTeam
      ? resolveTeamSelection(TEAM_FREE_AGENT)
      : resolveTeamSelection(input?.value);

    if (!selection.name) {
      setTeamEditorStatus('აირჩიე გუნდი, მიუთითე უგუნდოდ ან ჩაწერე ახალი გუნდი.', 'error');
      input?.focus();
      return;
    }

    const nextProfile = { ...(user.user_metadata?.profile || {}) };
    nextProfile[config.teamKey] = selection.name;
    nextProfile[config.teamRegisteredKey] = String(selection.registered);
    nextProfile[config.teamRouteKey] = selection.route || '';
    nextProfile[config.teamSlugKey] = selection.slug || '';
    nextProfile[config.teamStatusKey] = selection.kind;

    const state = resolveAgeState(nextProfile, config, select?.value || '');
    nextProfile[config.ageCategoryOverrideKey] = normalizeAgeGroupKey(select?.value || '');
    nextProfile[config.ageCategoryAutoKey] = state.autoKey || '';
    nextProfile[config.ageCategoryKey] = state.effectiveKey || '';
    nextProfile[config.ageSeasonYearKey] = String(state.seasonYear || '');
    if (state.actualAge !== null) {
      nextProfile[config.ageValueKey] = String(state.actualAge);
    }
    if (state.birthYear) {
      nextProfile[config.birthYearKey] = String(state.birthYear);
    }

    saveButton.disabled = true;
    removeButton.disabled = true;
    setTeamEditorStatus('ინფორმაცია ინახება...', 'info');

    try {
      const { data, error } = await client.auth.updateUser({
        data: {
          ...user.user_metadata,
          profile: nextProfile
        }
      });

      if (error) {
        throw error;
      }

      teamManageState.user = data?.user || user;
      teamManageState.profile = nextProfile;
      if (input) {
        input.value = selection.name;
      }

      setTeamEditorStatus(
        removeTeam
          ? `პროფილი წარმატებით გადავიდა უგუნდოდ. ასაკობრივი ჯგუფი დარჩა ${ageGroupLabel(state.effectiveKey)}-ზე.`
          : `ცვლილებები შენახულია. ახლა პროფილი მიბმულია "${selection.name}"-ზე და ასაკობრივი არის ${ageGroupLabel(state.effectiveKey)}.`,
        'success'
      );

      window.setTimeout(() => {
        location.href = here();
      }, 650);
    } catch (error) {
      setTeamEditorStatus(error?.message || 'ცვლილების შენახვა ვერ შესრულდა. სცადე ხელახლა.', 'error');
    } finally {
      saveButton.disabled = false;
      removeButton.disabled = false;
    }
  }

  async function init() {
    const back = from();
    const label = backLabel(back);
    ['backTop', 'backContent'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.href = back;
        element.textContent = label;
      }
    });

    const auth = window.siteAuth || {};
    const { client, user } = await auth.requireAuth({ redirect: here() });
    if (!user) {
      return;
    }

    const role = auth.getUserRole ? auth.getUserRole(user) : 'player';
    if (role === 'admin') {
      location.href = 'admin-deshboard.html';
      return;
    }

    let currentUser = user;
    let currentProfile = user.user_metadata?.profile || {};
    const syncResult = await syncSeasonalProfile(currentUser, role, currentProfile, client);
    currentUser = syncResult.user;
    currentProfile = syncResult.profile;

    teamManageState.user = currentUser;
    teamManageState.profile = currentProfile;
    teamManageState.role = role;
    teamManageState.client = client;
    teamManageState.back = back;

    const view = buildRoleView(role, currentProfile, currentUser, back);
    document.getElementById('eyebrow').textContent = view.eye;
    document.getElementById('roleBadge').textContent = roleLabel(role);
    document.getElementById('memberSince').textContent = `გაწევრიანდა ${new Date(currentUser.created_at).toLocaleDateString('ka-GE')}`;
    document.getElementById('avatar').textContent = initials(currentUser);
    document.getElementById('name').textContent = view.name;
    document.getElementById('lead').textContent = view.lead;
    document.getElementById('sideCopy').textContent = view.side;
    document.getElementById('quick').innerHTML = renderQuick(view.quick);
    document.getElementById('passportGrid').innerHTML = renderItems(view.pass);
    document.getElementById('statsGrid').innerHTML = renderStats(view.stat);
    document.getElementById('portfolioTitle').textContent = view.port.t;
    document.getElementById('portfolioCopy').textContent = view.port.c;
    document.getElementById('portfolioActions').innerHTML = renderActions(view.port.a);
    document.getElementById('notes').innerHTML = renderNotes(view.port.n);
    document.getElementById('mini').innerHTML = renderMini(view.mini);

    initializeTeamEditor();
    renderTeamManagement(role, currentProfile);

    document.getElementById('logoutBtn').addEventListener('click', () => {
      if (window.siteAuth?.signOut) {
        window.siteAuth.signOut({ redirect: back || 'index.html' });
        return;
      }
      location.href = back || 'index.html';
    });

    document.title = `${view.name} | DM Football Georgia`;
    showApp();
  }

  init().catch((error) => {
    showLoadingError(error?.message);
    return;
    document.querySelector('#loading .box').innerHTML = `<h1>პროფილის ჩატვირთვა ვერ შესრულდა</h1><p>${esc(error?.message || 'სცადე ხელახლა შესვლა ან გვერდის განახლება.')}</p>`;
  });
})();
