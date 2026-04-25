(() => {
  const ROLES = ['გუნდის მენეჯერი', 'აკადემიის მენეჯერი', 'ოპერაციული მენეჯერი', 'კოორდინატორი'];
  const FOCUS = ['სრული გუნდის მართვა', 'აკადემიის განვითარება', 'რეკრუტინგი', 'ტურნირები და ლოჯისტიკა'];
  const AGES = ['all', 'u8', 'u9', 'u10', 'u11', 'u12', 'u13', 'u14', 'u15', 'u16', 'u17', 'u19', 'pro'];
  const POSITIONS = ['all', 'goalkeeper', 'defender', 'midfielder', 'forward'];
  const SECTIONS = [['overview', 'მთავარი'], ['club', 'გუნდის პროფილი'], ['roster', 'ჩემი ფეხბურთელები'], ['database', 'ბაზა'], ['favorites', 'რჩეულები'], ['watchlist', 'დასაკვირვებელი'], ['notes', 'ჩანაწერები'], ['requests', 'მოთხოვნები']];
  const state = { client: null, user: null, profile: {}, clubs: [], players: [], requests: [], selectedClub: null, section: 'overview', search: '', age: 'all', position: 'all' };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const norm = (v) => String(v || '').trim().toLowerCase();
  const safe = (v, f = '') => String(v || '').trim() || f;
  const uniq = (v) => Array.from(new Set((Array.isArray(v) ? v : []).filter(Boolean).map(String)));
  const fmt = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? 'არ არის მითითებული' : d.toLocaleDateString('ka-GE', { year: 'numeric', month: '2-digit', day: '2-digit' }); };
  const initials = (n) => { const p = String(n || '').trim().split(/\s+/).filter(Boolean); return p.length ? p.slice(0, 2).map((x) => x[0].toUpperCase()).join('') : 'DM'; };
  const slugify = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9\u10d0-\u10ff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  function setStatus(id, msg, type = 'info') {
    const n = $(id);
    if (!msg) { n.hidden = true; n.textContent = ''; n.className = 'status info'; return; }
    n.hidden = false; n.textContent = msg; n.className = 'status ' + type;
  }

  function fill(id, arr, map) {
    $(id).innerHTML = arr.map((v) => '<option value="' + esc(v) + '">' + esc(map ? map(v) : v) + '</option>').join('');
  }

  function buildProfile(u) {
    const m = u?.user_metadata || {};
    const p = m.profile || {};
    const parts = String(m.full_name || '').trim().split(/\s+/);
    return {
      first: safe(m.first_name || parts[0]),
      last: safe(m.last_name || parts.slice(1).join(' ')),
      full: safe(m.full_name, [parts[0], parts.slice(1).join(' ')].filter(Boolean).join(' ')),
      email: safe(u?.email),
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
      notes: Array.isArray(p.managerNotes) ? p.managerNotes : []
    };
  }

  function getSelectedClub() {
    const s = norm(state.profile.clubSlug), n = norm(state.profile.clubName), c = norm(state.profile.clubCity);
    return state.clubs.find((x) => s && norm(x.slug) === s)
      || state.clubs.find((x) => n && norm(x.name) === n && (!c || norm(x.city) === c))
      || state.clubs.find((x) => n && norm(x.name) === n)
      || null;
  }

  function getLatestRequest() {
    return Array.isArray(state.requests) && state.requests.length
      ? state.requests.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]
      : null;
  }

  function getApprovedRequestClub() {
    const approved = (state.requests || []).find((item) => item.status === 'approved' && String(item.public_club_slug || '').trim());
    return approved
      ? state.clubs.find((club) => norm(club.slug) === norm(approved.public_club_slug)) || null
      : null;
  }

  function managedPlayers() {
    const roster = new Set(state.profile.roster);
    const slug = norm(state.selectedClub?.slug);
    const map = new Map();
    state.players
      .filter((p) => roster.has(String(p.id)) || (slug && norm(p.teamSlug) === slug))
      .forEach((p) => map.set(String(p.id), p));
    return Array.from(map.values());
  }

  async function savePatch(p, id, ok) {
    const profile = { ...(state.user.user_metadata?.profile || {}), ...(p || {}) };
    try {
      const r = await state.client.auth.updateUser({
        data: {
          ...(state.user.user_metadata || {}),
          first_name: p.first ?? state.profile.first,
          last_name: p.last ?? state.profile.last,
          full_name: [p.first ?? state.profile.first, p.last ?? state.profile.last].filter(Boolean).join(' ').trim(),
          phone_number: p.phone ?? state.profile.phone,
          role: 'academy',
          profile
        }
      });
      if (r.error) throw r.error;
      state.user = r.data?.user || state.user;
      state.profile = buildProfile(state.user);
      state.selectedClub = getSelectedClub();
      if (id && ok) setStatus(id, ok, 'success');
      return true;
    } catch (e) {
      if (id) setStatus(id, e?.message || 'შენახვა ვერ შესრულდა.', 'error');
      return false;
    }
  }

  async function loadRequests() {
    try {
      const r = await state.client.from('club_submission_requests').select('id,club_name,city,phone,status,admin_note,public_club_slug,requester_name,requester_role,created_at').eq('requested_by', state.user.id).order('created_at', { ascending: false });
      return !r.error && Array.isArray(r.data) ? r.data : [];
    } catch {
      return [];
    }
  }

  async function load() {
    state.profile = buildProfile(state.user);
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

  function href(p) {
    return window.siteData?.buildPlayerHref
      ? window.siteData.buildPlayerHref(p.id, 'team-manager-dashboard.html')
      : 'player-profile.html?player=' + encodeURIComponent(p.id) + '&from=' + encodeURIComponent('team-manager-dashboard.html');
  }

  function playerCard(p) {
    const r = new Set(state.profile.roster), f = new Set(state.profile.favorites), w = new Set(state.profile.watchlist), id = String(p.id);
    return '<article class="player"><a href="' + esc(href(p)) + '"><img src="' + esc(p.photo) + '" alt="' + esc(p.fullName) + '"></a><div><strong>' + esc(p.fullName) + '</strong><div class="meta"><span class="chip red">' + esc(p.positionLabel || p.position || 'მოთამაშე') + '</span><span class="chip">' + esc(p.ageLabel || p.ageGroup || 'ასაკი უცნობია') + '</span><span class="chip green">' + esc(p.team || 'უგუნდო') + '</span></div><p>' + esc((p.team || 'უგუნდო') + ' · ' + (p.foot || 'ფეხი უცნობია') + ' · ' + (p.ageLabel || p.ageGroup || 'კატეგორია უცნობია')) + '</p><div class="row"><a class="mini-btn" href="' + esc(href(p)) + '">პროფილი</a><button class="mini-btn ' + (r.has(id) ? 'active green' : '') + '" data-a="roster" data-id="' + esc(id) + '">' + (r.has(id) ? 'ამოშლა' : 'გუნდში') + '</button><button class="mini-btn ' + (f.has(id) ? 'active' : '') + '" data-a="fav" data-id="' + esc(id) + '">' + (f.has(id) ? 'რჩეულიდან' : 'რჩეულებში') + '</button><button class="mini-btn ' + (w.has(id) ? 'active green' : '') + '" data-a="watch" data-id="' + esc(id) + '">' + (w.has(id) ? 'დასაკვირვებლიდან' : 'დასაკვირვებელში') + '</button></div></div></article>';
  }

  function render() {
    const manager = state.profile.full || state.user?.email || 'გუნდის მენეჯერი';
    const latestRequest = getLatestRequest();
    const activeClub = state.selectedClub || getApprovedRequestClub();
    const club = safe(activeClub?.name || state.profile.clubName || latestRequest?.club_name, 'გუნდი ჯერ არ არის არჩეული');
    const city = safe(activeClub?.city || state.profile.clubCity || latestRequest?.city, 'მდებარეობა ჯერ არ არის მითითებული');
    const squad = managedPlayers();
    const publicCount = activeClub ? state.players.filter((p) => norm(p.teamSlug) === norm(activeClub.slug)).length : 0;
    const pending = state.requests.filter((x) => x.status === 'pending').length;
    const requestStateLabel = latestRequest
      ? (latestRequest.status === 'approved' ? 'დადასტურებული' : latestRequest.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში')
      : 'მოთხოვნა არ არის';

    $('sidebarAvatar').textContent = initials(manager);
    $('sidebarUserName').textContent = manager;
    $('sidebarUserRole').textContent = (state.profile.roleTitle || 'გუნდის მენეჯერი') + ' · ' + (state.profile.focus || 'გუნდის მართვა');

    $('heroTitle').textContent = manager + ' · გუნდის მენეჯერი';
    $('heroCopy').textContent = activeClub
      ? 'აქედან მართავ "' + club + '"-ს, უცვლი ლოგოს, აწყობ roster-ს და მუშაობ ფეხბურთელების ბაზასთან.'
      : latestRequest
        ? '"' + club + '" ჯერ ' + requestStateLabel.toLowerCase() + ' სტატუსშია. დამტკიცების შემდეგ ის საჯაროდ გამოჩნდება გუნდების გვერდზე და club profile-ზე.'
        : 'აქედან აირჩევ არსებულ გუნდს ან გაგზავნი ახალ მოთხოვნას, რომ დამტკიცების შემდეგ გუნდი საჯაროდ გამოჩნდეს გუნდების გვერდზე.';
    $('heroChips').innerHTML = '<span class="chip red">გუნდის მენეჯერი</span> <span class="chip">' + esc(state.profile.roleTitle) + '</span> <span class="chip green">' + esc(state.profile.focus) + '</span>';
    $('heroStats').innerHTML = [['აქტიური გუნდი', club], ['ჩემი ფეხბურთელები', String(squad.length)], ['საჯარო მოთამაშეები', String(publicCount)], ['მოლოდინში მოთხოვნა', String(pending)]].map((x) => '<div class="stat"><strong>' + esc(x[1]) + '</strong><span>' + esc(x[0]) + '</span></div>').join('');

    $('clubSummary').innerHTML = [
      ['გუნდის სახელი', club],
      ['მდებარეობა', city],
        ['საჯარო სტატუსი', activeClub ? 'საჯარო ბაზაში ჩანს' : requestStateLabel],
        ['გუნდის გვერდი', activeClub?.route ? '<a style="color:#b91c1c" href="' + esc(activeClub.route) + '">გახსენი გუნდის გვერდი</a>' : 'ჯერ არ არის ხელმისაწვდომი', true]
    ].map((x) => '<div class="tile"><span class="k">' + esc(x[0]) + '</span><div class="v">' + (x[2] ? x[1] : esc(x[1])) + '</div></div>').join('');

    $('tabs').innerHTML = SECTIONS.map((x) => '<button class="tab ' + (state.section === x[0] ? 'active' : '') + '" data-sec="' + x[0] + '">' + x[1] + '</button>').join('');
    document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === 'section-' + state.section));

    $('overviewGrid').innerHTML = [
      ['აქტიური გუნდი', club, 'აირჩიე არსებული გუნდი ან მოითხოვე ახალი.'],
      ['ლოგო და ბრენდი', state.profile.clubLogo ? 'ლოგო მზად არის' : 'ლოგო ჯერ არ არის შერჩეული', 'ატვირთვით ან ბმულით ცვლი ვიზუალს.'],
      ['რჩეულები', String(state.profile.favorites.length), 'ყველაზე საინტერესო ფეხბურთელები.'],
      ['დასაკვირვებელი', String(state.profile.watchlist.length), 'ჯერ დაკვირვების ეტაპზე მყოფი მოთამაშეები.'],
      ['ჩანაწერები', String(state.profile.notes.length), 'შიდა შენიშვნები და აზრები.'],
      ['რეკრუტინგი', 'აგენტის მოდულიდან გადმოტანილი', 'სერჩი, რჩეულები, დასაკვირვებელი და roster actions.']
    ].map((x) => '<div class="tile"><span class="k">' + esc(x[0]) + '</span><div class="v">' + esc(x[1]) + '</div><div class="copy" style="margin-top:8px">' + esc(x[2]) + '</div></div>').join('');

    $('clubOptions').innerHTML = state.clubs.map((c) => '<option value="' + esc(c.name + (c.city ? ' · ' + c.city : '')) + '"></option>').join('');
    $('clubSelect').value = activeClub ? (activeClub.name + (activeClub.city ? ' · ' + activeClub.city : '')) : '';
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

    $('rosterList').innerHTML = squad.length ? squad.map(playerCard).join('') : '<div class="empty">Roster ჯერ ცარიელია.</div>';

    const filtered = state.players.filter((p) =>
      (state.age === 'all' || norm(p.ageGroup) === state.age) &&
      (state.position === 'all' || norm(p.positionKey || p.position) === state.position) &&
      (!state.search || [p.fullName, p.team, p.positionLabel, p.position, p.ageLabel, p.ageGroup].join(' ').toLowerCase().includes(norm(state.search)))
    );
    $('databaseList').innerHTML = filtered.length ? filtered.slice(0, 60).map(playerCard).join('') : '<div class="empty">ამ ფილტრებით მოთამაშე ვერ მოიძებნა.</div>';

    const collect = (list) => {
      const set = new Set(state.profile[list]);
      const arr = state.players.filter((p) => set.has(String(p.id)));
      return arr.length ? arr.map(playerCard).join('') : '<div class="empty">სია ჯერ ცარიელია.</div>';
    };
    $('favoritesList').innerHTML = collect('favorites');
    $('watchList').innerHTML = collect('watchlist');
    $('noteList').innerHTML = state.profile.notes.length ? state.profile.notes.map((n) => '<article class="note"><strong>' + esc(n.text || '') + '</strong><span>' + esc(fmt(n.createdAt)) + '</span></article>').join('') : '<div class="empty">ჩანაწერები ჯერ არ გაქვს დამატებული.</div>';
    $('requestList').innerHTML = state.requests.length ? state.requests.map((r) => {
      const route = r.public_club_slug ? (window.siteData?.buildTeamHref ? window.siteData.buildTeamHref(r.public_club_slug) : 'team-dinamo-tbilisi.html?club=' + encodeURIComponent(r.public_club_slug)) : '';
      return '<article class="request"><div class="panel-top" style="margin-bottom:10px"><div><strong>' + esc(r.club_name) + '</strong><div class="muted" style="font-size:.84rem;line-height:1.6">გამომგზავნი: ' + esc(r.requester_name || 'უცნობი') + ' · ' + esc(r.requester_role || 'მომხმარებელი') + '<br>' + esc(r.city || 'ქალაქი უცნობია') + '<br>ტელეფონი: ' + esc(r.phone || 'არ არის მითითებული') + '<br>გაგზავნილია: ' + esc(fmt(r.created_at)) + '</div></div><span class="chip ' + (r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : '') + '">' + esc(r.status === 'approved' ? 'დადასტურებული' : r.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში') + '</span></div>' + (r.admin_note ? '<div class="copy">ადმინის შენიშვნა: ' + esc(r.admin_note) + '</div>' : '') + (route ? '<div class="copy" style="margin-top:8px"><a style="color:#b91c1c;font-weight:800" href="' + esc(route) + '">გუნდი public-ად გახსნილია</a></div>' : '') + '</article>';
    }).join('') : '<div class="empty">შენგან გაგზავნილი გუნდის მოთხოვნები ჯერ არ არის.</div>';
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('ლოგოს წაკითხვა ვერ მოხერხდა.'));
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
      first,
      last,
      phone,
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

  async function toggleList(listKey, playerId) {
    const cur = uniq(state.profile[listKey]);
    const has = cur.includes(String(playerId));
    const next = has ? cur.filter((x) => x !== String(playerId)) : cur.concat(String(playerId));
    const patch = {};
    patch[listKey === 'favorites' ? 'managerFavorites' : 'managerWatchlist'] = next;
    const ok = await savePatch(patch, 'databaseStatus', has ? 'სია განახლდა.' : 'მოთამაშე სიაში დაემატა.');
    if (ok) render();
  }

  async function toggleRoster(playerId) {
    const cur = uniq(state.profile.roster);
    const has = cur.includes(String(playerId));
    const next = has ? cur.filter((x) => x !== String(playerId)) : cur.concat(String(playerId));
    const ok = await savePatch({ managerRoster: next }, 'databaseStatus', has ? 'მოთამაშე roster-იდან მოიხსნა.' : 'მოთამაშე roster-ში დაემატა.');
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

  async function sendRequest() {
    setStatus('requestStatus', 'მოთხოვნა იგზავნება...', 'info');
    const club_name = $('requestClubName').value.trim();
    const city = $('requestCity').value.trim();
    const phone = $('requestPhone').value.trim();
    const duplicatePending = (state.requests || []).some((item) => item.status === 'pending' && norm(item.club_name) === norm(club_name) && norm(item.city) === norm(city));
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
        club_name,
        city,
        phone,
        public_club_slug: slugify(club_name + ' ' + city)
      });
      if (r.error) throw r.error;
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
    });

    $('clubForm').addEventListener('submit', submitProfile);
    $('playerSearch').addEventListener('input', (e) => { state.search = e.target.value || ''; render(); });
    $('ageFilter').addEventListener('change', (e) => { state.age = e.target.value || 'all'; render(); });
    $('positionFilter').addEventListener('change', (e) => { state.position = e.target.value || 'all'; render(); });
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
    $('clearLogo').addEventListener('click', () => { $('logoUrl').value = ''; $('logoFile').value = ''; paintLogo('', $('clubName').value.trim()); });
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
  }

  async function init() {
    fill('managerRole', ROLES);
    fill('managerFocus', FOCUS);
    fill('ageFilter', AGES, (v) => v === 'all' ? 'ყველა ასაკი' : v === 'pro' ? 'პროფესიონალები' : v.toUpperCase());
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
    bind();
    render();
    $('loading').hidden = true;
    $('app').hidden = false;
  }

  init().catch((e) => {
    $('loading').innerHTML = '<div class="loading-card"><h1>დაფა ვერ ჩაიტვირთა</h1><p>' + esc(e?.message || 'სცადე გვერდის თავიდან გახსნა.') + '</p></div>';
  });
})();
