(() => {
  const SPECIALIZATIONS = ['ტრანსფერი', 'სესხი', 'კონტრაქტის მოლაპარაკება', 'საერთაშორისო ტრანსფერი', 'აკადემიის მოთამაშეები', 'პრო ლიგა'];
  const REGIONS = ['საქართველო', 'კავკასია', 'აღმოსავლეთ ევროპა', 'დასავლეთ ევროპა', 'საერთაშორისო'];
  const AGE_GROUPS = ['u8', 'u9', 'u10', 'u11', 'u12', 'u13', 'u14', 'u15', 'u16', 'u17', 'u19', 'pro'];
  const AGE_FILTERS = ['all', ...AGE_GROUPS];
  const POSITIONS = ['all', 'goalkeeper', 'defender', 'midfielder', 'forward'];
  const POSITION_LABELS = { goalkeeper: 'მეკარე', defender: 'მცველი', midfielder: 'ნახევარმცველი', forward: 'თავდამსხმელი' };
  const DEAL_TYPE_LABELS = { transfer: 'ტრანსფერი', loan: 'სესხი', contract: 'კონტრაქტი', extension: 'გახანგრძლივება' };
  const DEAL_STATUS_LABELS = { negotiation: 'მოლაპარაკება', agreed: 'შეთანხმებული', completed: 'დასრულებული', failed: 'ჩაიშალა' };

  const SECTIONS = [
    ['overview', 'მთავარი'],
    ['profile', 'ჩემი პროფილი'],
    ['add-player', 'ფეხბურთელის დამატება'],
    ['my-players', 'ჩემი ფეხბურთელები'],
    ['prospects', 'სამიზნეები'],
    ['deals', 'გარიგებები'],
    ['notes', 'ჩანაწერები']
  ];

  const state = {
    client: null,
    user: null,
    profile: {},
    players: [],
    clubs: [],
    section: 'overview',
    myPlayersSearch: '',
    myPlayersAge: 'all',
    myPlayersPosition: 'all',
    prospectsSearch: '',
    prospectsAge: 'all',
    notesSearch: '',
    dealsSearch: '',
    dealsType: 'all',
    dealsStatus: 'all'
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const norm = (v) => String(v || '').trim().toLowerCase();
  const safe = (v, fallback = '') => String(v || '').trim() || fallback;
  const uniq = (v) => Array.from(new Set((Array.isArray(v) ? v : []).filter(Boolean).map(String)));
  const slugify = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9ა-ჿ\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const fmt = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 'თარიღი უცნობია' : d.toLocaleDateString('ka-GE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  const fmtMoney = (v) => `${Math.round(Number(v) || 0).toLocaleString('en-US')} ₾`;

  function setStatus(id, msg, type = 'info') {
    const n = $(id);
    if (!n) return;
    if (!msg) { n.hidden = true; n.textContent = ''; n.className = 'status info'; return; }
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
      agency: safe(p.agentAgency),
      license: safe(p.agentLicense),
      spec: safe(p.agentSpec, SPECIALIZATIONS[0]),
      region: safe(p.agentRegion, REGIONS[0]),
      roster: uniq(p.agentRoster),
      prospects: uniq(p.agentProspects),
      deals: Array.isArray(p.agentDeals) ? p.agentDeals : [],
      notes: Array.isArray(p.agentNotes) ? p.agentNotes : [],
      comments: p.agentPlayerComments && typeof p.agentPlayerComments === 'object' ? p.agentPlayerComments : {}
    };
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
          role: 'agent',
          profile
        }
      });
      if (res.error) throw res.error;
      state.user = res.data?.user || state.user;
      state.profile = buildProfile(state.user);
      if (statusId && okText) setStatus(statusId, okText, 'success');
      return true;
    } catch (e) {
      if (statusId) setStatus(statusId, e?.message || 'შენახვა ვერ შესრულდა.', 'error');
      return false;
    }
  }

  async function fetchMissingTrackedPlayers() {
    if (!window.siteData?.fetchPlayerById) return;
    const knownIds = new Set(state.players.map((p) => String(p.id)));
    const missing = uniq([...state.profile.roster, ...state.profile.prospects])
      .filter((id) => id && !knownIds.has(id));
    if (!missing.length) return;
    const results = await Promise.allSettled(missing.map((id) => window.siteData.fetchPlayerById(state.client, id)));
    results.forEach((r) => { if (r.status === 'fulfilled' && r.value) state.players.push(r.value); });
  }

  async function load() {
    state.profile = buildProfile(state.user);
    const [clubs, players] = await Promise.all([
      window.siteData?.fetchPublicClubs ? window.siteData.fetchPublicClubs(state.client) : [],
      window.siteData?.fetchPublicPlayers ? window.siteData.fetchPublicPlayers(state.client) : []
    ]);
    state.clubs = Array.isArray(clubs) ? clubs : [];
    state.players = Array.isArray(players) ? players : [];
    await fetchMissingTrackedPlayers();
  }

  function playerHref(p) {
    return window.siteData?.buildPlayerHref
      ? window.siteData.buildPlayerHref(p.id, 'agent-dashboard.html')
      : 'player-profile.html?player=' + encodeURIComponent(p.id) + '&from=agent-dashboard.html';
  }

  function commentFor(playerId) {
    return safe(state.profile.comments?.[String(playerId)]);
  }

  function playerCard(p, listKey) {
    const rosterSet = new Set(state.profile.roster);
    const prospectsSet = new Set(state.profile.prospects);
    const id = String(p.id);
    const inRoster = rosterSet.has(id);
    const inProspects = prospectsSet.has(id);
    return `
      <article class="player" data-player-id="${esc(id)}">
        <a href="${esc(playerHref(p))}"><img src="${esc(p.photo)}" alt="${esc(p.fullName)}"></a>
        <div>
          <strong>${esc(p.fullName)}</strong>
          <div class="meta">
            <span class="chip blue">${esc(p.positionLabel || p.position || 'მოთამაშე')}</span>
            <span class="chip">${esc(p.ageLabel || p.ageGroup || 'ასაკი უცნობია')}</span>
            <span class="chip green">${esc(p.team || 'უგუნდო')}</span>
          </div>
          <div class="row">
            <a class="mini-btn" href="${esc(playerHref(p))}">პროფილი</a>
            <button class="mini-btn ${inRoster ? 'active green' : ''}" data-a="toggle-roster" data-id="${esc(id)}">${inRoster ? 'ამოშლა' : 'კლიენტში'}</button>
            <button class="mini-btn ${inProspects ? 'active' : ''}" data-a="toggle-prospect" data-id="${esc(id)}">${inProspects ? 'სამიზნიდან' : 'სამიზნეში'}</button>
          </div>
          <div class="comment-box">
            <label class="comment-label" for="comment-${esc(id)}">შეფასება / ჩანაწერი</label>
            <textarea id="comment-${esc(id)}" class="player-comment-input" data-comment-input="${esc(id)}" placeholder="სკაუტინგის შეფასება, ტრანსფერის შესაძლებლობა...">${esc(commentFor(id))}</textarea>
            <div class="comment-actions">
              <button class="mini-btn" data-a="save-comment" data-id="${esc(id)}">შენახვა</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderGroups(players, emptyText, listKey) {
    if (!players.length) return `<div class="empty">${esc(emptyText)}</div>`;
    const html = AGE_GROUPS.map((group) => {
      const gp = players.filter((p) => norm(p.ageGroup) === group);
      if (!gp.length) return '';
      return `
        <section class="group-block">
          <div class="group-head">
            <h3>${esc(group === 'pro' ? 'პრო' : group.toUpperCase())}</h3>
            <span class="group-count">${gp.length}</span>
          </div>
          <div class="players-grid">${gp.map((p) => playerCard(p, listKey)).join('')}</div>
        </section>
      `;
    }).join('');
    return html || `<div class="empty">${esc(emptyText)}</div>`;
  }

  function filteredMyPlayers() {
    const ids = new Set(state.profile.roster);
    const q = norm(state.myPlayersSearch);
    return state.players.filter((p) =>
      ids.has(String(p.id)) &&
      (state.myPlayersAge === 'all' || norm(p.ageGroup) === state.myPlayersAge) &&
      (state.myPlayersPosition === 'all' || norm(p.positionKey || p.position) === state.myPlayersPosition) &&
      (!q || [p.fullName, p.team, p.positionLabel, p.ageLabel, p.ageGroup].join(' ').toLowerCase().includes(q))
    );
  }

  function filteredProspects() {
    const ids = new Set(state.profile.prospects);
    const q = norm(state.prospectsSearch);
    return state.players.filter((p) =>
      ids.has(String(p.id)) &&
      (state.prospectsAge === 'all' || norm(p.ageGroup) === state.prospectsAge) &&
      (!q || [p.fullName, p.team, p.positionLabel, p.ageLabel].join(' ').toLowerCase().includes(q))
    );
  }

  function filteredNotes() {
    const q = norm(state.notesSearch);
    return state.profile.notes.filter((n) => !q || [n.text, fmt(n.createdAt)].join(' ').toLowerCase().includes(q));
  }

  function filteredDeals() {
    const q = norm(state.dealsSearch);
    return state.profile.deals.filter((d) =>
      (state.dealsType === 'all' || d.type === state.dealsType) &&
      (state.dealsStatus === 'all' || d.status === state.dealsStatus) &&
      (!q || [d.playerName, d.fromClub, d.toClub, d.status, d.type, d.note].join(' ').toLowerCase().includes(q))
    );
  }

  function dealStatusClass(status) {
    return 'deal-status-' + (status || 'negotiation');
  }

  function buildDealCard(d) {
    const typeLabel = DEAL_TYPE_LABELS[d.type] || d.type;
    const statusLabel = DEAL_STATUS_LABELS[d.status] || d.status;
    return `
      <article class="deal-card">
        <div class="deal-head">
          <div>
            <strong>${esc(d.playerName || 'უცნობი ფეხბურთელი')}</strong>
            <div class="muted">${esc(typeLabel)} · ${esc(fmt(d.date || d.createdAt))}</div>
          </div>
          <span class="chip ${dealStatusClass(d.status)}">${esc(statusLabel)}</span>
        </div>
        <div class="deal-clubs">
          <strong>${esc(d.fromClub || '—')}</strong>
          <span class="deal-arrow">→</span>
          <strong>${esc(d.toClub || '—')}</strong>
        </div>
        ${d.amount ? `<div class="deal-amount">${esc(fmtMoney(d.amount))}</div>` : ''}
        ${d.note ? `<div class="muted">${esc(d.note)}</div>` : ''}
        <div class="row">
          <button class="mini-btn" data-a="delete-deal" data-id="${esc(d.id)}">წაშლა</button>
        </div>
      </article>
    `;
  }

  async function loadAddedPlayers() {
    if (!state.client?.from) return [];
    try {
      const { data, error } = await state.client
        .from('player_registry')
        .select('id, full_name, primary_position, age_group, club_name, is_active, visibility_public, created_at')
        .eq('owner_user_id', state.user.id)
        .order('created_at', { ascending: false });
      return (!error && Array.isArray(data)) ? data : [];
    } catch { return []; }
  }

  function render() {
    const agent = state.profile.full || state.user?.email || 'აგენტი';
    const rosterCount = state.profile.roster.length;
    const prospectsCount = state.profile.prospects.length;
    const dealsCount = state.profile.deals.length;
    const activeDeals = state.profile.deals.filter((d) => d.status === 'negotiation' || d.status === 'agreed').length;

    $('heroTitle').textContent = `${agent} · აგენტი`;
    $('heroCopy').textContent = state.profile.agency
      ? `"${state.profile.agency}" — ${state.profile.spec || ''} · ${state.profile.region || ''}`
      : 'შეავსე პროფილი, დაამატე ფეხბურთელები და თვალი ადევნე გარიგებებს ერთ სივრცეში.';
    $('heroChips').innerHTML = `
      <span class="chip blue">აგენტი</span>
      ${state.profile.agency ? `<span class="chip">${esc(state.profile.agency)}</span>` : ''}
      ${state.profile.spec ? `<span class="chip green">${esc(state.profile.spec)}</span>` : ''}
    `;
    $('heroStats').innerHTML = [
      ['ჩემი კლიენტები', String(rosterCount)],
      ['სამიზნეები', String(prospectsCount)],
      ['სულ გარიგება', String(dealsCount)],
      ['აქტიური გარიგება', String(activeDeals)]
    ].map((x) => `<div class="stat"><strong>${esc(x[1])}</strong><span>${esc(x[0])}</span></div>`).join('');

    $('tabs').innerHTML = SECTIONS.map(([key, label]) =>
      `<button class="tab ${state.section === key ? 'active' : ''}" data-sec="${key}">${esc(label)}</button>`
    ).join('');
    document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === `section-${state.section}`));

    $('overviewGrid').innerHTML = [
      ['ჩემი კლიენტები', String(rosterCount), 'ფეხბურთელები, რომელთაც წარმოვადგენ.'],
      ['სამიზნეები', String(prospectsCount), 'პოტენციური კლიენტები და ტრანსფერის სამიზნეები.'],
      ['გარიგებები', String(dealsCount), 'სრული გარიგებების ისტორია.'],
      ['აქტიური გარიგება', String(activeDeals), 'მოლაპარაკება ან შეთანხმებულის სტატუსში.'],
      ['ჩანაწერები', String(state.profile.notes.length), 'შიდა შენიშვნები და სკაუტინგის ანგარიშები.'],
      ['სააგენტო', state.profile.agency || 'არ არის შევსებული', 'შეავსე პროფილის სექციაში.']
    ].map((x) => `<div class="tile"><span class="k">${esc(x[0])}</span><div class="v">${esc(x[1])}</div><div class="muted">${esc(x[2])}</div></div>`).join('');

    const recentDeals = state.profile.deals.slice(0, 3);
    $('recentDeals').innerHTML = recentDeals.length
      ? `<div class="deals-grid">${recentDeals.map(buildDealCard).join('')}</div>`
      : '<div class="empty">გარიგებები ჯერ არ არის დამატებული.</div>';

    $('agentFirst').value = state.profile.first;
    $('agentLast').value = state.profile.last;
    $('agentPhone').value = state.profile.phone;
    $('agentEmail').value = state.profile.email;
    $('agentAgency').value = state.profile.agency;
    $('agentLicense').value = state.profile.license;
    $('agentSpec').value = state.profile.spec;
    $('agentRegion').value = state.profile.region;

    $('clubOptionsAdd').innerHTML = state.clubs.map((c) => `<option value="${esc(c.name)}"></option>`).join('');

    $('myPlayersList').innerHTML = renderGroups(filteredMyPlayers(), 'ჩემი კლიენტები ამ ფილტრებით ვერ მოიძებნა.', 'roster');
    $('prospectsList').innerHTML = renderGroups(filteredProspects(), 'სამიზნეები ამ ძებნით ვერ მოიძებნა.', 'prospects');

    const visibleNotes = filteredNotes();
    $('noteList').innerHTML = visibleNotes.length
      ? visibleNotes.map((n) => `<article class="note"><strong>${esc(n.text || '')}</strong><span>${esc(fmt(n.createdAt))}</span><button class="mini-btn" data-a="delete-note" data-id="${esc(n.id)}">წაშლა</button></article>`).join('')
      : '<div class="empty">ჩანაწერები ამ ძებნით ვერ მოიძებნა.</div>';

    const visibleDeals = filteredDeals();
    $('dealsList').innerHTML = visibleDeals.length
      ? visibleDeals.map(buildDealCard).join('')
      : '<div class="empty">გარიგებები ამ ფილტრებით ვერ მოიძებნა.</div>';

    $('dealPlayerOptions').innerHTML = [...state.profile.roster, ...state.profile.prospects]
      .map((id) => state.players.find((p) => String(p.id) === id))
      .filter(Boolean)
      .map((p) => `<option value="${esc(p.fullName)}"></option>`)
      .join('');

    loadAddedPlayers().then((rows) => {
      $('addedPlayersList').innerHTML = rows.length
        ? `<div class="deals-grid">${rows.map((r) => `
          <article class="deal-card">
            <div class="deal-head">
              <div>
                <strong>${esc(r.full_name)}</strong>
                <div class="muted">${esc(r.primary_position || 'პოზიცია უცნობია')} · ${esc(r.age_group ? r.age_group.toUpperCase() : 'PRO')} · ${esc(r.club_name || 'უგუნდო')}</div>
              </div>
              <span class="chip ${r.visibility_public ? 'green' : ''}">${r.visibility_public ? 'საჯარო' : 'კერძო'}</span>
            </div>
            <div class="muted">დამატებულია: ${esc(fmt(r.created_at))}</div>
          </article>
        `).join('')}</div>`
        : '<div class="empty">ჯერ ფეხბურთელი არ გაქვს დამატებული.</div>';
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('ფაილის წაკითხვა ვერ მოხერხდა.'));
      r.readAsDataURL(file);
    });
  }

  function paintPhoto(src) {
    if (src) {
      $('playerPhotoPreview').hidden = false;
      $('playerPhotoPreview').src = src;
      $('playerPhotoFallback').hidden = true;
    } else {
      $('playerPhotoPreview').hidden = true;
      $('playerPhotoPreview').removeAttribute('src');
      $('playerPhotoFallback').hidden = false;
    }
  }

  async function submitAgentProfile(e) {
    e.preventDefault();
    setStatus('agentFormStatus', 'ინახება...', 'info');
    const first = $('agentFirst').value.trim();
    const last = $('agentLast').value.trim();
    const phone = $('agentPhone').value.trim();
    const agency = $('agentAgency').value.trim();
    const license = $('agentLicense').value.trim();
    const spec = $('agentSpec').value.trim();
    const region = $('agentRegion').value.trim();
    if (!first || !last || !phone) {
      setStatus('agentFormStatus', 'სახელი, გვარი და ტელეფონი სავალდებულოა.', 'error');
      return;
    }
    const ok = await savePatch({ first, last, phone, agentAgency: agency, agentLicense: license, agentSpec: spec, agentRegion: region }, 'agentFormStatus', 'პროფილი წარმატებით განახლდა.');
    if (ok) render();
  }

  async function addPlayer(e) {
    e.preventDefault();
    setStatus('addPlayerStatus', 'ფეხბურთელი ემატება...', 'info');
    const fullName = $('newPlayerName').value.trim();
    const position = $('newPlayerPosition').value;
    const ageGroup = $('newPlayerAgeGroup').value;
    const birthYear = $('newPlayerBirthYear').value.trim();
    const foot = $('newPlayerFoot').value;
    const clubName = $('newPlayerClub').value.trim();
    const isPublic = $('newPlayerPublic').checked;
    const photoUrl = $('playerPhotoUrl').value.trim();
    if (!fullName) {
      setStatus('addPlayerStatus', 'ფეხბურთელის სახელი სავალდებულოა.', 'error');
      return;
    }
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    const clubSlug = clubName ? slugify(clubName) : '';
    const now = new Date().toISOString();
    const entry = {
      owner_user_id: state.user.id,
      owner_role: 'agent',
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      primary_position: position !== 'all' ? position : 'midfielder',
      position_label: POSITION_LABELS[position] || position,
      age_group: ageGroup !== 'all' ? ageGroup : 'pro',
      birth_year: birthYear ? Number(birthYear) : null,
      preferred_foot: foot || null,
      club_name: clubName || null,
      club_slug: clubSlug || null,
      avatar_path: photoUrl || null,
      visibility_public: isPublic,
      is_active: true,
      source_key: `agent:${state.user.id}:${slugify(fullName)}:${Date.now()}`
    };
    try {
      const { error } = await state.client.from('player_registry').insert(entry);
      if (error) throw error;
      setStatus('addPlayerStatus', `"${fullName}" წარმატებით დაემატა ბაზაში.`, 'success');
      $('addPlayerForm').reset();
      paintPhoto('');
      $('playerPhotoUrl').value = '';
      render();
    } catch (err) {
      setStatus('addPlayerStatus', err?.message || 'ფეხბურთელის დამატება ვერ მოხერხდა.', 'error');
    }
  }

  async function toggleRoster(playerId) {
    const cur = uniq(state.profile.roster);
    const next = cur.includes(String(playerId)) ? cur.filter((x) => x !== String(playerId)) : cur.concat(String(playerId));
    const ok = await savePatch({ agentRoster: next }, 'myPlayersStatus', 'კლიენტების სია განახლდა.');
    if (ok) render();
  }

  async function toggleProspect(playerId) {
    const cur = uniq(state.profile.prospects);
    const next = cur.includes(String(playerId)) ? cur.filter((x) => x !== String(playerId)) : cur.concat(String(playerId));
    const ok = await savePatch({ agentProspects: next }, null, null);
    if (ok) {
      await fetchMissingTrackedPlayers();
      render();
    }
  }

  async function savePlayerComment(playerId) {
    const input = document.querySelector(`[data-comment-input="${String(playerId)}"]`);
    const value = input ? input.value.trim() : '';
    const comments = { ...(state.profile.comments || {}) };
    if (value) comments[String(playerId)] = value;
    else delete comments[String(playerId)];
    const ok = await savePatch({ agentPlayerComments: comments }, 'myPlayersStatus', 'შეფასება შენახულია.');
    if (ok) render();
  }

  async function saveDeal() {
    setStatus('dealFormStatus', 'ინახება...', 'info');
    const playerName = $('dealPlayerName').value.trim();
    const type = $('dealType').value;
    const dealStatusVal = $('dealStatusSelect').value;
    const date = $('dealDate').value || new Date().toISOString().slice(0, 10);
    const fromClub = $('dealFromClub').value.trim();
    const toClub = $('dealToClub').value.trim();
    const note = $('dealNote').value.trim();
    const amount = Number($('dealAmount').value || 0);
    if (!playerName) {
      setStatus('dealFormStatus', 'ფეხბურთელის სახელი სავალდებულოა.', 'error');
      return;
    }
    const deals = [{
      id: `d-${Date.now()}`,
      playerName,
      type,
      status: dealStatusVal,
      date,
      fromClub,
      toClub,
      note,
      amount,
      createdAt: new Date().toISOString()
    }].concat(state.profile.deals).slice(0, 200);
    const ok = await savePatch({ agentDeals: deals }, 'dealFormStatus', 'გარიგება შენახულია.');
    if (ok) {
      $('dealPlayerName').value = '';
      $('dealFromClub').value = '';
      $('dealToClub').value = '';
      $('dealNote').value = '';
      $('dealAmount').value = '';
      render();
    }
  }

  async function deleteDeal(dealId) {
    const deals = state.profile.deals.filter((d) => String(d.id) !== String(dealId));
    const ok = await savePatch({ agentDeals: deals }, null, null);
    if (ok) render();
  }

  async function saveNote() {
    const text = $('noteInput').value.trim();
    if (!text) { setStatus('noteStatus', 'ჩანაწერის ტექსტი შეიყვანე.', 'error'); return; }
    const notes = [{ id: 'n-' + Date.now(), text, createdAt: new Date().toISOString() }].concat(state.profile.notes).slice(0, 100);
    const ok = await savePatch({ agentNotes: notes }, 'noteStatus', 'ჩანაწერი შენახულია.');
    if (ok) { $('noteInput').value = ''; render(); }
  }

  async function deleteNote(noteId) {
    const notes = state.profile.notes.filter((n) => String(n.id) !== String(noteId));
    const ok = await savePatch({ agentNotes: notes }, 'noteStatus', 'ჩანაწერი წაიშალა.');
    if (ok) render();
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const sec = e.target.closest('[data-sec]');
      if (sec) { state.section = sec.dataset.sec; render(); return; }
      const act = e.target.closest('[data-a][data-id]');
      if (!act) return;
      const id = act.dataset.id;
      const a = act.dataset.a;
      if (a === 'toggle-roster') toggleRoster(id);
      if (a === 'toggle-prospect') toggleProspect(id);
      if (a === 'save-comment') savePlayerComment(id);
      if (a === 'delete-note') deleteNote(id);
      if (a === 'delete-deal') deleteDeal(id);
    });

    $('agentForm').addEventListener('submit', submitAgentProfile);
    $('addPlayerForm').addEventListener('submit', addPlayer);
    $('saveNote').addEventListener('click', saveNote);
    $('saveDeal').addEventListener('click', saveDeal);

    $('myPlayersSearch').addEventListener('input', (e) => { state.myPlayersSearch = e.target.value || ''; render(); });
    $('myPlayersAgeFilter').addEventListener('change', (e) => { state.myPlayersAge = e.target.value || 'all'; render(); });
    $('myPlayersPositionFilter').addEventListener('change', (e) => { state.myPlayersPosition = e.target.value || 'all'; render(); });
    $('prospectsSearch').addEventListener('input', (e) => { state.prospectsSearch = e.target.value || ''; render(); });
    $('prospectsAgeFilter').addEventListener('change', (e) => { state.prospectsAge = e.target.value || 'all'; render(); });
    $('notesSearch').addEventListener('input', (e) => { state.notesSearch = e.target.value || ''; render(); });
    $('dealsSearch').addEventListener('input', (e) => { state.dealsSearch = e.target.value || ''; render(); });
    $('dealsTypeFilter').addEventListener('change', (e) => { state.dealsType = e.target.value || 'all'; render(); });
    $('dealsStatusFilter').addEventListener('change', (e) => { state.dealsStatus = e.target.value || 'all'; render(); });

    $('playerPhotoUrl').addEventListener('input', (e) => paintPhoto(String(e.target.value || '').trim()));
    $('playerPhotoFile').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const src = await readFile(f);
        $('playerPhotoUrl').value = src;
        paintPhoto(src);
      } catch (err) {
        setStatus('addPlayerStatus', err?.message || 'ფოტოს ატვირთვა ვერ შესრულდა.', 'error');
      }
    });
    $('clearPlayerPhoto').addEventListener('click', () => {
      $('playerPhotoFile').value = '';
      $('playerPhotoUrl').value = '';
      paintPhoto('');
    });
  }

  async function init() {
    fill('agentSpec', SPECIALIZATIONS);
    fill('agentRegion', REGIONS);
    fill('myPlayersAgeFilter', AGE_FILTERS, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
    fill('prospectsAgeFilter', AGE_FILTERS, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
    fill('newPlayerAgeGroup', AGE_GROUPS, (v) => v === 'pro' ? 'პრო' : v.toUpperCase());
    fill('newPlayerPosition', POSITIONS.filter((p) => p !== 'all'), (v) => POSITION_LABELS[v] || v);
    fill('myPlayersPositionFilter', POSITIONS, (v) => v === 'all' ? 'ყველა პოზიცია' : POSITION_LABELS[v] || v);

    const auth = window.siteAuth || {};
    const res = await auth.requireAuth({ redirect: 'agent-dashboard.html' });
    if (!res?.user) return;
    state.client = res.client;
    state.user = res.user;
    const role = auth.getUserRole ? auth.getUserRole(state.user) : 'player';
    if (role !== 'agent') {
      window.location.replace(auth.getProfileRouteForUser ? auth.getProfileRouteForUser(state.user) : 'user-profile.html');
      return;
    }
    if (window.siteAuth?.renderAuthNav) {
      window.siteAuth.renderAuthNav('#agentHeaderAuth', { currentPath: 'agent-dashboard.html', loginClass: 'btn btn-white', registerClass: 'btn btn-blue', profileClass: 'btn btn-blue', afterLogout: 'index.html' });
    }
    await load();
    bind();
    render();
    $('loading').hidden = true;
    $('app').hidden = false;
  }

  init().catch((e) => {
    $('loading').innerHTML = `<div class="loading-card"><h1>დაფა ვერ ჩაიტვირთა</h1><p>${esc(e?.message || 'სცადე გვერდის თავიდან გახსნა.')}</p></div>`;
  });
})();
