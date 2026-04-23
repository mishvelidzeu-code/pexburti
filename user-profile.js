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
  const dataEditorState = {
    role: '',
    user: null,
    profile: {},
    back: 'index.html',
    client: null
  };
  const videoEditorState = {
    role: '',
    user: null,
    profile: {},
    client: null
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
    academy: 'გუნდის მენეჯერი',
    admin: 'ადმინისტრატორი'
  })[role] || 'მომხმარებელი';

  const PERFORMANCE_FIELDS = {
    averageRating: { label: 'საშუალო შეფასება', note: 'ავტომატურად დათვლილი საერთო შეფასება', max: 10, step: '0.1', precision: 1, computed: true },
    matchesPlayed: { label: 'თამაშები', note: 'ნათამაშები მატჩების რაოდენობა', max: 80, step: '1', precision: 0 },
    matches90: { label: 'წუთები / 90', note: 'ფაქტობრივი 90-წუთიანები', max: 60, step: '0.1', precision: 1 },
    yellowCards: { label: 'ყვითელი ბარათები', note: 'ყვითელი ბარათები', max: 25, step: '1', precision: 0 },
    redCards: { label: 'წითელი ბარათები', note: 'წითელი ბარათები', max: 10, step: '1', precision: 0 },
    goalContributions: { label: 'გოლში მონაწილეობა', note: 'გოლი + ასისტი', max: 80, step: '1', precision: 0, computed: true },
    savePercentage: { label: 'სეივების პროცენტი', note: 'სეივების პროცენტი', max: 100, step: '0.1', precision: 1, suffix: '%' },
    goalsConcededPer90: { label: 'გაშვებული გოლი / 90', note: 'გაშვებული გოლი / 90', max: 5, step: '0.1', precision: 1, inverse: true },
    cleanSheets: { label: 'მშრალი მატჩები', note: 'მშრალი მატჩები', max: 30, step: '1', precision: 0 },
    successfulDistribution: { label: 'განაწილების სიზუსტე %', note: 'ფეხით თამაშის სიზუსტე', max: 100, step: '0.1', precision: 1, suffix: '%' },
    highClaims: { label: 'მაღალი ბურთების აღება', note: 'გამოსვლების სიზუსტე', max: 50, step: '1', precision: 0 },
    tacklesWon: { label: 'მოგებული წართმევები', note: 'მოგებული წართმევები', max: 120, step: '1', precision: 0 },
    interceptions: { label: 'ჩაჭრები', note: 'ბურთის ჩაჭრა', max: 100, step: '1', precision: 0 },
    clearances: { label: 'მოგერიებები', note: 'მოგერიებები საჯარიმოდან', max: 180, step: '1', precision: 0 },
    aerialDuelsWon: { label: 'ჰაერში მოგებული დუელები %', note: 'ჰაერში მოგებული დუელები', max: 100, step: '0.1', precision: 1, suffix: '%' },
    possessionRegained: { label: 'დაბრუნებული ბურთები', note: 'დაბრუნებული ბურთები', max: 220, step: '1', precision: 0 },
    keyPasses: { label: 'საკვანძო პასები', note: 'პასები დარტყმისთვის', max: 120, step: '1', precision: 0 },
    progressivePasses: { label: 'პროგრესული პასები', note: 'წინ მიმტანი პასები', max: 220, step: '1', precision: 0 },
    passAccuracy: { label: 'პასის სიზუსტე %', note: 'პასების სიზუსტე', max: 100, step: '0.1', precision: 1, suffix: '%' },
    bigChancesCreated: { label: 'შექმნილი დიდი შანსები', note: 'დიდი შანსების შექმნა', max: 60, step: '1', precision: 0 },
    successfulDribbles: { label: 'წარმატებული დრიბლინგები', note: 'წარმატებული დრიბლინგები', max: 120, step: '1', precision: 0 },
    actualGoals: { label: 'გოლები', note: 'გატანილი გოლები', max: 50, step: '1', precision: 0 },
    assists: { label: 'ასისტები', note: 'ასისტები', max: 50, step: '1', precision: 0 },
    expectedGoals: { label: 'მოსალოდნელი გოლები (xG)', note: 'მოსალოდნელი გოლები', max: 50, step: '0.1', precision: 1 },
    shotsOnTarget: { label: 'კარში დარტყმები', note: 'კარში დარტყმები', max: 120, step: '1', precision: 0 },
    conversionRate: { label: 'რეალიზაციის პროცენტი %', note: 'დარტყმიდან გოლის პროცენტი', max: 100, step: '0.1', precision: 1, suffix: '%' },
    touchesInBox: { label: 'შეხებები საჯარიმოში', note: 'ბურთთან შეხება საჯარიმოში', max: 200, step: '1', precision: 0 },
    bigChancesMissed: { label: 'გაფუჭებული დიდი შანსები', note: 'გაფუჭებული რეალური მომენტები', max: 40, step: '1', precision: 0, inverse: true },
    trainingConsistency: { label: 'სავარჯიშო სტაბილურობა', note: 'სავარჯიშო რიტმი', max: 100, step: '1', precision: 0, suffix: '%' },
    duelWins: { label: 'მოგებული დუელები', note: 'მოგებული დუელები', max: 120, step: '1', precision: 0 },
    progressiveActions: { label: 'პროგრესული მოქმედებები', note: 'წინ მიმყვანი მოქმედებები', max: 120, step: '1', precision: 0 }
  };

  const PERFORMANCE_COMMON_FIELDS = ['matchesPlayed', 'matches90', 'yellowCards', 'redCards'];
  const PERFORMANCE_CONFIGS = {
    goalkeeper: {
      position: 'მეკარე',
      copy: 'მეკარის პროფილში აქცენტი კეთდება საიმედოობაზე, ფეხით თამაშზე და კარის დაცვაზე.',
      advanced: ['savePercentage', 'goalsConcededPer90', 'cleanSheets', 'successfulDistribution', 'highClaims'],
      radar: ['savePercentage', 'successfulDistribution', 'highClaims', 'cleanSheets', 'matches90']
    },
    defender: {
      position: 'დამცველი',
      copy: 'დამცველს უნდა უჩანდეს ბურთის დაბრუნებაც და შეტევაში ჩართვაც, ამიტომ აქ დაცვითი და შეტევითი რიცხვები ერთად იყრის თავს.',
      advanced: ['tacklesWon', 'interceptions', 'clearances', 'aerialDuelsWon', 'possessionRegained', 'cleanSheets', 'keyPasses', 'actualGoals', 'assists'],
      radar: ['tacklesWon', 'interceptions', 'aerialDuelsWon', 'possessionRegained', 'cleanSheets', 'goalContributions']
    },
    midfielder: {
      position: 'ნახევარმცველი',
      copy: 'ნახევარმცველის პროფილი ბალანსზეა აგებული: თამაშის მართვა, შემოქმედებითი პასი და დაცვითი ინტენსივობა ერთად უნდა ჩანდეს.',
      advanced: ['keyPasses', 'progressivePasses', 'passAccuracy', 'bigChancesCreated', 'successfulDribbles', 'tacklesWon', 'interceptions', 'cleanSheets', 'assists'],
      radar: ['keyPasses', 'progressivePasses', 'passAccuracy', 'tacklesWon', 'successfulDribbles', 'goalContributions']
    },
    forward: {
      position: 'თავდამსხმელი',
      copy: 'თავდამსხმელისთვის აქცენტი ეფექტიანობაზეა: რამდენად კარგად აქცევს მომენტს რეალურ შედეგში.',
      advanced: ['actualGoals', 'assists', 'expectedGoals', 'shotsOnTarget', 'conversionRate', 'touchesInBox', 'bigChancesMissed', 'keyPasses'],
      radar: ['actualGoals', 'shotsOnTarget', 'conversionRate', 'touchesInBox', 'assists', 'goalContributions']
    },
    general: {
      position: 'უნივერსალური პროფილი',
      copy: 'თუ პოზიცია ჯერ არ არის საბოლოოდ არჩეული, შეგიძლია უნივერსალური ძირითადი მაჩვენებლები შეავსო.',
      advanced: ['trainingConsistency', 'successfulDribbles', 'progressiveActions', 'duelWins', 'keyPasses', 'actualGoals', 'assists'],
      radar: ['trainingConsistency', 'successfulDribbles', 'progressiveActions', 'duelWins', 'keyPasses', 'goalContributions']
    }
  };

  const initials = (user) => (
    (user.user_metadata?.full_name || user.email || 'MF')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  ) || 'MF';

  function renderAvatar(user, role, profile) {
    const avatar = document.getElementById('avatar');
    if (!avatar) {
      return;
    }

    const image = getProfileImageSource(role, profile);
    if (image) {
      const name = window.siteAuth?.getUserDisplayName
        ? window.siteAuth.getUserDisplayName(user)
        : (user?.email || 'პროფილი');
      avatar.innerHTML = `<img src="${esc(image)}" alt="${esc(name)}">`;
      return;
    }

    avatar.textContent = initials(user);
  }

  function renderHeroCover(role, profile) {
    const cover = document.getElementById('heroCover');
    const media = document.getElementById('heroCoverMedia');
    if (!cover || !media) {
      return;
    }

    const image = getProfileImageSource(role, profile);
    if (image) {
      media.style.backgroundImage = `url("${String(image).replace(/"/g, '\\"')}")`;
      cover.classList.add('has-photo');
      return;
    }

    media.style.backgroundImage = '';
    cover.classList.remove('has-photo');
  }

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

  function getVideoProfileKey(role) {
    if (role === 'parent') {
      return 'childVideos';
    }
    if (role === 'player') {
      return 'playerVideos';
    }
    return 'profileVideos';
  }

  function parseYouTubeVideo(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) {
      return null;
    }

    let url;
    try {
      url = new URL(value);
    } catch (error) {
      return null;
    }

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    let id = '';
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        id = url.searchParams.get('v') || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        id = url.pathname.split('/')[2] || '';
      } else if (url.pathname.startsWith('/embed/')) {
        id = url.pathname.split('/')[2] || '';
      }
    }

    id = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
    if (!id) {
      return null;
    }

    return {
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      defaultTitle: 'YouTube ვიდეო'
    };
  }

  function getProfileVideos(role, profile) {
    const list = Array.isArray(profile?.[getVideoProfileKey(role)]) ? profile[getVideoProfileKey(role)] : [];
    return list
      .map((item) => {
        if (typeof item === 'string') {
          return { url: item };
        }
        return item && typeof item === 'object' ? item : null;
      })
      .filter(Boolean)
      .map((item) => {
        const parsed = parseYouTubeVideo(item.url);
        if (!parsed) {
          return null;
        }
        return {
          id: parsed.id,
          url: parsed.url,
          embedUrl: parsed.embedUrl,
          thumb: parsed.thumb,
          title: String(item.title || parsed.defaultTitle || 'ვიდეო').trim() || 'ვიდეო',
          comment: String(item.comment || '').trim(),
          date: String(item.date || '').trim()
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function setProfileVideos(role, nextProfile, videos) {
    nextProfile[getVideoProfileKey(role)] = videos.map((item) => ({
      title: String(item.title || '').trim(),
      url: String(item.url || '').trim(),
      comment: String(item.comment || '').trim(),
      date: String(item.date || '').trim()
    }));
  }

  function resolveProfilePosition(role, profile) {
    const raw = role === 'parent' ? profile?.childPosition : profile?.playerPosition;
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) {
      return 'general';
    }
    if (normalized.includes('მეკარე')) {
      return 'goalkeeper';
    }
    if (normalized.includes('დამცველი')) {
      return 'defender';
    }
    if (normalized.includes('ნახევარმცველი')) {
      return 'midfielder';
    }
    if (normalized.includes('თავდამსხმელი')) {
      return 'forward';
    }
    return 'general';
  }

  function getPerformanceConfig(role, profile) {
    const key = resolveProfilePosition(role, profile);
    return {
      key,
      ...(PERFORMANCE_CONFIGS[key] || PERFORMANCE_CONFIGS.general)
    };
  }

  function getPerformanceStore(role, profile) {
    return role === 'parent'
      ? { ...(profile?.childPerformance || {}) }
      : { ...(profile?.playerPerformance || {}) };
  }

  function setPerformanceStore(role, nextProfile, store) {
    if (role === 'parent') {
      nextProfile.childPerformance = store;
      return;
    }
    nextProfile.playerPerformance = store;
  }

  function metricNumber(store, key) {
    const value = Number(store?.[key]);
    return Number.isFinite(value) ? value : 0;
  }

  function computeGoalContributions(store) {
    const goals = metricNumber(store, 'actualGoals');
    const assists = metricNumber(store, 'assists');
    const combined = goals + assists;
    if (combined > 0) {
      return combined;
    }
    return metricNumber(store, 'goalContributions');
  }

  function getGoalPointsByRole(configKey) {
    if (configKey === 'goalkeeper' || configKey === 'defender') {
      return 6;
    }
    if (configKey === 'midfielder') {
      return 5;
    }
    return 4;
  }

  function getCleanSheetPointsByRole(configKey) {
    if (configKey === 'goalkeeper' || configKey === 'defender') {
      return 4;
    }
    if (configKey === 'midfielder') {
      return 1;
    }
    return 0;
  }

  function estimateRecoveredBalls(store, configKey) {
    const direct = metricNumber(store, 'possessionRegained');
    if (direct > 0) {
      return direct;
    }
    const interceptions = metricNumber(store, 'interceptions');
    const tackles = metricNumber(store, 'tacklesWon');
    const duelWins = metricNumber(store, 'duelWins');
    if (configKey === 'defender' || configKey === 'midfielder') {
      return interceptions + tackles;
    }
    return Math.max(0, interceptions + Math.round(duelWins * 0.5));
  }

  function estimateGoalkeeperSaveCount(store) {
    const savePct = metricNumber(store, 'savePercentage') / 100;
    const goalsConceded = metricNumber(store, 'goalsConcededPer90') * metricNumber(store, 'matches90');
    if (savePct <= 0 || savePct >= 0.995 || goalsConceded <= 0) {
      return 0;
    }
    return goalsConceded * (savePct / Math.max(0.01, 1 - savePct));
  }

  // UEFA publicly documents Fantasy points, but not a public 10-point rating formula.
  // We estimate a season score from those official scoring rules, then normalize it by games played.
  function computeEstimatedUefaFantasyPoints(role, profile, store, config) {
    const resolvedConfig = config || getPerformanceConfig(role, profile);
    const gamesPlayed = Math.max(0, Math.round(metricNumber(store, 'matchesPlayed')));
    if (!gamesPlayed) {
      return 0;
    }

    const matches90 = Math.max(0, metricNumber(store, 'matches90'));
    const minutesQualifiedMatches = Math.min(gamesPlayed, Math.round(matches90));
    const actualGoals = metricNumber(store, 'actualGoals');
    const assists = metricNumber(store, 'assists');
    const yellow = metricNumber(store, 'yellowCards');
    const red = metricNumber(store, 'redCards');
    const cleanSheets = metricNumber(store, 'cleanSheets');
    const totalGoalsConceded = metricNumber(store, 'goalsConcededPer90') * matches90;
    const recoveredBalls = estimateRecoveredBalls(store, resolvedConfig?.key);
    const saveCount = resolvedConfig?.key === 'goalkeeper' ? estimateGoalkeeperSaveCount(store) : 0;

    let total = 0;
    total += gamesPlayed;
    total += minutesQualifiedMatches;
    total += actualGoals * getGoalPointsByRole(resolvedConfig?.key);
    total += assists * 3;
    total += Math.floor(recoveredBalls / 3);
    total += cleanSheets * getCleanSheetPointsByRole(resolvedConfig?.key);
    total -= yellow;
    total -= red * 3;

    if (resolvedConfig?.key === 'goalkeeper') {
      total += Math.floor(saveCount / 3);
      total -= Math.floor(totalGoalsConceded / 2);
    }

    if (resolvedConfig?.key === 'defender') {
      total -= Math.floor(totalGoalsConceded / 2);
    }

    return total;
  }

  function computeAverageRating(role, profile, store, config) {
    const resolvedConfig = config || getPerformanceConfig(role, profile);
    const activityKeys = Array.from(new Set(['matchesPlayed', 'matches90', 'yellowCards', 'redCards', 'actualGoals', 'assists'].concat(resolvedConfig?.advanced || [])));
    const hasActivity = activityKeys.some((key) => resolveComputedMetricNumber(key, store, { role, profile, config: resolvedConfig }) > 0);
    if (!hasActivity) {
      return 0;
    }
    const gamesPlayed = Math.max(0, Math.round(metricNumber(store, 'matchesPlayed')));
    if (!gamesPlayed) {
      return 0;
    }

    const totalFantasyPoints = computeEstimatedUefaFantasyPoints(role, profile, store, resolvedConfig);
    const pointsPerGame = totalFantasyPoints / Math.max(1, gamesPlayed);
    const normalizedPpg = Math.max(0, Math.min(1, pointsPerGame / 12));
    const confidence = Math.max(0.2, Math.min(1, gamesPlayed / 8));
    const baseline = 6.0;
    const ceiling = 9.9;
    const modeled = baseline + ((ceiling - baseline) * normalizedPpg);
    const finalScore = (baseline * (1 - confidence)) + (modeled * confidence);

    return Math.max(0, Math.min(10, Number(finalScore.toFixed(1))));
  }

  function computeOverallPoints(role, profile, store, config) {
    const average = computeAverageRating(role, profile, store, config);
    if (!average) {
      return 0;
    }
    return Math.max(0, Math.min(99, Math.round(average * 10)));
  }

  function resolveComputedMetricNumber(key, store, context = {}) {
    if (key === 'goalContributions') {
      return computeGoalContributions(store);
    }
    if (key === 'averageRating') {
      return computeAverageRating(context.role, context.profile, store, context.config);
    }
    return metricNumber(store, key);
  }

  function formatMetricValue(key, store, context = {}) {
    const field = PERFORMANCE_FIELDS[key];
    if (!field) {
      return safe(store?.[key], '0');
    }
    const value = resolveComputedMetricNumber(key, store, context);
    if (!value) {
      return field.precision === 1 ? '0.0' + (field.suffix || '') : '0' + (field.suffix || '');
    }
    const formatted = field.precision === 1 ? value.toFixed(1) : String(Math.round(value));
    return formatted + (field.suffix || '');
  }

  function formatOverallPoints(store, context = {}) {
    const points = computeOverallPoints(context.role, context.profile, store, context.config);
    return `${points} / 99`;
  }

  function formatDiscipline(store) {
    const yellow = metricNumber(store, 'yellowCards');
    const red = metricNumber(store, 'redCards');
    const total = yellow + red;
    return {
      value: String(total),
      copy: `${yellow}Y / ${red}R`
    };
  }

  function normalizeRadarValue(key, store, context = {}) {
    const field = PERFORMANCE_FIELDS[key];
    if (!field) {
      return 0;
    }
    const value = resolveComputedMetricNumber(key, store, context);
    const ratio = Math.max(0, Math.min(1, value / (field.max || 100)));
    return field.inverse ? (1 - ratio) : ratio;
  }

  function buildRadarSvg(config, store, context = {}) {
    const keys = config.radar || [];
    if (!keys.length) {
      return '';
    }

    const size = 320;
    const center = 160;
    const radius = 104;
    const angleStep = (Math.PI * 2) / keys.length;
    const toPoint = (ratio, index) => {
      const angle = (-Math.PI / 2) + (angleStep * index);
      return {
        x: center + Math.cos(angle) * radius * ratio,
        y: center + Math.sin(angle) * radius * ratio
      };
    };

    const rings = [0.25, 0.5, 0.75, 1].map((ratio) => {
      const points = keys.map((_, index) => {
        const point = toPoint(ratio, index);
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${points}" fill="none" stroke="rgba(15,23,42,.1)" stroke-width="1"></polygon>`;
    }).join('');

    const axes = keys.map((key, index) => {
      const end = toPoint(1, index);
      const label = PERFORMANCE_FIELDS[key]?.label || key;
      const labelPoint = toPoint(1.14, index);
      return [
        `<line x1="${center}" y1="${center}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="rgba(15,23,42,.12)" stroke-width="1"></line>`,
        `<text x="${labelPoint.x.toFixed(1)}" y="${labelPoint.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800" fill="#334155">${esc(label)}</text>`
      ].join('');
    }).join('');

    const values = keys.map((key) => normalizeRadarValue(key, store, context));
    const hasData = values.some((value) => value > 0.02);
    const plotValues = hasData ? values : keys.map(() => 0.34);
    const polygon = keys.map((key, index) => {
      const point = toPoint(plotValues[index], index);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }).join(' ');

    return [
      `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(config.position)} რადარის გრაფიკი">`,
      rings,
      axes,
      `<polygon points="${polygon}" fill="${hasData ? 'rgba(185,28,28,.16)' : 'rgba(148,163,184,.14)'}" stroke="${hasData ? 'rgba(185,28,28,.95)' : 'rgba(100,116,139,.58)'}" stroke-width="3" stroke-dasharray="${hasData ? '0' : '8 8'}"></polygon>`,
      keys.map((key, index) => {
        const point = toPoint(plotValues[index], index);
        return `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" fill="${hasData ? '#b91c1c' : '#94a3b8'}"></circle>`;
      }).join(''),
      !hasData
        ? `<text x="${center}" y="${center - 8}" text-anchor="middle" font-size="15" font-weight="900" fill="#0f172a">შეავსე სტატისტიკა</text><text x="${center}" y="${center + 18}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#64748b">შეიყვანე თამაშები და ძირითადი მონაცემები</text>`
        : '',
      `</svg>`
    ].join('');
  }

  function setInlineStatus(elementId, message, state) {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }
    if (!message) {
      element.hidden = true;
      element.textContent = '';
      element.dataset.state = 'info';
      return;
    }
    element.hidden = false;
    element.textContent = message;
    element.dataset.state = state || 'info';
  }

  function buildPerformanceFieldMarkup(keys, store, sectionId) {
    return keys.map((key) => {
      const field = PERFORMANCE_FIELDS[key];
      return [
        `<div class="form-group">`,
          `<label class="form-label" for="${sectionId}_${key}">${esc(field.label)}</label>`,
          `<input id="${sectionId}_${key}" class="form-input" type="number" min="0" max="${esc(field.max)}" step="${esc(field.step)}" value="${esc(String(store?.[key] || ''))}" placeholder="${esc(field.note)}">`,
          `<div class="form-hint">${esc(field.note)}</div>`,
        `</div>`
      ].join('');
    }).join('');
  }

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

  function inputDateValue(value) {
    const parsed = parseBirthDate(value);
    if (!parsed?.year || !parsed?.month || !parsed?.day) {
      return '';
    }
    const month = String(parsed.month).padStart(2, '0');
    const day = String(parsed.day).padStart(2, '0');
    return `${parsed.year}-${month}-${day}`;
  }

  function dateValueFromInput(value) {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    const [year, month, day] = raw.split('-');
    if (!year || !month || !day) {
      return '';
    }
    return `${day}.${month}.${year}`;
  }

  function getProfileImageSource(role, profile) {
    if (role === 'parent') {
      return String(profile?.childPhoto || profile?.profilePhoto || '').trim();
    }
    if (role === 'player') {
      return String(profile?.playerPhoto || profile?.profilePhoto || '').trim();
    }
    return String(profile?.profilePhoto || '').trim();
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
    const videoCount = getProfileVideos(role, profile).length;

    if (role === 'player') {
      const config = getManagedConfig(role);
      const state = resolveAgeState(profile, config);
      const currentAge = state.actualAge ?? profile.playerAge ?? '-';
      const performanceStore = getPerformanceStore(role, profile);
      const discipline = formatDiscipline(performanceStore);
      const videoCount = getProfileVideos(role, profile).length;
      return {
        eye: 'ციფრული საფეხბურთო პროფილი',
        lead: 'ეს არის შენი მოთამაშის პროფილი. აქ დაგიგროვდება გუნდი, ვიდეო პროფილი, სტატისტიკა და სეზონური ასაკობრივი ისტორია.',
        side: 'აქ ატვირთავ სურათს, ნახავ შენს მიმდინარე ფორმას და ყოველდღიურად განაახლებ პოზიციაზე მორგებულ პროფილს.',
        quick: [
          { l: 'საერთო ქულა', v: formatOverallPoints(performanceStore, { role, profile, config }) },
          { l: 'თამაშები', v: formatMetricValue('matchesPlayed', performanceStore, { role, profile, config }) },
          { l: 'წუთები / 90', v: formatMetricValue('matches90', performanceStore, { role, profile, config }) },
          { l: 'დისციპლინა', v: discipline.value },
          { l: 'გოლში მონაწილეობა', v: formatMetricValue('goalContributions', performanceStore, { role, profile, config }) }
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
          { l: 'ვიდეოები', v: String(videoCount), c: 'დამატებული YouTube ვიდეოები აქ ითვლება.' },
          { l: 'სტატისტიკა', v: 'მალე', c: 'გოლები, ასისტები და წუთები ამ პროფილს დაემატება.' },
          { l: 'ასაკობრივი', v: ageGroupLabel(state.effectiveKey), c: state.manual ? 'კატეგორია ახლა ხელით არის მითითებული.' : 'კატეგორია სეზონურად ავტომატურად ითვლება.' }
        ],
        videos: {
          t: 'გადმოწერე ჩვენი აპი',
          c: 'DM Football Georgia გაძლევს ვიდეოების არქივს, პროგრესის აღრიცხვას და განვითარებისთვის უფრო მარტივ კონტროლს ერთ სივრცეში.',
          a: [],
          n: [
            { t: 'ვიდეო პროფილი', c: 'ლინკით დამატებული YouTube ვიდეოები აქვე გამოჩნდება და პროფილის ნაწილად დარჩება.' },
            { t: 'შენახვა', c: 'ვიდეო ფაილი ცალკე არ იტვირთება, ინახება მხოლოდ YouTube ბმული.' },
            { t: 'გამოყენება', c: 'ეს ბმულები შეგიძლია გამოიყენო სკაუტინგის, გუნდის და პირადი პრეზენტაციისთვის.' }
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
      const performanceStore = getPerformanceStore(role, profile);
      const discipline = formatDiscipline(performanceStore);
      const videoCount = getProfileVideos(role, profile).length;
      return {
        eye: 'მშობლის პროფილი',
        lead: 'ეს არის მშობლის სამუშაო სივრცე, სადაც ბავშვის მონაცემები, გუნდი და ასაკობრივი კატეგორია ერთად იმართება.',
        side: 'აქ ერთ სივრცეში ჩანს ბავშვის ფოტო, პოზიციაზე მორგებული ანალიზი და ყოველდღიური განახლებები, რომელსაც შენ მართავ.',
        quick: [
          { l: 'საერთო ქულა', v: formatOverallPoints(performanceStore, { role, profile, config }) },
          { l: 'თამაშები', v: formatMetricValue('matchesPlayed', performanceStore, { role, profile, config }) },
          { l: 'წუთები / 90', v: formatMetricValue('matches90', performanceStore, { role, profile, config }) },
          { l: 'დისციპლინა', v: discipline.value },
          { l: 'გოლში მონაწილეობა', v: formatMetricValue('goalContributions', performanceStore, { role, profile, config }) }
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
          { l: 'ვიდეოები', v: String(videoCount), c: 'ბავშვის დამატებული YouTube ვიდეოები აქ ითვლება.' },
          { l: 'ასაკობრივი', v: ageGroupLabel(state.effectiveKey), c: state.manual ? 'ბავშვის კატეგორია ხელით არის მორგებული.' : 'ბავშვის კატეგორია სეზონურად ავტომატურად ითვლება.' }
        ],
        videos: {
          t: 'გადმოწერე ჩვენი აპი',
          c: 'DM Football Georgia-ში ბავშვის ვიდეოები, თარიღები და პროგრესი ბევრად უფრო დალაგებულად ინახება და იმართება.',
          a: [],
          n: [
            { t: 'ბავშვის პროფილი', c: 'ვიდეოები ბავშვის პროფილზე შენს მიერ იმართება და ერთ სივრცეში გროვდება.' },
            { t: 'YouTube ბმული', c: 'საკმარისია სწორი YouTube ბმული, რომ ვიდეო პროფილში დაემატოს.' },
            { t: 'გაზიარება', c: 'ეს ვიდეოები მარტივად გაუზიარდება გუნდს, სკაუტს ან სხვა დაინტერესებულ მხარეს.' }
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
      lead: 'ეს არის აგენტის პროფილი, სადაც მოთამაშეების ვიდეოები, პრეზენტაციები და მომავალი შეთავაზებები გაერთიანდება.',
      side: 'აქ ჩანს სააგენტოს მთავარი სურათი, სამუშაო სტატუსი და ის ბლოკები, რომლებსაც ყოველდღიურ მუშაობაში გამოიყენებ.',
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
        { l: 'ვიდეოები', v: String(videoCount), c: 'დამატებული YouTube ვიდეოები აქ ითვლება.' }
      ],
      videos: {
        t: 'გადმოწერე ჩვენი აპი',
        c: 'DM Football Georgia ვიდეოებს, კომენტარებს და სამუშაო არქივს აერთიანებს ერთ სწრაფ და კომპაქტურ სივრცეში.',
        a: [],
        n: [
          { t: 'ვიდეოები', c: 'YouTube ბმულებით შეგიძლია შენი სამუშაო ვიდეოები ერთ სივრცეში დაალაგო.' },
          { t: 'ნავიგაცია', c: 'სხვა გვერდებზე გადასვლა ისევ ზედა მენიუდან შეგიძლია.' },
          { t: 'შემდეგი ნაბიჯი', c: 'მომდევნო ეტაპზე ამავე სივრცეს მოთამაშეების მიბმასაც მოვარგებთ.' }
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

      if (window.sitePlayerDomain?.syncMyAccountDomain) {
        await window.sitePlayerDomain.syncMyAccountDomain(client);
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

  function setDataEditorStatus(message, state) {
    const status = document.getElementById('dataEditorStatus');
    if (!status) {
      return;
    }
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

  function toggleDataEditor(show) {
    const panel = document.getElementById('dataEditPanel');
    if (!panel) {
      return;
    }
    panel.hidden = !show;
    if (!show) {
      setDataEditorStatus('');
      const photoInput = document.getElementById('photoInput');
      if (photoInput) {
        photoInput.value = '';
      }
    }
  }

  function getDataEditorFields(role, user, profile) {
    const common = [
      { key: 'first_name', label: 'სახელი', type: 'text', value: user.user_metadata?.first_name || '' },
      { key: 'last_name', label: 'გვარი', type: 'text', value: user.user_metadata?.last_name || '' },
      { key: 'phone_number', label: 'ტელეფონი', type: 'tel', value: user.user_metadata?.phone_number || '' },
      { key: 'personal_number', label: 'პირადი ნომერი', type: 'text', value: user.user_metadata?.personal_number || '' }
    ];

    if (role === 'player') {
      return common.concat([
        { key: 'playerBirthDate', label: 'დაბადების თარიღი', type: 'date', value: inputDateValue(profile.playerBirthDate) },
        { key: 'playerPosition', label: 'პოზიცია', type: 'text', value: profile.playerPosition || '' },
        { key: 'playerFoot', label: 'უპირატესი ფეხი', type: 'text', value: profile.playerFoot || '' }
      ]);
    }

    if (role === 'parent') {
      return common.concat([
        { key: 'childName', label: 'ბავშვის სახელი და გვარი', type: 'text', value: profile.childName || '' },
        { key: 'childBirthDate', label: 'ბავშვის დაბადების თარიღი', type: 'date', value: inputDateValue(profile.childBirthDate) },
        { key: 'childPosition', label: 'ბავშვის პოზიცია', type: 'text', value: profile.childPosition || '' },
        { key: 'childFoot', label: 'ბავშვის ფეხი', type: 'text', value: profile.childFoot || '' },
        { key: 'parentRelation', label: 'კავშირი ბავშვთან', type: 'text', value: profile.parentRelation || '' }
      ]);
    }

    return common.concat([
      { key: 'agencyName', label: 'სააგენტო', type: 'text', value: profile.agencyName || '' },
      { key: 'playersManaged', label: 'რამდენ მოთამაშეს წარმოადგენს', type: 'number', value: profile.playersManaged || '' },
      { key: 'agencyRegion', label: 'რეგიონი', type: 'text', value: profile.agencyRegion || '' },
      { key: 'agentFocus', label: 'მიმართულება', type: 'text', value: profile.agentFocus || '' }
    ]);
  }

  function renderDataEditor(role, user, profile) {
    const fieldsBox = document.getElementById('dataEditFields');
    if (!fieldsBox) {
      return;
    }

    dataEditorState.role = role;
    dataEditorState.user = user;
    dataEditorState.profile = { ...(profile || {}) };

    const fields = getDataEditorFields(role, user, profile);
    fieldsBox.innerHTML = fields.map((field) => (
      `<div class="form-group">
        <label class="form-label" for="data-${esc(field.key)}">${esc(field.label)}</label>
        <input id="data-${esc(field.key)}" data-field="${esc(field.key)}" class="form-input" type="${esc(field.type)}" value="${esc(field.value)}">
      </div>`
    )).join('');

    const photoFieldLabel = document.getElementById('photoFieldLabel');
    if (photoFieldLabel) {
      photoFieldLabel.textContent = role === 'parent' ? 'ბავშვის ფოტო' : 'პირადი ფოტო';
    }
    setDataEditorStatus('');
  }

  function readDataField(key) {
    const element = document.querySelector(`[data-field="${key}"]`);
    return String(element?.value || '').trim();
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 480;
          const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        };
        image.onerror = () => reject(new Error('ფოტოს დამუშავება ვერ შესრულდა.'));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error('ფაილის წაკითხვა ვერ შესრულდა.'));
      reader.readAsDataURL(file);
    });
  }

  async function saveDataEditor() {
    const role = dataEditorState.role;
    const user = dataEditorState.user;
    const client = dataEditorState.client;
    const nextProfile = { ...(dataEditorState.profile || {}) };
    if (!role || !user || !client) {
      return;
    }

    const firstName = readDataField('first_name');
    const lastName = readDataField('last_name');
    const phoneNumber = readDataField('phone_number');
    const personalNumber = readDataField('personal_number');

    if (!firstName || !lastName || !phoneNumber || !personalNumber) {
      setDataEditorStatus('სახელი, გვარი, ტელეფონი და პირადი ნომერი სავალდებულოა.', 'error');
      return;
    }

    if (role === 'player') {
      nextProfile.playerBirthDate = dateValueFromInput(readDataField('playerBirthDate'));
      nextProfile.playerPosition = readDataField('playerPosition');
      nextProfile.playerFoot = readDataField('playerFoot');
    } else if (role === 'parent') {
      nextProfile.childName = readDataField('childName');
      nextProfile.childBirthDate = dateValueFromInput(readDataField('childBirthDate'));
      nextProfile.childPosition = readDataField('childPosition');
      nextProfile.childFoot = readDataField('childFoot');
      nextProfile.parentRelation = readDataField('parentRelation');
    } else {
      nextProfile.agencyName = readDataField('agencyName');
      nextProfile.playersManaged = readDataField('playersManaged');
      nextProfile.agencyRegion = readDataField('agencyRegion');
      nextProfile.agentFocus = readDataField('agentFocus');
    }

    const photoInput = document.getElementById('photoInput');
    if (photoInput?.files?.[0]) {
      try {
        const photoData = await compressImageFile(photoInput.files[0]);
        nextProfile.profilePhoto = photoData;
        if (role === 'player') {
          nextProfile.playerPhoto = photoData;
        } else if (role === 'parent') {
          nextProfile.childPhoto = photoData;
        }
      } catch (error) {
        setDataEditorStatus(error?.message || 'ფოტოს ატვირთვა ვერ შესრულდა.', 'error');
        return;
      }
    }

    setDataEditorStatus('მონაცემები ინახება...', 'info');

    try {
      const payload = {
        ...user.user_metadata,
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        phone_number: phoneNumber,
        personal_number: personalNumber,
        profile: nextProfile
      };
      const { error } = await client.auth.updateUser({ data: payload });
      if (error) {
        throw error;
      }
      setDataEditorStatus('მონაცემები წარმატებით განახლდა. პროფილი ახლავე განახლდება.', 'success');
      if (window.sitePlayerDomain?.syncMyAccountDomain) {
        await window.sitePlayerDomain.syncMyAccountDomain(client);
      }
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      setDataEditorStatus(error?.message || 'მონაცემების შენახვა ვერ შესრულდა.', 'error');
    }
  }

  function initializeDataEditor(role, user, profile) {
    dataEditorState.role = role;
    dataEditorState.user = user;
    dataEditorState.profile = { ...(profile || {}) };
    renderDataEditor(role, user, profile);

    const editButton = document.getElementById('editDataBtn');
    const cancelButton = document.getElementById('cancelDataBtn');
    const saveButton = document.getElementById('saveDataBtn');

    if (editButton && editButton.dataset.ready !== 'true') {
      editButton.dataset.ready = 'true';
      editButton.addEventListener('click', () => {
        renderDataEditor(dataEditorState.role, dataEditorState.user, dataEditorState.profile);
        toggleDataEditor(true);
      });
    }

    if (cancelButton && cancelButton.dataset.ready !== 'true') {
      cancelButton.dataset.ready = 'true';
      cancelButton.addEventListener('click', () => {
        toggleDataEditor(false);
      });
    }

    if (saveButton && saveButton.dataset.ready !== 'true') {
      saveButton.dataset.ready = 'true';
      saveButton.addEventListener('click', () => {
        saveDataEditor();
      });
    }
  }

  function setVideoStatus(message, state) {
    const status = document.getElementById('videoStatus');
    if (!status) {
      return;
    }
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

  function formatVideoDate(value) {
    if (!value) {
      return 'თარიღი არ არის მითითებული';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('ka-GE');
  }

  function getFilteredVideos(role, profile, query) {
    const normalized = String(query || '').trim().toLowerCase();
    const videos = getProfileVideos(role, profile);
    if (!normalized) {
      return videos;
    }

    return videos.filter((video) => {
      const haystack = [
        video.comment,
        video.date,
        formatVideoDate(video.date),
        video.title
      ].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }

  function updateVideoSearchMeta(total, visible, query) {
    const meta = document.getElementById('videoSearchMeta');
    if (!meta) {
      return;
    }
    if (!query) {
      meta.textContent = total ? `სულ ${total} ვიდეო • დალაგებულია ყველაზე ახალიდან.` : 'ვიდეოები დალაგდება ყველაზე ახალიდან.';
      return;
    }
    meta.textContent = visible
      ? `ნაპოვნია ${visible} ვიდეო მოთხოვნაზე: ${query}`
      : `ვერ მოიძებნა ვიდეო მოთხოვნაზე: ${query}`;
  }

  function renderVideoList(role, profile, notes = []) {
    const list = document.getElementById('videoList');
    if (!list) {
      return;
    }

    const query = document.getElementById('videoSearchInput')?.value || '';
    const allVideos = getProfileVideos(role, profile);
    const videos = getFilteredVideos(role, profile, query);
    updateVideoSearchMeta(allVideos.length, videos.length, query);

    if (!allVideos.length) {
      const fallbackNotes = Array.isArray(notes) && notes.length
        ? `<div class="notes">${renderNotes(notes)}</div>`
        : '';
      list.innerHTML = `<div class="video-empty">ჯერ ვიდეო არ არის დამატებული. ჩასვი YouTube ბმული და ეს სივრცე მაშინვე შეივსება.${fallbackNotes}</div>`;
      return;
    }

    if (!videos.length) {
      list.innerHTML = '<div class="video-empty">ამ ძებნით შედეგი ვერ მოიძებნა. სცადე სხვა თარიღი ან კომენტარის სიტყვა.</div>';
      return;
    }

    list.innerHTML = videos.map((video, index) => `
      <article class="video-card">
        <div class="video-frame">
          <iframe src="${esc(video.embedUrl)}" title="${esc(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <div class="video-card-top">
          <div>
            <h3 class="video-card-title">${esc(video.title)}</h3>
            <div class="video-card-copy">${esc(video.url)}</div>
          </div>
          <button type="button" class="btn btn-white remove-video-btn" data-video-id="${esc(video.id)}" data-video-date="${esc(video.date)}">წაშლა</button>
        </div>
        <div class="video-meta">
          <span>${esc(formatVideoDate(video.date))}</span>
          <span>YouTube</span>
        </div>
        <div class="video-comment">${esc(video.comment || 'კომენტარი არ არის დამატებული.')}</div>
      </article>
    `).join('');

    list.querySelectorAll('.remove-video-btn').forEach((button) => {
      button.addEventListener('click', () => {
        removeVideoByIdentity(button.dataset.videoId || '', button.dataset.videoDate || '');
      });
    });
  }

  async function saveProfileVideos(nextVideos, successMessage) {
    const { role, user, client } = videoEditorState;
    const profile = { ...(videoEditorState.profile || {}) };
    if (!role || !user || !client) {
      return;
    }

    setProfileVideos(role, profile, nextVideos);
    setVideoStatus('ვიდეოების განახლება მიმდინარეობს...', 'info');

    try {
      const { data, error } = await client.auth.updateUser({
        data: {
          ...user.user_metadata,
          profile
        }
      });
      if (error) {
        throw error;
      }

      if (window.sitePlayerDomain?.syncMyAccountDomain) {
        await window.sitePlayerDomain.syncMyAccountDomain(client);
      }

      videoEditorState.user = data?.user || user;
      videoEditorState.profile = profile;
      renderVideoList(role, profile, buildRoleView(role, profile, videoEditorState.user, from()).videos.n);
      setVideoStatus(successMessage, 'success');
      const input = document.getElementById('videoUrlInput');
      const commentInput = document.getElementById('videoCommentInput');
      const dateInput = document.getElementById('videoDateInput');
      if (input) {
        input.value = '';
      }
      if (commentInput) {
        commentInput.value = '';
      }
      if (dateInput) {
        dateInput.value = '';
      }
    } catch (error) {
      setVideoStatus(error?.message || 'ვიდეოების განახლება ვერ შესრულდა.', 'error');
    }
  }

  async function handleAddVideo() {
    const { role, profile } = videoEditorState;
    const input = document.getElementById('videoUrlInput');
    const commentInput = document.getElementById('videoCommentInput');
    const dateInput = document.getElementById('videoDateInput');
    const parsed = parseYouTubeVideo(input?.value);
    if (!parsed) {
      setVideoStatus('გთხოვ ჩასვა სწორი YouTube ბმული.', 'error');
      input?.focus();
      return;
    }

    const comment = String(commentInput?.value || '').trim();
    const date = String(dateInput?.value || new Date().toISOString().slice(0, 10)).trim();
    if (!comment) {
      setVideoStatus('კომენტარი სავალდებულოა.', 'error');
      return;
    }

    const current = getProfileVideos(role, profile);
    if (current.some((item) => item.id === parsed.id && item.date === date)) {
      setVideoStatus('ეს ვიდეო უკვე დამატებულია.', 'error');
      return;
    }

    current.unshift({
      title: `ვიდეო ${current.length + 1}`,
      url: parsed.url,
      comment,
      date
    });
    await saveProfileVideos(current, 'ვიდეო წარმატებით დაემატა.');
  }

  async function removeVideoByIdentity(id, date) {
    const { role, profile } = videoEditorState;
    const current = getProfileVideos(role, profile);
    const next = current.filter((item) => !(item.id === id && String(item.date || '') === String(date || '')));
    if (next.length === current.length) {
      return;
    }
    await saveProfileVideos(next, 'ვიდეო წაიშალა.');
  }

  function initializeVideos(role, user, profile, roleView) {
    videoEditorState.role = role;
    videoEditorState.user = user;
    videoEditorState.profile = { ...(profile || {}) };
    videoEditorState.client = dataEditorState.client;

    renderVideoList(role, profile, roleView.videos.n);
    setVideoStatus('');

    const addButton = document.getElementById('addVideoBtn');
    const input = document.getElementById('videoUrlInput');
    const searchInput = document.getElementById('videoSearchInput');
    const dateInput = document.getElementById('videoDateInput');

    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    if (addButton && addButton.dataset.ready !== 'true') {
      addButton.dataset.ready = 'true';
      addButton.addEventListener('click', () => {
        handleAddVideo();
      });
    }

    if (input && input.dataset.ready !== 'true') {
      input.dataset.ready = 'true';
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleAddVideo();
        }
      });
    }

    if (searchInput && searchInput.dataset.ready !== 'true') {
      searchInput.dataset.ready = 'true';
      searchInput.addEventListener('input', () => {
        renderVideoList(videoEditorState.role, videoEditorState.profile, roleView.videos.n);
      });
    }
  }

  function getProfileViewKey(role) {
    const raw = String(new URLSearchParams(location.search).get('view') || 'overview')
      .trim()
      .toLowerCase();
    const allowed = ['overview', 'data', 'status', 'videos'];
    if (role === 'player' || role === 'parent') {
      allowed.push('team');
    }
    return allowed.includes(raw) ? raw : 'overview';
  }

  function buildProfileViewHref(viewKey, back) {
    const key = String(viewKey || 'overview').trim().toLowerCase() || 'overview';
    const route = `user-profile.html?view=${encodeURIComponent(key)}`;
    if (window.siteAuth?.buildProfileHref) {
      return window.siteAuth.buildProfileHref(route, back);
    }
    return `${route}&from=${encodeURIComponent(back || 'index.html')}`;
  }

  function getProfileViewItems(role, back) {
    const items = [
      { key: 'overview', label: 'პროფილი', title: 'პროფილი' },
      { key: 'data', label: 'მონაცემები', title: 'მონაცემები' },
      { key: 'status', label: 'სტატუსი', title: 'სტატუსი' }
    ];

    if (role === 'player' || role === 'parent') {
      items.push({
        key: 'team',
        label: role === 'parent' ? 'ბავშვის გუნდი' : 'გუნდი',
        title: role === 'parent' ? 'ბავშვის გუნდი და ასაკობრივი' : 'გუნდი და ასაკობრივი'
      });
    }

    items.push({ key: 'videos', label: 'ვიდეოები', title: 'ვიდეოები' });

    return items.map((item) => ({
      ...item,
      href: buildProfileViewHref(item.key, back)
    }));
  }

  function renderProfileNavigation(role, back, currentView) {
    const nav = document.getElementById('profileNav');
    if (!nav) {
      return;
    }

    nav.innerHTML = getProfileViewItems(role, back).map((item) => (
      `<a href="${esc(item.href)}" class="${item.key === currentView ? 'active' : ''}">${esc(item.label)}</a>`
    )).join('');
  }

  function buildOverviewCards(role, profile, roleView, back) {
    const config = getManagedConfig(role);
    const ageState = config ? resolveAgeState(profile, config) : null;
    const ageText = ageState ? ageCategoryValue(ageState) : 'აქტიური';
    const commonCards = [
      {
        key: 'data',
        kicker: 'მონაცემები',
        title: 'სრული სარეგისტრაციო მონაცემები',
        copy: role === 'player'
          ? 'მოთამაშის ასაკი, პოზიცია, მუშა ფეხი და მიმდინარე გუნდი ერთ გვერდზეა დალაგებული.'
          : role === 'parent'
            ? 'მშობლის და ბავშვის ყველა ძირითადი მონაცემი ერთადაა თავმოყრილი.'
            : 'აგენტის სააგენტო, რეგიონი და საკონტაქტო მონაცემები ცალკე გვერდზეა გამოტანილი.',
        meta: role === 'player'
          ? `${safe(profile.playerPosition)} • ${safe(profile.playerFoot)}`
          : role === 'parent'
            ? `${safe(profile.childName)} • ${safe(profile.parentRelation)}`
            : `${safe(profile.agencyName)} • ${safe(profile.agencyRegion)}`,
        href: buildProfileViewHref('data', back)
      },
      {
        key: 'status',
        kicker: 'სტატუსი',
        title: 'აქტიური მდგომარეობა',
        copy: 'აქ ჩანს სეზონური ასაკობრივი, მიმდინარე სტატუსი და შენი შემდეგი სამუშაო მიმართულება.',
        meta: ageText,
        href: buildProfileViewHref('status', back)
      }
    ];

    if (role === 'player' || role === 'parent') {
      commonCards.push({
        key: 'team',
        kicker: 'გუნდი',
        title: role === 'parent' ? 'ბავშვის გუნდი და კატეგორია' : 'გუნდი და ასაკობრივი',
        copy: 'გუნდის შეცვლა, უგუნდოდ გადაყვანა და ასაკობრივის ხელით მართვა ცალკე გვერდზეა.',
        meta: role === 'parent'
          ? safe(profile.childTeam, TEAM_FREE_AGENT)
          : safe(profile.playerTeam, TEAM_FREE_AGENT),
        href: buildProfileViewHref('team', back)
      });
    }

    commonCards.push({
      key: 'videos',
      kicker: 'ვიდეოები',
      title: roleView.videos.t,
      copy: roleView.videos.c,
      meta: 'YouTube • გამორჩეული ეპიზოდები • ვიდეო პროფილი',
      href: buildProfileViewHref('videos', back)
    });

    return commonCards;
  }

  function buildPerformanceOverview(role, profile) {
    const config = getPerformanceConfig(role, profile);
    const store = getPerformanceStore(role, profile);
    const discipline = formatDiscipline(store);
    const metricContext = { role, profile, config };
    const coreCards = [
      { label: 'საერთო ქულა', value: formatOverallPoints(store, metricContext), copy: 'არსებული ქულა / მაქსიმუმი • 99' },
      { label: 'თამაშები', value: formatMetricValue('matchesPlayed', store, metricContext), copy: 'ოფიციალურად დაფიქსირებული მატჩები' },
      { label: 'წუთები / 90', value: formatMetricValue('matches90', store, metricContext), copy: 'რეალური 90-წუთიანები' },
      { label: 'დისციპლინა', value: discipline.value, copy: `ბარათები • ${discipline.copy}` },
      { label: 'გოლში მონაწილეობა', value: formatMetricValue('goalContributions', store, metricContext), copy: 'გოლი და ასისტი' }
    ];

    const commonItems = [
      { title: 'საერთო ქულა', value: formatOverallPoints(store, metricContext), copy: 'ქულა ითვლება თამაშების, გავლენისა და პოზიციური მონაცემების კომბინაციით.' },
      { title: 'თამაშები', value: formatMetricValue('matchesPlayed', store, metricContext), copy: 'რამდენ ოფიციალურ მატჩზეა შეფასება აშენებული.' },
      { title: 'წუთები / 90', value: formatMetricValue('matches90', store, metricContext), copy: 'სრული 90-წუთიანების დაგროვილი მოცულობა.' },
      { title: 'დისციპლინა', value: `${discipline.value} ბარათი`, copy: `${discipline.copy} • ყვითლებისა და წითლების ჯამი.` },
      { title: 'გოლში მონაწილეობა', value: formatMetricValue('goalContributions', store, metricContext), copy: 'გატანილი გოლებისა და ასისტების ჯამი.' }
    ];

    const advancedItems = config.key === 'forward'
      ? [
          {
            title: 'გოლები / xG',
            value: `${formatMetricValue('actualGoals', store, metricContext)} / ${formatMetricValue('expectedGoals', store, metricContext)}`,
            copy: 'გატანილი გოლები მოსალოდნელ გოლებთან შედარებით.'
          }
        ].concat(
          config.advanced
            .filter((key) => key !== 'actualGoals' && key !== 'expectedGoals')
            .map((key) => ({
              title: PERFORMANCE_FIELDS[key].label,
              value: formatMetricValue(key, store, metricContext),
              copy: PERFORMANCE_FIELDS[key].note
            }))
        )
      : config.advanced.map((key) => ({
          title: PERFORMANCE_FIELDS[key].label,
          value: formatMetricValue(key, store, metricContext),
          copy: PERFORMANCE_FIELDS[key].note
        }));

    return {
      config,
      updatedAt: store.updatedAt ? new Date(store.updatedAt).toLocaleString('ka-GE') : 'ჯერ არ განახლებულა',
      coreCards,
      commonItems,
      advancedItems,
      radarSvg: buildRadarSvg(config, store, metricContext),
      radarLegend: config.radar.map((key) => ({
        title: PERFORMANCE_FIELDS[key].label,
        value: formatMetricValue(key, store, metricContext)
      })),
      commonForm: buildPerformanceFieldMarkup(PERFORMANCE_COMMON_FIELDS, store, 'performance'),
      advancedForm: buildPerformanceFieldMarkup(config.advanced, store, 'performance')
    };
  }

  async function savePerformanceEditor() {
    const role = dataEditorState.role;
    const user = dataEditorState.user;
    const client = dataEditorState.client;
    const currentProfile = { ...(dataEditorState.profile || {}) };
    const statusId = 'performanceStatus';
    if (!(role === 'player' || role === 'parent') || !user || !client) {
      return;
    }

    const config = getPerformanceConfig(role, currentProfile);
    const keys = PERFORMANCE_COMMON_FIELDS.concat(config.advanced);
    const nextStore = { ...getPerformanceStore(role, currentProfile) };
    keys.forEach((key) => {
      const input = document.getElementById(`performance_${key}`);
      if (input) {
        nextStore[key] = String(input.value || '').trim();
      }
    });
    nextStore.updatedAt = new Date().toISOString();

    const nextProfile = { ...currentProfile };
    setPerformanceStore(role, nextProfile, nextStore);
    setDataEditorStatus('');
    setTeamEditorStatus('');
    setInlineStatus(statusId, 'მონაცემები ინახება...', 'info');

    try {
      const { error } = await client.auth.updateUser({
        data: {
          ...user.user_metadata,
          profile: nextProfile
        }
      });
      if (error) {
        throw error;
      }
      dataEditorState.profile = nextProfile;
      teamManageState.profile = nextProfile;
      setInlineStatus(statusId, 'პოზიციაზე მორგებული პროფილის მაჩვენებლები განახლდა.', 'success');
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      setInlineStatus(statusId, error?.message || 'განახლება ვერ შესრულდა. სცადე თავიდან.', 'error');
    }
  }

  function initializePerformanceEditor(role) {
    const saveButton = document.getElementById('savePerformanceBtn');
    if (!saveButton || saveButton.dataset.ready === 'true' || !(role === 'player' || role === 'parent')) {
      return;
    }
    saveButton.dataset.ready = 'true';
    saveButton.addEventListener('click', () => {
      savePerformanceEditor();
    });
  }

  function renderProfileHub(role, profile, roleView, back, user) {
    const hub = document.getElementById('profileHub');
    if (!hub) {
      return;
    }

    if (role === 'player' || role === 'parent') {
      const performance = buildPerformanceOverview(role, profile);
      hub.classList.remove('overview-grid');
      hub.classList.add('profile-performance');
      hub.innerHTML = `
        <section class="performance-shell">
          <div class="performance-top">
            ${performance.coreCards.map((item) => `
              <div class="metric-card">
                <span class="metric-card-label">${esc(item.label)}</span>
                <strong>${esc(item.value)}</strong>
                <span class="metric-card-copy">${esc(item.copy)}</span>
              </div>
            `).join('')}
          </div>
          <div class="performance-layout">
            <article class="radar-card">
              <h3>${esc(performance.config.position)} • რადარი</h3>
              <p class="position-copy">${esc(performance.config.copy)}</p>
              <div class="radar-wrap">${performance.radarSvg}</div>
              <div class="radar-caption">
                ${performance.radarLegend.map((item) => `<span><strong>${esc(item.title)}</strong><strong>${esc(item.value)}</strong></span>`).join('')}
              </div>
            </article>
            <div class="metric-groups">
              <article class="performance-panel">
                <h3>ძირითადი მაჩვენებლები</h3>
                <p class="position-copy">პირველივე შეხედვით ყველაზე მნიშვნელოვანი რიცხვები.</p>
                <div class="metric-grid">
                  ${performance.commonItems.map((item) => `<div class="metric-item"><span class="metric-item-label">${esc(item.title)}</span><strong class="metric-item-value">${esc(item.value)}</strong><span class="metric-item-copy">${esc(item.copy)}</span></div>`).join('')}
                </div>
              </article>
              <article class="performance-panel">
                <h3>გავლენის მაჩვენებლები</h3>
                <p class="position-copy">პოზიციაზე მორგებული დამატებითი სურათი და გავლენა.</p>
                <div class="metric-grid">
                  ${performance.advancedItems.map((item) => `<div class="metric-item"><span class="metric-item-label">${esc(item.title)}</span><strong class="metric-item-value">${esc(item.value)}</strong><span class="metric-item-copy">${esc(item.copy)}</span></div>`).join('')}
                </div>
              </article>
            </div>
          </div>
          <article class="metric-form-card">
            <div class="section-top">
              <div>
                <h3>დღიური განახლება</h3>
                <p class="position-copy">აქედან სწრაფად ანახლებ მატჩისა და ფორმის მონაცემებს.</p>
              </div>
              <div class="metric-updated">ბოლო განახლება: ${esc(performance.updatedAt)}</div>
            </div>
            <div class="metric-form-grid">
              <section class="metric-form-section">
                <h4>ძირითადი მაჩვენებლები</h4>
                <p>აქ ავსებ თამაშების რაოდენობას, წუთებს / 90-ს და დისციპლინას. საერთო ქულა და გოლში მონაწილეობა ზემოთ ავტომატურად დაითვლება შეყვანილი მონაცემებიდან.</p>
                ${performance.commonForm}
              </section>
              <section class="metric-form-section">
                <h4>${esc(performance.config.position)} · გავლენის მაჩვენებლები</h4>
                <p>აქ მხოლოდ იმ პოზიციისთვის მნიშვნელოვანი მაჩვენებლები ჩნდება, რომელიც პროფილში გაქვს არჩეული.</p>
                ${performance.advancedForm}
              </section>
            </div>
            <div class="actions team-actions">
              <button id="savePerformanceBtn" type="button" class="btn btn-red">განახლების შენახვა</button>
            </div>
            <div id="performanceStatus" class="form-status" data-state="info" hidden></div>
          </article>
        </section>
      `;
      dataEditorState.role = role;
      dataEditorState.user = user;
      dataEditorState.profile = { ...(profile || {}) };
      initializePerformanceEditor(role);
      return;
    }

    hub.classList.add('overview-grid');
    hub.classList.remove('profile-performance');
    hub.innerHTML = buildOverviewCards(role, profile, roleView, back).map((item) => (
      `<a href="${esc(item.href)}" class="overview-card">
        <div class="overview-card-top">
          <div>
            <span class="overview-card-kicker">${esc(item.kicker)}</span>
            <strong>${esc(item.title)}</strong>
          </div>
          <span class="overview-card-arrow">გახსენი</span>
        </div>
        <div class="overview-card-copy">${esc(item.copy)}</div>
        <div class="overview-card-meta">
          <span>${esc(item.meta)}</span>
          <span>&rarr;</span>
        </div>
      </a>`
    )).join('');
  }

  function applyProfileView(role, currentView) {
    const hub = document.getElementById('profileHub');
    const sections = document.querySelector('.sections');
    const sideCopy = document.getElementById('sideCopy');
    const articleMap = {
      data: 'dataSection',
      status: 'stats',
      team: 'teamManage',
      videos: 'videos'
    };

    Object.keys(articleMap).forEach((key) => {
      const article = document.getElementById(articleMap[key]);
      if (!article) {
        return;
      }
      article.hidden = currentView === 'overview' || key !== currentView;
    });

    if (hub) {
      hub.hidden = currentView !== 'overview';
    }
    if (sections) {
      sections.hidden = currentView === 'overview';
    }

    if (currentView === 'overview') {
      if (sideCopy) {
        sideCopy.textContent = 'აქ ჩანს მთავარი ფოტო, სწრაფი სტატუსი, პოზიციური ანალიზი და ყოველდღიური განახლება ერთ სუფთა სივრცეში.';
      }
      return;
    }

    if (sideCopy) {
      sideCopy.textContent = 'ზემოთ მოცემული ნავიგაციიდან შეგიძლია სწრაფად გადახვიდე სხვა ბლოკებზე ან დაბრუნდე მთავარ პროფილზე.';
    }
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

      if (window.sitePlayerDomain?.syncMyAccountDomain) {
        await window.sitePlayerDomain.syncMyAccountDomain(client);
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
    if (role === 'academy') {
      location.href = 'team-manager-dashboard.html';
      return;
    }

    let currentUser = user;
    let currentProfile = user.user_metadata?.profile || {};
    if (window.sitePlayerDomain?.syncMyAccountDomain) {
      await window.sitePlayerDomain.syncMyAccountDomain(client);
    }
    const syncResult = await syncSeasonalProfile(currentUser, role, currentProfile, client);
    currentUser = syncResult.user;
    currentProfile = syncResult.profile;

    teamManageState.user = currentUser;
    teamManageState.profile = currentProfile;
    teamManageState.role = role;
    teamManageState.client = client;
    teamManageState.back = back;
    dataEditorState.role = role;
    dataEditorState.user = currentUser;
    dataEditorState.profile = currentProfile;
    dataEditorState.back = back;
    dataEditorState.client = client;
    videoEditorState.role = role;
    videoEditorState.user = currentUser;
    videoEditorState.profile = currentProfile;
    videoEditorState.client = client;

    const roleView = buildRoleView(role, currentProfile, currentUser, back);
    const currentView = getProfileViewKey(role);
    document.getElementById('eyebrow').textContent = roleView.eye;
    document.getElementById('roleBadge').textContent = roleLabel(role);
    document.getElementById('memberSince').textContent = `გაწევრიანდა ${new Date(currentUser.created_at).toLocaleDateString('ka-GE')}`;
    renderAvatar(currentUser, role, currentProfile);
    renderHeroCover(role, currentProfile);
    document.getElementById('name').textContent = roleView.name;
    document.getElementById('lead').textContent = roleView.lead;
    const sideCopy = document.getElementById('sideCopy');
    if (sideCopy) {
      sideCopy.textContent = roleView.side;
    }
    const quick = document.getElementById('quick');
    if (quick) {
      quick.innerHTML = renderQuick(roleView.quick);
    }
    document.getElementById('dataGrid').innerHTML = renderItems(roleView.pass);
    document.getElementById('statsGrid').innerHTML = renderStats(roleView.stat);
    document.getElementById('videosTitle').textContent = roleView.videos.t;
    document.getElementById('videosCopy').textContent = roleView.videos.c;
    document.getElementById('videosActions').innerHTML = renderActions(roleView.videos.a);
    const mini = document.getElementById('mini');
    if (mini) {
      mini.innerHTML = renderMini(roleView.mini);
    }

    if (window.siteAuth?.renderAuthNav) {
      window.siteAuth.renderAuthNav('#profileHeaderAuth', {
        currentPath: here(),
        loginClass: 'btn btn-white',
        registerClass: 'btn btn-red',
        profileClass: 'btn btn-red',
        afterLogout: back || 'index.html'
      });
    }

    initializeDataEditor(role, currentUser, currentProfile);
    initializeVideos(role, currentUser, currentProfile, roleView);
    initializeTeamEditor();
    renderTeamManagement(role, currentProfile);
    renderProfileNavigation(role, back, currentView);
    renderProfileHub(role, currentProfile, roleView, back, currentUser);
    applyProfileView(role, currentView);

    const titleMap = {
      overview: roleView.name,
      data: 'მონაცემები',
      status: 'სტატუსი',
      team: role === 'parent' ? 'ბავშვის გუნდი' : 'გუნდი და ასაკობრივი',
      videos: 'ვიდეოები'
    };
    document.title = `${titleMap[currentView] || roleView.name} | Football Georgia`;
    showApp();
  }

  init().catch((error) => {
    showLoadingError(error?.message);
    return;
    document.querySelector('#loading .box').innerHTML = `<h1>პროფილის ჩატვირთვა ვერ შესრულდა</h1><p>${esc(error?.message || 'სცადე ხელახლა შესვლა ან გვერდის განახლება.')}</p>`;
  });
})();
