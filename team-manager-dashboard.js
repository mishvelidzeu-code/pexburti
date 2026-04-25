(() => {
  const ROLES = ['გუნდის მენეჯერი', 'აკადემიის მენეჯერი', 'ოპერაციული მენეჯერი', 'კოორდინატორი'];
  const FOCUS = ['სრული გუნდის მართვა', 'აკადემიის განვითარება', 'რეკრუტინგი', 'ტურნირები და ლოჯისტიკა'];
  const AGE_GROUPS = ['u8', 'u9', 'u10', 'u11', 'u12', 'u13', 'u14', 'u15', 'u16', 'u17', 'u19', 'pro'];
  const AGE_FILTERS = ['all', ...AGE_GROUPS];
  const POSITIONS = ['all', 'goalkeeper', 'defender', 'midfielder', 'forward'];
  const FINANCE_CATEGORIES = [
    'საწევრო გადასახადი',
    'ტრანსპორტი',
    'ეკიპირება',
    'ტურნირი',
    'მოედანი / ქირა',
    'სამედიცინო',
    'კვება',
    'სპონსორი',
    'ბონუსი',
    'ჯარიმა',
    '__custom__'
  ];
  const SECTIONS = [
    ['overview', 'მთავარი'],
    ['club', 'გუნდის პროფილი'],
    ['players', 'ფეხბურთელები'],
    ['favorites', 'რჩეულები'],
    ['watchlist', 'დასაკვირვებელი'],
    ['notes', 'ჩანაწერები'],
    ['requests', 'მოთხოვნები']
  ];

  const state = {
    client: null,
    user: null,
    profile: {},
    clubs: [],
    players: [],
    requests: [],
    selectedClub: null,
    section: 'overview',
    search: '',
    age: 'all',
    position: 'all',
    favoritesSearch: '',
    favoritesAge: 'all',
    watchSearch: '',
    watchAge: 'all',
    financeSearch: '',
    financeAge: 'all',
    financeType: 'all',
    notesSearch: '',
    requestsSearch: '',
    requestLogoDraft: '',
    hasShownAccessAlert: false
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const norm = (v) => String(v || '').trim().toLowerCase();
  const safe = (v, fallback = '') => String(v || '').trim() || fallback;
  const uniq = (v) => Array.from(new Set((Array.isArray(v) ? v : []).filter(Boolean).map(String)));
  const slugify = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9\u10d0-\u10ff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const fmt = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 'არ არის მითითებული' : d.toLocaleDateString('ka-GE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  const initials = (name) => {
    const p = String(name || '').trim().split(/\s+/).filter(Boolean);
    return p.length ? p.slice(0, 2).map((x) => x[0].toUpperCase()).join('') : 'DM';
  };

  function setStatus(id, msg, type = 'info') {
    const n = $(id);
    if (!n) return;
    if (!msg) {
      n.hidden = true;
      n.textContent = '';
      n.className = 'status info';
      return;
    }
    n.hidden = false;
    n.textContent = msg;
    n.className = 'status ' + type;
  }

  function fill(id, arr, map) {
    const node = $(id);
    if (!node) return;
    node.innerHTML = arr.map((v) => `<option value="${esc(v)}">${esc(map ? map(v) : v)}</option>`).join('');
  }

  function buildProfile(user) {
    const m = user?.user_metadata || {};
    const p = m.profile || {};
    const parts = String(m.full_name || '').trim().split(/\s+/);
    return {
      first: safe(m.first_name || parts[0]),
      last: safe(m.last_name || parts.slice(1).join(' ')),
      full: safe(m.full_name, [parts[0], parts.slice(1).join(' ')].filter(Boolean).join(' ')),
      email: safe(user?.email),
      phone: safe(m.phone_number),
      clubName: safe(p.managerClubName),
      clubCity: safe(p.managerCity),
      roleTitle: safe(p.managerRoleTitle || p.managerPosition, ROLES[0]),
      focus: safe(p.managerFocus, FOCUS[0]),
      clubSlug: safe(p.managerClubSlug),
      clubRoute: safe(p.managerClubRoute),
      clubLogo: safe(p.managerClubLogo),
      roster: uniq(p.managerRoster),
      favorites: uniq(p.managerFavorites),
      watchlist: uniq(p.managerWatchlist),
      financeEntries: Array.isArray(p.managerFinanceEntries) ? p.managerFinanceEntries : [],
      notes: Array.isArray(p.managerNotes) ? p.managerNotes : [],
      comments: p.managerPlayerComments && typeof p.managerPlayerComments === 'object' ? p.managerPlayerComments : {},
      requestLogo: safe(p.managerRequestLogo),
      requestSentAt: safe(p.managerRequestSentAt)
    };
  }

  function getLatestRequest() {
    return state.requests.length
      ? state.requests.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
      : null;
  }

  function getSelectedClub() {
    const s = norm(state.profile.clubSlug);
    const n = norm(state.profile.clubName);
    const c = norm(state.profile.clubCity);
    return state.clubs.find((x) => s && norm(x.slug) === s)
      || state.clubs.find((x) => n && norm(x.name) === n && (!c || norm(x.city) === c))
      || state.clubs.find((x) => n && norm(x.name) === n)
      || null;
  }

  function getApprovedRequestClub() {
    const approved = state.requests.find((r) => r.status === 'approved' && String(r.public_club_slug || '').trim());
    return approved ? state.clubs.find((c) => norm(c.slug) === norm(approved.public_club_slug)) || null : null;
  }

  function hasRequestAccess() {
    return state.requests.length > 0;
  }

  function managedPlayers() {
    const roster = new Set(state.profile.roster);
    const clubSlug = norm(state.selectedClub?.slug);
    const map = new Map();
    state.players
      .filter((p) => roster.has(String(p.id)) || (clubSlug && norm(p.teamSlug) === clubSlug))
      .forEach((p) => map.set(String(p.id), p));
    return Array.from(map.values());
  }

  async function savePatch(patch, statusId, okText) {
    const profile = { ...(state.user.user_metadata?.profile || {}), ...(patch || {}) };
    try {
      const res = await state.client.auth.updateUser({
        data: {
          ...(state.user.user_metadata || {}),
          first_name: patch.first ?? state.profile.first,
          last_name: patch.last ?? state.profile.last,
          full_name: [patch.first ?? state.profile.first, patch.last ?? state.profile.last].filter(Boolean).join(' ').trim(),
          phone_number: patch.phone ?? state.profile.phone,
          role: 'academy',
          profile
        }
      });
      if (res.error) throw res.error;
      state.user = res.data?.user || state.user;
      state.profile = buildProfile(state.user);
      state.selectedClub = getSelectedClub() || getApprovedRequestClub();
      if (statusId && okText) setStatus(statusId, okText, 'success');
      return true;
    } catch (e) {
      if (statusId) setStatus(statusId, e?.message || 'შენახვა ვერ შესრულდა.', 'error');
      return false;
    }
  }

  async function loadRequests() {
    try {
      const r = await state.client
        .from('club_submission_requests')
        .select('id,club_name,city,phone,status,admin_note,public_club_slug,requester_name,requester_role,created_at')
        .eq('requested_by', state.user.id)
        .order('created_at', { ascending: false });
      return !r.error && Array.isArray(r.data) ? r.data : [];
    } catch {
      return [];
    }
  }

  async function load() {
    state.profile = buildProfile(state.user);
    state.requestLogoDraft = state.profile.requestLogo || '';
    const [clubs, players, requests] = await Promise.all([
      window.siteData?.fetchPublicClubs ? window.siteData.fetchPublicClubs(state.client) : [],
      window.siteData?.fetchPublicPlayers ? window.siteData.fetchPublicPlayers(state.client) : [],
      loadRequests()
    ]);
    state.clubs = Array.isArray(clubs) ? clubs : [];
    state.players = Array.isArray(players) ? players : [];
    state.requests = requests;
    state.selectedClub = getSelectedClub() || getApprovedRequestClub();
  }

  function paintLogo(src, name) {
    if (src) {
      $('logoPreview').hidden = false;
      $('logoPreview').src = src;
      $('logoFallback').hidden = true;
    } else {
      $('logoPreview').hidden = true;
      $('logoPreview').removeAttribute('src');
      $('logoFallback').hidden = false;
      $('logoFallback').textContent = initials(name);
    }
  }

  function paintRequestLogo(src) {
    if (src) {
      $('requestLogoPreview').hidden = false;
      $('requestLogoPreview').src = src;
      $('requestLogoFallback').hidden = true;
    } else {
      $('requestLogoPreview').hidden = true;
      $('requestLogoPreview').removeAttribute('src');
      $('requestLogoFallback').hidden = false;
    }
  }

  function playerHref(p) {
    return window.siteData?.buildPlayerHref
      ? window.siteData.buildPlayerHref(p.id, 'team-manager-dashboard.html')
      : 'player-profile.html?player=' + encodeURIComponent(p.id) + '&from=' + encodeURIComponent('team-manager-dashboard.html');
  }

  function commentFor(playerId) {
    return safe(state.profile.comments?.[String(playerId)]);
  }

  function playerCard(p) {
    const roster = new Set(state.profile.roster);
    const favorites = new Set(state.profile.favorites);
    const watchlist = new Set(state.profile.watchlist);
    const id = String(p.id);
    return `
      <article class="player" data-player-id="${esc(id)}">
        <a href="${esc(playerHref(p))}"><img src="${esc(p.photo)}" alt="${esc(p.fullName)}"></a>
        <div>
          <strong>${esc(p.fullName)}</strong>
          <div class="meta">
            <span class="chip red">${esc(p.positionLabel || p.position || 'მოთამაშე')}</span>
            <span class="chip">${esc(p.ageLabel || p.ageGroup || 'ასაკი უცნობია')}</span>
            <span class="chip green">${esc(p.team || 'უგუნდო')}</span>
          </div>
          <p>${esc((p.team || 'უგუნდო') + ' · ' + (p.foot || 'ფეხი უცნობია') + ' · ' + (p.ageLabel || p.ageGroup || 'კატეგორია უცნობია'))}</p>
          <div class="row">
            <a class="mini-btn" href="${esc(playerHref(p))}">პროფილი</a>
            <button class="mini-btn ${roster.has(id) ? 'active green' : ''}" data-a="roster" data-id="${esc(id)}">${roster.has(id) ? 'ამოშლა' : 'გუნდში'}</button>
            <button class="mini-btn ${favorites.has(id) ? 'active' : ''}" data-a="fav" data-id="${esc(id)}">${favorites.has(id) ? 'რჩეულიდან' : 'რჩეულებში'}</button>
            <button class="mini-btn ${watchlist.has(id) ? 'active green' : ''}" data-a="watch" data-id="${esc(id)}">${watchlist.has(id) ? 'დასაკვირვებლიდან' : 'დასაკვირვებელში'}</button>
          </div>
          <div class="comment-box">
            <label class="comment-label" for="comment-${esc(id)}">კომენტარი ფეხბურთელზე</label>
            <textarea id="comment-${esc(id)}" class="player-comment-input" data-comment-input="${esc(id)}" placeholder="მოკლე შეფასება, დაკვირვება ან შენიშვნა...">${esc(commentFor(id))}</textarea>
            <div class="comment-actions">
              <button class="mini-btn" data-a="save-comment" data-id="${esc(id)}">კომენტარის შენახვა</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderGroups(players, emptyText) {
    if (!players.length) return `<div class="empty">${esc(emptyText)}</div>`;
    const html = AGE_GROUPS.map((group) => {
      const groupPlayers = players.filter((p) => norm(p.ageGroup) === group);
      if (!groupPlayers.length) return '';
      return `
        <section class="group-block">
          <div class="group-head">
            <h3>${esc(group === 'pro' ? 'პრო' : group.toUpperCase())}</h3>
            <span class="group-count">${groupPlayers.length}</span>
          </div>
          <div class="players-grid">${groupPlayers.map(playerCard).join('')}</div>
        </section>
      `;
    }).join('');
    return html || `<div class="empty">${esc(emptyText)}</div>`;
  }

  function filteredPlayers() {
    return state.players.filter((p) =>
      (state.age === 'all' || norm(p.ageGroup) === state.age) &&
      (state.position === 'all' || norm(p.positionKey || p.position) === state.position) &&
      (!state.search || [p.fullName, p.team, p.positionLabel, p.position, p.ageLabel, p.ageGroup].join(' ').toLowerCase().includes(norm(state.search)))
    );
  }

  function filteredCollection(ids, searchValue, ageValue) {
    const set = new Set((Array.isArray(ids) ? ids : []).map(String));
    const query = norm(searchValue);
    return state.players.filter((p) =>
      set.has(String(p.id)) &&
      (ageValue === 'all' || norm(p.ageGroup) === ageValue) &&
      (!query || [p.fullName, p.team, p.positionLabel, p.position, p.ageLabel, p.ageGroup].join(' ').toLowerCase().includes(query))
    );
  }

  function filteredNotes() {
    const query = norm(state.notesSearch);
    return state.profile.notes.filter((n) => !query || [n.text, fmt(n.createdAt)].join(' ').toLowerCase().includes(query));
  }

  function filteredRequests() {
    const query = norm(state.requestsSearch);
    return state.requests.filter((r) => !query || [
      r.club_name,
      r.city,
      r.phone,
      r.status,
      r.requester_name,
      r.requester_role,
      r.admin_note,
      fmt(r.created_at)
    ].join(' ').toLowerCase().includes(query));
  }

  function getSectionItems() {
    return SECTIONS.concat([['finance', 'ფინანსები']]).filter((item, index, arr) => arr.findIndex((x) => x[0] === item[0]) === index);
  }

  function financePlayerPool() {
    const rosterMap = new Map();
    managedPlayers().forEach((player) => rosterMap.set(String(player.id), player));
    uniq(state.profile.watchlist).forEach((id) => {
      const found = state.players.find((player) => String(player.id) === String(id));
      if (found) rosterMap.set(String(found.id), found);
    });
    uniq(state.profile.favorites).forEach((id) => {
      const found = state.players.find((player) => String(player.id) === String(id));
      if (found) rosterMap.set(String(found.id), found);
    });
    return Array.from(rosterMap.values());
  }

  function financeEntriesFor(playerId) {
    return (state.profile.financeEntries || []).filter((entry) => String(entry.playerId) === String(playerId));
  }

  function financeTotals(entries) {
    return entries.reduce((acc, entry) => {
      const amount = Math.max(0, Number(entry.amount) || 0);
      if (entry.type === 'income') acc.income += amount;
      else acc.expense += amount;
      return acc;
    }, { income: 0, expense: 0 });
  }

  function formatMoney(value) {
    return `${Math.round(Number(value) || 0).toLocaleString('en-US')} ₾`;
  }

  function filteredFinancePlayers() {
    const query = norm(state.financeSearch);
    return financePlayerPool().filter((player) =>
      (state.financeAge === 'all' || norm(player.ageGroup) === state.financeAge) &&
      (!query || [player.fullName, player.team, player.ageLabel, player.ageGroup].join(' ').toLowerCase().includes(query)) &&
      (state.financeType === 'all' || financeEntriesFor(player.id).some((entry) => entry.type === state.financeType))
    );
  }

  function buildFinanceCard(player) {
    const entries = financeEntriesFor(player.id);
    const totals = financeTotals(entries);
    return `
      <article class="finance-card">
        <div class="finance-head">
          <div>
            <strong>${esc(player.fullName)}</strong>
            <div class="muted">${esc(player.team || 'უგუნდოდ')} · ${esc(player.ageLabel || player.ageGroup || 'PRO')}</div>
          </div>
          <span class="chip ${totals.income - totals.expense >= 0 ? 'green' : 'red'}">ბალანსი ${esc(formatMoney(totals.income - totals.expense))}</span>
        </div>
        <div class="finance-totals">
          <div class="finance-tile"><span>შემოსავალი</span><strong class="finance-income">${esc(formatMoney(totals.income))}</strong></div>
          <div class="finance-tile"><span>ხარჯი</span><strong class="finance-expense">${esc(formatMoney(totals.expense))}</strong></div>
          <div class="finance-tile"><span>ჩანაწერები</span><strong>${entries.length}</strong></div>
        </div>
        <div class="finance-form">
          <select id="financeType-${esc(player.id)}" class="input">
            <option value="income">შემოსავალი</option>
            <option value="expense">ხარჯი</option>
          </select>
          <input id="financeAmount-${esc(player.id)}" class="input" type="number" min="0" step="1" placeholder="თანხა">
          <select id="financeCategory-${esc(player.id)}" class="input">
            ${FINANCE_CATEGORIES.map((category) => `<option value="${esc(category)}">${esc(category === '__custom__' ? 'ხარჯის დამატება' : category)}</option>`).join('')}
          </select>
          <input id="financeDate-${esc(player.id)}" class="input" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="finance-form" style="grid-template-columns:1fr;">
          <input id="financeCustomCategory-${esc(player.id)}" class="input" type="text" placeholder="შეიყვანე საკუთარი ხარჯის ან შემოსავლის სახელი" hidden>
        </div>
        <div class="finance-form" style="grid-template-columns:1fr auto;">
          <input id="financeNote-${esc(player.id)}" class="input" type="text" placeholder="კომენტარი ან დანიშნულება">
          <button class="btn btn-red" type="button" data-a="finance-add" data-id="${esc(player.id)}">დამატება</button>
        </div>
        <div class="finance-entry-list">
          ${entries.length ? entries.slice(0, 8).map((entry) => `
            <div class="finance-entry">
              <small>${esc(fmt(entry.date || entry.createdAt))}</small>
              <strong class="${entry.type === 'income' ? 'finance-income' : 'finance-expense'}">${esc(entry.type === 'income' ? 'შემოსავალი' : 'ხარჯი')}</strong>
              <div><strong>${esc(formatMoney(entry.amount))}</strong><div class="muted">${esc(entry.category || 'კატეგორია არ არის')} · ${esc(entry.note || 'კომენტარი არ არის')}</div></div>
              <button class="mini-btn" type="button" data-a="finance-remove" data-entry-id="${esc(entry.id)}">წაშლა</button>
            </div>
          `).join('') : '<div class="empty">ფინანსური ჩანაწერები ჯერ არ არის დამატებული.</div>'}
        </div>
      </article>
    `;
  }

  function lockedBox() {
    return `<div class="locked-box"><strong>სრული წვდომა დროებით დაბლოკილია</strong><p>ჯერ მოთხოვნების გვერდზე გადადი და გააგზავნე გუნდის საჯაროობაზე მოთხოვნა. ამის შემდეგ გაიხსნება ფეხბურთელების სრული ბაზა, რჩეულები და დასაკვირვებელი სია.</p></div>`;
  }

  function render() {
    const manager = state.profile.full || state.user?.email || 'გუნდის მენეჯერი';
    const latestRequest = getLatestRequest();
    const activeClub = state.selectedClub || getApprovedRequestClub();
    const club = safe(activeClub?.name || state.profile.clubName || latestRequest?.club_name, 'გუნდი ჯერ არ არის არჩეული');
    const city = safe(activeClub?.city || state.profile.clubCity || latestRequest?.city, 'მდებარეობა ჯერ არ არის მითითებული');
    const rosterPlayers = managedPlayers();
    const publicCount = activeClub ? state.players.filter((p) => norm(p.teamSlug) === norm(activeClub.slug)).length : 0;
    const pendingCount = state.requests.filter((x) => x.status === 'pending').length;
    const requestLabel = latestRequest ? (latestRequest.status === 'approved' ? 'დადასტურებული' : latestRequest.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში') : 'მოთხოვნა არ არის';
    const unlocked = hasRequestAccess();

    if (!unlocked && state.section !== 'requests') {
      state.section = 'requests';
    }

    $('sidebarAvatar').textContent = initials(manager);
    $('sidebarUserName').textContent = manager;
    $('sidebarUserRole').textContent = `${state.profile.roleTitle || 'გუნდის მენეჯერი'} · ${state.profile.focus || 'გუნდის მართვა'}`;

    $('heroTitle').textContent = `${manager} · გუნდის მენეჯერი`;
    $('heroCopy').textContent = activeClub
      ? `აქედან მართავ "${club}"-ს, უცვლი ლოგოს, აწყობ ფეხბურთელების სიებს და მუშაობ ნებისმიერი გუნდის მოთამაშეებთან.`
      : latestRequest
        ? `"${club}" ჯერ ${requestLabel.toLowerCase()} სტატუსშია. დამტკიცების შემდეგ გუნდი საჯაროდ გამოჩნდება გუნდების გვერდზე.`
        : 'სრული წვდომისთვის ჯერ გადადი მოთხოვნების გვერდზე და გააგზავნე გუნდის საჯაროობაზე მოთხოვნა.';
    $('heroChips').innerHTML = `<span class="chip red">გუნდის მენეჯერი</span><span class="chip">${esc(state.profile.roleTitle)}</span><span class="chip green">${esc(state.profile.focus)}</span>`;
    $('heroStats').innerHTML = [
      ['აქტიური გუნდი', club],
      ['ჩემი ფეხბურთელები', String(rosterPlayers.length)],
      ['საჯარო მოთამაშეები', String(publicCount)],
      ['მოლოდინში მოთხოვნა', String(pendingCount)]
    ].map((x) => `<div class="stat"><strong>${esc(x[1])}</strong><span>${esc(x[0])}</span></div>`).join('');

    $('clubSummary').innerHTML = [
      ['გუნდის სახელი', club],
      ['მდებარეობა', city],
      ['საჯარო სტატუსი', activeClub ? 'საჯარო ბაზაში ჩანს' : requestLabel],
      ['გუნდის გვერდი', activeClub?.route ? `<a class="inline-link" href="${esc(activeClub.route)}">გახსენი გუნდის გვერდი</a>` : 'ჯერ არ არის ხელმისაწვდომი', true]
    ].map((x) => `<div class="tile"><span class="k">${esc(x[0])}</span><div class="v">${x[2] ? x[1] : esc(x[1])}</div></div>`).join('');

    $('tabs').innerHTML = getSectionItems().map(([key, label]) => {
      const locked = !unlocked && key !== 'requests';
      const badge = key === 'requests' && !unlocked ? '<span class="nav-badge">1</span>' : '';
      return `<button class="tab ${state.section === key ? 'active' : ''}" data-sec="${key}" data-locked="${locked ? '1' : '0'}">${esc(label)}${badge}</button>`;
    }).join('');
    document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === `section-${state.section}`));

    $('overviewGrid').innerHTML = [
      ['აქტიური გუნდი', club, 'აირჩიე არსებული გუნდი ან მოითხოვე ახალი.'],
      ['ლოგო და ბრენდი', state.profile.clubLogo ? 'ლოგო მზად არის' : 'ლოგო ჯერ არ არის შერჩეული', 'ატვირთვით ან ბმულით ცვლი ვიზუალს.'],
      ['რჩეულები', String(state.profile.favorites.length), 'ყველაზე საინტერესო ფეხბურთელები.'],
      ['დასაკვირვებელი', String(state.profile.watchlist.length), 'დაკვირვების ეტაპზე მყოფი მოთამაშეები.'],
      ['ფინანსები', String((state.profile.financeEntries || []).length), 'შემოსავლები, ხარჯები და მთლიანი ბალანსი.'],
      ['ჩანაწერები', String(state.profile.notes.length), 'შიდა შენიშვნები და სამუშაო აზრები.'],
      ['წვდომა', unlocked ? 'სრული' : 'შეზღუდული', 'სრული წვდომა აქტიურდება მოთხოვნის გაგზავნის შემდეგ.']
    ].map((x) => `<div class="tile"><span class="k">${esc(x[0])}</span><div class="v">${esc(x[1])}</div><div class="muted">${esc(x[2])}</div></div>`).join('');

    $('clubSelect').value = activeClub ? `${activeClub.name}${activeClub.city ? ' · ' + activeClub.city : ''}` : '';
    $('clubOptions').innerHTML = state.clubs.map((c) => `<option value="${esc(c.name + (c.city ? ' · ' + c.city : ''))}"></option>`).join('');
    $('managerFirst').value = state.profile.first;
    $('managerLast').value = state.profile.last;
    $('managerPhone').value = state.profile.phone;
    $('managerEmail').value = state.profile.email;
    $('clubName').value = state.profile.clubName;
    $('clubCity').value = state.profile.clubCity;
    $('managerRole').value = state.profile.roleTitle;
    $('managerFocus').value = state.profile.focus;
    $('logoUrl').value = state.profile.clubLogo;
    $('requestClubName').value = state.profile.clubName;
    $('requestCity').value = state.profile.clubCity;
    $('requestPhone').value = state.profile.phone;
    paintLogo(state.profile.clubLogo, state.profile.clubName);
    paintRequestLogo(state.requestLogoDraft);

    $('playersList').innerHTML = unlocked ? renderGroups(filteredPlayers(), 'ამ ფილტრებით მოთამაშე ვერ მოიძებნა.') : lockedBox();
    $('favoritesList').innerHTML = unlocked ? renderGroups(filteredCollection(state.profile.favorites, state.favoritesSearch, state.favoritesAge), 'რჩეულებში შესაბამისი ფეხბურთელი ვერ მოიძებნა.') : lockedBox();
    $('watchList').innerHTML = unlocked ? renderGroups(filteredCollection(state.profile.watchlist, state.watchSearch, state.watchAge), 'დასაკვირვებელში შესაბამისი ფეხბურთელი ვერ მოიძებნა.') : lockedBox();
    const visibleNotes = filteredNotes();
    $('noteList').innerHTML = visibleNotes.length
      ? visibleNotes.map((n) => `<article class="note"><strong>${esc(n.text || '')}</strong><span>${esc(fmt(n.createdAt))}</span></article>`).join('')
      : '<div class="empty">ჩანაწერები ამ ძებნით ვერ მოიძებნა.</div>';

    const visibleRequests = filteredRequests();
    $('requestList').innerHTML = visibleRequests.length
      ? visibleRequests.map((r) => {
        const route = r.public_club_slug ? (window.siteData?.buildTeamHref ? window.siteData.buildTeamHref(r.public_club_slug) : 'team-dinamo-tbilisi.html?club=' + encodeURIComponent(r.public_club_slug)) : '';
        return `<article class="request"><div class="panel-head compact"><div><strong>${esc(r.club_name)}</strong><div class="muted small">გამომგზავნი: ${esc(r.requester_name || 'უცნობი')} · ${esc(r.requester_role || 'მომხმარებელი')}<br>${esc(r.city || 'ქალაქი უცნობია')}<br>ტელეფონი: ${esc(r.phone || 'არ არის მითითებული')}<br>გაგზავნილია: ${esc(fmt(r.created_at))}</div></div><span class="chip ${r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : ''}">${esc(r.status === 'approved' ? 'დადასტურებული' : r.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში')}</span></div>${r.admin_note ? `<div class="muted">ადმინის შენიშვნა: ${esc(r.admin_note)}</div>` : ''}${route ? `<div class="muted"><a class="inline-link" href="${esc(route)}">გუნდი public-ად გახსნილია</a></div>` : ''}</article>`;
      }).join('')
      : '<div class="empty">მოთხოვნები ამ ძებნით ვერ მოიძებნა.</div>';

    const financeEntries = state.profile.financeEntries || [];
    const financeTotalsAll = financeTotals(financeEntries);
    $('financeSummary').innerHTML = [
      ['სრული შემოსავალი', formatMoney(financeTotalsAll.income), 'ყველა დაფიქსირებული შემოსავალი ფეხბურთელების მიხედვით.'],
      ['სრული ხარჯი', formatMoney(financeTotalsAll.expense), 'ყველა დაფიქსირებული ხარჯი ფეხბურთელების მიხედვით.'],
      ['მთლიანი ბალანსი', formatMoney(financeTotalsAll.income - financeTotalsAll.expense), 'შემოსავალსა და ხარჯს შორის მიმდინარე სხვაობა.']
    ].map((x) => `<div class="tile"><span class="k">${esc(x[0])}</span><div class="v">${esc(x[1])}</div><div class="muted">${esc(x[2])}</div></div>`).join('');
    const financePlayers = filteredFinancePlayers();
    $('financeList').innerHTML = unlocked
      ? (financePlayers.length ? financePlayers.map(buildFinanceCard).join('') : '<div class="empty">ფინანსებში შესაბამისი ფეხბურთელი ვერ მოიძებნა.</div>')
      : lockedBox();

    $('requestAccessHint').textContent = unlocked
      ? 'მოთხოვნა უკვე გაგზავნილია. აქედან შეგიძლია სტატუსი აკონტროლო.'
      : 'სრული წვდომისთვის აუცილებელია აქედან ჯერ მოთხოვნის გაგზავნა. საჯაროდ გამოჩნდება გუნდის დასახელება და ლოგო.';
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('ფაილის წაკითხვა ვერ მოხერხდა.'));
      r.readAsDataURL(file);
    });
  }

  async function submitProfile(e) {
    e.preventDefault();
    setStatus('clubFormStatus', 'მონაცემები ინახება...', 'info');
    const first = $('managerFirst').value.trim();
    const last = $('managerLast').value.trim();
    const phone = $('managerPhone').value.trim();
    const clubName = $('clubName').value.trim();
    const clubCity = $('clubCity').value.trim();
    const roleTitle = $('managerRole').value.trim();
    const focus = $('managerFocus').value.trim();
    const clubLogo = $('logoUrl').value.trim();
    if (!first || !last || !phone || !clubName || !clubCity) {
      setStatus('clubFormStatus', 'სახელი, გვარი, ტელეფონი, გუნდის სახელი და მდებარეობა სავალდებულოა.', 'error');
      return;
    }
    const club = state.clubs.find((c) => norm(c.name) === norm(clubName) && norm(c.city) === norm(clubCity))
      || state.clubs.find((c) => norm(c.name) === norm(clubName))
      || null;
    const ok = await savePatch({
      first, last, phone,
      managerClubName: clubName,
      managerCity: clubCity,
      managerRoleTitle: roleTitle,
      managerFocus: focus,
      managerClubSlug: club?.slug || '',
      managerClubRoute: club?.route || '',
      managerClubLogo: clubLogo || club?.logo || ''
    }, 'clubFormStatus', 'გუნდის მენეჯერის პროფილი წარმატებით განახლდა.');
    if (ok) render();
  }

  async function toggleRoster(playerId) {
    const cur = uniq(state.profile.roster);
    const next = cur.includes(String(playerId)) ? cur.filter((x) => x !== String(playerId)) : cur.concat(String(playerId));
    const ok = await savePatch({ managerRoster: next }, 'playersStatus', 'ფეხბურთელების სია განახლდა.');
    if (ok) render();
  }

  async function toggleList(listKey, playerId) {
    const cur = uniq(state.profile[listKey]);
    const next = cur.includes(String(playerId)) ? cur.filter((x) => x !== String(playerId)) : cur.concat(String(playerId));
    const patch = {};
    patch[listKey === 'favorites' ? 'managerFavorites' : 'managerWatchlist'] = next;
    const ok = await savePatch(patch, 'playersStatus', 'ფეხბურთელების სია განახლდა.');
    if (ok) render();
  }

  async function savePlayerComment(playerId) {
    const input = document.querySelector(`[data-comment-input="${String(playerId)}"]`);
    const value = input ? input.value.trim() : '';
    const comments = { ...(state.profile.comments || {}) };
    if (value) comments[String(playerId)] = value;
    else delete comments[String(playerId)];
    const ok = await savePatch({ managerPlayerComments: comments }, 'playersStatus', 'კომენტარი შენახულია.');
    if (ok) render();
  }

  async function saveNote() {
    const text = $('noteInput').value.trim();
    if (!text) {
      setStatus('noteStatus', 'ჯერ ჩანაწერის ტექსტი შეიყვანე.', 'error');
      return;
    }
    const notes = [{ id: 'n-' + Date.now(), text, createdAt: new Date().toISOString() }].concat(state.profile.notes).slice(0, 100);
    const ok = await savePatch({ managerNotes: notes }, 'noteStatus', 'ჩანაწერი შენახულია.');
    if (ok) {
      $('noteInput').value = '';
      render();
    }
  }

  async function saveFinanceEntry(playerId) {
    const type = $(`financeType-${playerId}`)?.value || 'expense';
    const amount = Number($(`financeAmount-${playerId}`)?.value || 0);
    const selectedCategory = ($(`financeCategory-${playerId}`)?.value || '').trim();
    const customCategory = ($(`financeCustomCategory-${playerId}`)?.value || '').trim();
    const category = selectedCategory === '__custom__' ? customCategory : selectedCategory;
    const date = $(`financeDate-${playerId}`)?.value || new Date().toISOString().slice(0, 10);
    const note = $(`financeNote-${playerId}`)?.value.trim() || '';
    if (!amount || amount <= 0) {
      setStatus('playersStatus', 'ფინანსებში თანხა სწორად შეიყვანე.', 'error');
      return;
    }
    if (!category) {
      setStatus('playersStatus', 'მიუთითე ხარჯის ან შემოსავლის სახელი.', 'error');
      return;
    }
    const nextEntries = [{
      id: `f-${Date.now()}-${playerId}`,
      playerId: String(playerId),
      type,
      amount,
      category,
      date,
      note,
      createdAt: new Date().toISOString()
    }].concat(state.profile.financeEntries || []).slice(0, 500);
    const ok = await savePatch({ managerFinanceEntries: nextEntries }, 'playersStatus', 'ფინანსური ჩანაწერი შენახულია.');
    if (ok) render();
  }

  async function removeFinanceEntry(entryId) {
    const nextEntries = (state.profile.financeEntries || []).filter((entry) => String(entry.id) !== String(entryId));
    const ok = await savePatch({ managerFinanceEntries: nextEntries }, 'playersStatus', 'ფინანსური ჩანაწერი წაიშალა.');
    if (ok) render();
  }

  async function sendRequest() {
    setStatus('requestStatus', 'მოთხოვნა იგზავნება...', 'info');
    const club_name = $('requestClubName').value.trim();
    const city = $('requestCity').value.trim();
    const phone = $('requestPhone').value.trim();
    const duplicatePending = state.requests.some((item) => item.status === 'pending' && norm(item.club_name) === norm(club_name) && norm(item.city) === norm(city));
    if (!club_name || !city || !phone) {
      setStatus('requestStatus', 'გუნდის სახელი, მდებარეობა და ტელეფონი სავალდებულოა.', 'error');
      return;
    }
    if (duplicatePending) {
      setStatus('requestStatus', 'ამ გუნდის დამატების მოთხოვნა უკვე გაგზავნილია და მოლოდინშია.', 'info');
      return;
    }
    try {
      const r = await state.client.from('club_submission_requests').insert({
        requested_by: state.user.id,
        requester_email: state.user.email || null,
        requester_name: [state.profile.first, state.profile.last].filter(Boolean).join(' ').trim() || state.profile.full || null,
        requester_role: state.profile.roleTitle || 'გუნდის მენეჯერი',
        club_name, city, phone,
        public_club_slug: slugify(club_name + ' ' + city)
      });
      if (r.error) throw r.error;
      await savePatch({ managerRequestLogo: state.requestLogoDraft || '', managerRequestSentAt: new Date().toISOString() });
      state.requests = await loadRequests();
      setStatus('requestStatus', 'მოთხოვნა წარმატებით გაიგზავნა ადმინთან.', 'success');
      render();
    } catch (e) {
      setStatus('requestStatus', e?.message || 'მოთხოვნის გაგზავნა ვერ შესრულდა.', 'error');
    }
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const sec = e.target.closest('[data-sec]');
      if (sec) {
        if (sec.dataset.locked === '1') {
          state.section = 'requests';
          setStatus('playersStatus', 'ჯერ მოთხოვნების გვერდზე გადადი და გაგზავნე გუნდის საჯაროობის მოთხოვნა.', 'error');
          render();
          return;
        }
        state.section = sec.dataset.sec;
        render();
        return;
      }
      const act = e.target.closest('[data-a][data-id]');
      if (!act) return;
      const id = act.dataset.id;
      const a = act.dataset.a;
      if (a === 'roster') toggleRoster(id);
      if (a === 'fav') toggleList('favorites', id);
      if (a === 'watch') toggleList('watchlist', id);
      if (a === 'save-comment') savePlayerComment(id);
      if (a === 'finance-add') saveFinanceEntry(id);
      if (a === 'finance-remove') removeFinanceEntry(btn.dataset.entryId);
    });

    $('clubForm').addEventListener('submit', submitProfile);
    $('playerSearch').addEventListener('input', (e) => { state.search = e.target.value || ''; render(); });
    $('ageFilter').addEventListener('change', (e) => { state.age = e.target.value || 'all'; render(); });
    $('positionFilter').addEventListener('change', (e) => { state.position = e.target.value || 'all'; render(); });
    $('favoritesSearch').addEventListener('input', (e) => { state.favoritesSearch = e.target.value || ''; render(); });
    $('favoritesAgeFilter').addEventListener('change', (e) => { state.favoritesAge = e.target.value || 'all'; render(); });
    $('watchSearch').addEventListener('input', (e) => { state.watchSearch = e.target.value || ''; render(); });
    $('watchAgeFilter').addEventListener('change', (e) => { state.watchAge = e.target.value || 'all'; render(); });
    $('financeSearch').addEventListener('input', (e) => { state.financeSearch = e.target.value || ''; render(); });
    $('financeAgeFilter').addEventListener('change', (e) => { state.financeAge = e.target.value || 'all'; render(); });
    $('financeTypeFilter').addEventListener('change', (e) => { state.financeType = e.target.value || 'all'; render(); });
    document.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.id || !target.id.startsWith('financeCategory-')) return;
      const playerId = target.id.replace('financeCategory-', '');
      const customInput = $(`financeCustomCategory-${playerId}`);
      if (!customInput) return;
      const showCustom = target.value === '__custom__';
      customInput.hidden = !showCustom;
      if (showCustom) {
        customInput.focus();
      } else {
        customInput.value = '';
      }
    });
    $('notesSearch').addEventListener('input', (e) => { state.notesSearch = e.target.value || ''; render(); });
    $('requestsSearch').addEventListener('input', (e) => { state.requestsSearch = e.target.value || ''; render(); });
    $('saveNote').addEventListener('click', saveNote);
    $('sendRequest').addEventListener('click', sendRequest);
    $('openRequests').addEventListener('click', () => { state.section = 'requests'; render(); $('requestClubName').focus(); });
    $('clubSelect').addEventListener('change', () => {
      const raw = $('clubSelect').value.trim();
      const club = state.clubs.find((c) => raw === c.name || raw === c.name + (c.city ? ' · ' + c.city : ''));
      if (!club) return;
      $('clubName').value = club.name || '';
      $('clubCity').value = club.city || '';
      $('logoUrl').value = club.logo || '';
      paintLogo(club.logo || '', club.name || '');
    });
    $('logoUrl').addEventListener('input', (e) => paintLogo(String(e.target.value || '').trim(), $('clubName').value.trim()));
    $('clubName').addEventListener('input', (e) => { if (!$('logoUrl').value.trim()) paintLogo('', e.target.value.trim()); });
    $('clearLogo').addEventListener('click', () => {
      $('logoUrl').value = '';
      $('logoFile').value = '';
      paintLogo('', $('clubName').value.trim());
    });
    $('logoFile').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const src = await readFile(f);
        $('logoUrl').value = src;
        paintLogo(src, $('clubName').value.trim());
      } catch (err) {
        setStatus('clubFormStatus', err?.message || 'ლოგოს წაკითხვა ვერ მოხერხდა.', 'error');
      }
    });
    $('requestLogoFile').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        state.requestLogoDraft = await readFile(f);
        paintRequestLogo(state.requestLogoDraft);
      } catch (err) {
        setStatus('requestStatus', err?.message || 'ლოგოს ატვირთვა ვერ შესრულდა.', 'error');
      }
    });
    $('clearRequestLogo').addEventListener('click', () => {
      $('requestLogoFile').value = '';
      state.requestLogoDraft = '';
      paintRequestLogo('');
    });
  }

  function maybeShowAccessAlert() {
    if (state.hasShownAccessAlert || hasRequestAccess()) return;
    state.hasShownAccessAlert = true;
    window.alert('სრული წვდომის მისაღებად გადადი მოთხოვნების გვერდზე და გააგზავნე გუნდის საჯაროობაზე მოთხოვნა. საჯაროდ გამოჩნდება გუნდის დასახელება და ლოგო.');
  }

  async function init() {
    fill('managerRole', ROLES);
    fill('managerFocus', FOCUS);
    fill('ageFilter', AGE_FILTERS, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
    fill('favoritesAgeFilter', AGE_FILTERS, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
    fill('watchAgeFilter', AGE_FILTERS, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
    fill('financeAgeFilter', AGE_FILTERS, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
    fill('positionFilter', POSITIONS, (v) => v === 'all' ? 'ყველა პოზიცია' : v === 'goalkeeper' ? 'მეკარე' : v === 'defender' ? 'მცველი' : v === 'midfielder' ? 'ნახევარმცველი' : 'თავდამსხმელი');
    const auth = window.siteAuth || {};
    const res = await auth.requireAuth({ redirect: 'team-manager-dashboard.html' });
    if (!res?.user) return;
    state.client = res.client;
    state.user = res.user;
    const role = auth.getUserRole ? auth.getUserRole(state.user) : 'player';
    if (role !== 'academy') {
      window.location.replace(auth.getProfileRouteForUser ? auth.getProfileRouteForUser(state.user) : 'user-profile.html');
      return;
    }
    if (window.siteAuth?.renderAuthNav) {
      window.siteAuth.renderAuthNav('#managerHeaderAuth', { currentPath: 'team-manager-dashboard.html', loginClass: 'btn btn-white', registerClass: 'btn btn-red', profileClass: 'btn btn-red', afterLogout: 'index.html' });
    }
    await load();
    if (!hasRequestAccess()) {
      state.section = 'requests';
    }
    bind();
    maybeShowAccessAlert();
    render();
    $('loading').hidden = true;
    $('app').hidden = false;
  }

  init().catch((e) => {
    $('loading').innerHTML = `<div class="loading-card"><h1>დაფა ვერ ჩაიტვირთა</h1><p>${esc(e?.message || 'სცადე გვერდის თავიდან გახსნა.')}</p></div>`;
  });
})();
