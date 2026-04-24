(function () {
  const state = {
    client: null,
    user: null,
    requests: [],
    clubs: [],
    players: [],
    users: [],
    monthlySnapshot: null
  };

  const LINEUP_SLOTS = ['gk', 'rb', 'rcb', 'lcb', 'lb', 'rcm', 'cm', 'lcm', 'rw', 'st', 'lw'];

  const PLAYER_FIELDS = [
    window.sitePlayerDomain?.DIRECTORY_FIELDS || [
      'id',
      'owner_role',
      'full_name',
      'avatar_path',
      'current_age',
      'age_group',
      'primary_position',
      'position_label',
      'preferred_foot',
      'club_name',
      'club_slug',
      'club_route',
      'club_status',
      'visibility_public',
      'is_active',
      'updated_at'
    ].join(', ')
  ][0];

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u10d0-\u10ff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function buildShortCode(name, fallback) {
    const source = String(name || fallback || 'FG');
    const parts = source.split(/\s+/).filter(Boolean);
    const letters = (parts.map((item) => item.charAt(0)).join('') || source.replace(/\s+/g, '').slice(0, 3) || 'FG')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5);
    return letters || 'FG';
  }

  function formatDate(value) {
    if (!value) return 'ახლახან';
    try {
      return new Intl.DateTimeFormat('ka-GE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function roleLabel(role) {
    return ({
      player: 'მოთამაშე',
      parent: 'მშობელი',
      agent: 'აგენტი',
      academy: 'გუნდის მენეჯერი',
      admin: 'ადმინი'
    })[String(role || '').trim().toLowerCase()] || 'მომხმარებელი';
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) {
      node.textContent = value;
    }
  }

  function setRequestState(message, isError) {
    const node = byId('clubRequestState');
    if (!node) return;
    node.hidden = false;
    node.textContent = message;
    node.className = 'state-box' + (isError ? ' error' : '');
  }

  function setClubState(message, isError) {
    const node = byId('clubSaveState');
    if (!node) return;
    node.textContent = message;
    node.className = 'state-box' + (isError ? ' error' : '');
  }

  function setMonthlyState(message, isError) {
    const node = byId('monthlyState');
    if (!node) return;
    node.textContent = message;
    node.className = 'state-box' + (isError ? ' error' : '');
  }

  async function readFileAsDataUrl(file) {
    return await new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('ფაილის წაკითხვა ვერ მოხერხდა.')); };
      reader.readAsDataURL(file);
    });
  }

  function getClubRoute(slug) {
    if (!slug) return '';
    if (slug === 'dinamo-tbilisi') {
      return 'team-dinamo-tbilisi.html';
    }
    return 'team-dinamo-tbilisi.html?club=' + encodeURIComponent(slug);
  }

  function getClubFormValues() {
    const id = String(byId('clubIdInput')?.value || '').trim();
    const name = String(byId('clubNameInput')?.value || '').trim();
    const city = String(byId('clubCityInput')?.value || '').trim();
    const shortCode = String(byId('clubShortCodeInput')?.value || '').trim();
    const ageBand = String(byId('clubAgeBandInput')?.value || '').trim() || 'U8-PRO';
    const coachName = String(byId('clubCoachInput')?.value || '').trim() || 'ადმინის მიერ დამატებული გუნდი';
    const summary = String(byId('clubSummaryInput')?.value || '').trim() || 'ადმინის მიერ განახლებული საჯარო კლუბი.';
    const logoPath = String(byId('clubLogoInput')?.value || '').trim();
    const isPublic = String(byId('clubPublicInput')?.value || 'true') === 'true';
    const isActive = String(byId('clubActiveInput')?.value || 'true') === 'true';
    const slug = slugify(name + ' ' + city) || slugify(name) || '';

    return {
      id,
      slug,
      shortCode: shortCode || buildShortCode(name, city),
      name,
      city,
      ageBand,
      coachName,
      summary,
      logoPath,
      isPublic,
      isActive
    };
  }

  function fillClubForm(club) {
    byId('clubIdInput').value = club?.id || '';
    byId('clubNameInput').value = club?.name || '';
    byId('clubCityInput').value = club?.city || '';
    byId('clubShortCodeInput').value = club?.short_code || '';
    byId('clubAgeBandInput').value = club?.age_band || 'U8-PRO';
    byId('clubCoachInput').value = club?.coach_name || '';
    byId('clubSummaryInput').value = club?.summary || '';
    byId('clubLogoInput').value = club?.logo_path || '';
    byId('clubPublicInput').value = String(Boolean(club?.is_public));
    byId('clubActiveInput').value = String(Boolean(club?.is_active));
    updateLogoPreview(club?.logo_path || '');
  }

  function resetClubForm() {
    fillClubForm(null);
    byId('clubPublicInput').value = 'true';
    byId('clubActiveInput').value = 'true';
    setClubState('აქედან შეგიძლია კლუბის შექმნა, რედაქტირება და ლოგოს ატვირთვა.', false);
  }

  function updateLogoPreview(path) {
    const preview = byId('clubLogoPreview');
    if (!preview) return;
    if (path) {
      preview.style.backgroundImage = 'url("' + String(path).replace(/"/g, '\\"') + '")';
      preview.textContent = '';
    } else {
      preview.style.backgroundImage = '';
      preview.textContent = 'ლოგო';
    }
  }

  async function loadOverviewStats() {
    const [playersRes, usersRes, clubsRes, pendingRes] = await Promise.all([
      state.client.from('player_registry').select('id', { count: 'exact', head: true }).eq('visibility_public', true).eq('is_active', true),
      state.client.from('profiles').select('id', { count: 'exact', head: true }),
      state.client.from('clubs').select('id', { count: 'exact', head: true }).eq('is_public', true).eq('is_active', true),
      state.client.from('club_submission_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    setText('adminPlayersCount', String(playersRes.count || 0));
    setText('adminUsersCount', String(usersRes.count || 0));
    setText('adminClubsCount', String(clubsRes.count || 0));
    setText('adminPendingRequests', String(pendingRes.count || 0));
  }

  async function loadRequests() {
    setRequestState('მოთხოვნები იტვირთება...', false);
    const { data, error } = await state.client
      .from('club_submission_requests')
      .select('id, club_name, city, phone, status, requester_email, requester_name, requester_role, created_at, admin_note, public_club_slug')
      .order('created_at', { ascending: false });

    if (error) {
      setRequestState('მოთხოვნების წამოღება ვერ მოხერხდა.', true);
      return;
    }

    state.requests = Array.isArray(data) ? data : [];
    renderRequests();
  }

  function renderRequests() {
    const list = byId('clubRequestList');
    const chip = byId('clubRequestCountChip');
    if (!list) return;

    const pendingCount = state.requests.filter((row) => row.status === 'pending').length;
    if (chip) {
      chip.textContent = pendingCount ? `${pendingCount} მოლოდინში` : 'ცარიელია';
    }

    if (!state.requests.length) {
      list.hidden = true;
      setRequestState('ჯერ არცერთი მოთხოვნა არ არის.', false);
      return;
    }

    list.hidden = false;
    byId('clubRequestState').hidden = true;
    list.innerHTML = state.requests.map((row) => {
      const publicLink = row.public_club_slug
        ? `<a href="../${getClubRoute(row.public_club_slug)}">საჯარო ბმა: ${escapeHtml(row.public_club_slug)}</a>`
        : '';
      return `
        <article class="request-card" data-request-id="${row.id}">
          <div class="request-top">
            <div>
              <h4>${escapeHtml(row.club_name || 'ახალი გუნდი')}</h4>
              <div class="meta">
                <span>${escapeHtml(row.city || 'ქალაქი არ არის მითითებული')}</span>
                <span>${escapeHtml(row.status || 'pending')}</span>
              </div>
            </div>
            <span class="chip">${escapeHtml(row.status === 'approved' ? 'დადასტურებული' : row.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში')}</span>
          </div>
          <div class="meta">
            <span>გამომგზავნი: ${escapeHtml(row.requester_name || 'უცნობია')}</span>
            <span>როლი: ${escapeHtml(roleLabel(row.requester_role))}</span>
            <span>ელფოსტა: ${escapeHtml(row.requester_email || 'უცნობია')}</span>
            <span>ტელეფონი: ${escapeHtml(row.phone || 'არ არის მითითებული')}</span>
            <span>თარიღი: ${escapeHtml(formatDate(row.created_at))}</span>
            ${publicLink}
          </div>
          <div class="request-actions">
            <button class="btn btn-red" type="button" data-request-action="approved" ${row.status === 'approved' ? 'disabled' : ''}>დადასტურება</button>
            <button class="btn btn-white" type="button" data-request-action="rejected" ${row.status === 'rejected' ? 'disabled' : ''}>უარყოფა</button>
            <button class="btn btn-soft" type="button" data-request-action="prefill">ფორმაში ჩასმა</button>
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-request-action]').forEach((button) => {
      button.addEventListener('click', async function () {
        const action = button.getAttribute('data-request-action');
        const card = button.closest('[data-request-id]');
        const row = state.requests.find((item) => String(item.id) === String(card?.getAttribute('data-request-id')));
        if (!row) return;

        if (action === 'prefill') {
          fillClubForm({
            name: row.club_name,
            city: row.city,
            summary: 'მოთხოვნიდან შევსებული კლუბი.',
            coach_name: 'ადმინის მიერ დასადასტურებელი გუნდი',
            age_band: 'U8-PRO',
            is_public: true,
            is_active: true
          });
          setClubState('მოთხოვნის მონაცემები ფორმაში ჩაისვა. შეგიძლია შეცვალო და შეინახო.', false);
          byId('clubsPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        await updateRequestStatus(row, action, button);
      });
    });
  }

  async function approveClubRequest(row) {
    const slug = row.public_club_slug || slugify((row.club_name || '') + ' ' + (row.city || '')) || slugify(row.club_name || 'club');
    const shortCode = buildShortCode(row.club_name, row.city);

    const { error: clubError } = await state.client
      .from('clubs')
      .upsert({
        slug,
        short_code: shortCode,
        name: row.club_name,
        city: row.city,
        country: 'Georgia',
        age_band: 'U8-PRO',
        coach_name: 'ადმინის მიერ დადასტურებული გუნდი',
        players_count: 0,
        summary: 'ადმინის მიერ დადასტურებული საჯარო კლუბი.',
        logo_path: '',
        is_public: true,
        is_active: true
      }, { onConflict: 'slug' });

    if (clubError) throw clubError;

    const { error: requestError } = await state.client
      .from('club_submission_requests')
      .update({
        status: 'approved',
        public_club_slug: slug,
        approved_at: new Date().toISOString(),
        approved_by: state.user.id
      })
      .eq('id', row.id);

    if (requestError) throw requestError;
  }

  async function updateRequestStatus(row, action, button) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'მუშავდება...';

    let error = null;
    try {
      if (action === 'approved') {
        await approveClubRequest(row);
      } else {
        const result = await state.client
          .from('club_submission_requests')
          .update({ status: 'rejected' })
          .eq('id', row.id);
        error = result.error || null;
      }
    } catch (err) {
      error = err;
    }

    button.disabled = false;
    button.textContent = original;

    if (error) {
      setRequestState('სტატუსის შეცვლა ვერ შესრულდა.', true);
      return;
    }

    await Promise.all([loadRequests(), loadOverviewStats(), loadClubs()]);
  }

  async function loadClubs() {
    const { data, error } = await state.client
      .from('clubs')
      .select('id, slug, short_code, name, city, country, age_band, coach_name, players_count, logo_path, summary, is_public, is_active')
      .order('name', { ascending: true });

    if (error) {
      setClubState('კლუბების წამოღება ვერ მოხერხდა.', true);
      return;
    }

    state.clubs = Array.isArray(data) ? data : [];
    renderClubs();
  }

  function renderClubs() {
    const list = byId('clubList');
    if (!list) return;

    const query = normalize(byId('clubSearchInput')?.value);
    const clubs = state.clubs.filter((club) => {
      if (!query) return true;
      return [club.name, club.city, club.short_code].some((value) => normalize(value).includes(query));
    });

    if (!clubs.length) {
      list.innerHTML = '<div class="state-box">შესაბამისი კლუბი ვერ მოიძებნა.</div>';
      return;
    }

    list.innerHTML = clubs.map((club) => `
      <article class="club-card" data-club-id="${club.id}">
        <div class="club-top">
          <div>
            <h4>${escapeHtml(club.name || 'უსახელო გუნდი')}</h4>
            <div class="meta">
              <span>${escapeHtml(club.city || 'ქალაქი არ არის მითითებული')}</span>
              <span>${escapeHtml(club.short_code || '---')}</span>
              <span>${escapeHtml(club.age_band || 'U8-PRO')}</span>
              <span>${club.is_public ? 'საჯარო' : 'დამალული'}</span>
              <span>${club.is_active ? 'აქტიური' : 'არააქტიური'}</span>
            </div>
          </div>
          <div class="club-logo-preview" style="${club.logo_path ? `background-image:url('${String(club.logo_path).replace(/'/g, "\\'")}');` : ''}">${club.logo_path ? '' : 'ლოგო'}</div>
        </div>
        <div class="meta">
          <span>მოთამაშეები: ${escapeHtml(String(club.players_count || 0))}</span>
          <span>მწვრთნელი: ${escapeHtml(club.coach_name || 'არ არის მითითებული')}</span>
          <span>Slug: ${escapeHtml(club.slug || '')}</span>
        </div>
        <div class="club-actions">
          <button class="btn btn-soft" type="button" data-club-action="edit">რედაქტირება</button>
          <button class="btn btn-white" type="button" data-club-action="toggle-public">${club.is_public ? 'დამალვა' : 'გაჯაროება'}</button>
          <button class="btn btn-white" type="button" data-club-action="toggle-active">${club.is_active ? 'გამორთვა' : 'გააქტიურება'}</button>
          <a class="btn btn-red" href="../${getClubRoute(club.slug)}">გუნდის გვერდი</a>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-club-action]').forEach((button) => {
      button.addEventListener('click', async function () {
        const card = button.closest('[data-club-id]');
        const club = state.clubs.find((item) => String(item.id) === String(card?.getAttribute('data-club-id')));
        if (!club) return;
        const action = button.getAttribute('data-club-action');
        if (action === 'edit') {
          fillClubForm(club);
          setClubState('კლუბი ჩაიტვირთა რედაქტირებისთვის.', false);
          return;
        }
        if (action === 'toggle-public') {
          await updateClub(club.id, { is_public: !club.is_public }, button, club.is_public ? 'კლუბი დამალულია.' : 'კლუბი გასაჯაროვდა.');
        }
        if (action === 'toggle-active') {
          await updateClub(club.id, { is_active: !club.is_active }, button, club.is_active ? 'კლუბი არააქტიურია.' : 'კლუბი გააქტიურდა.');
        }
      });
    });
  }

  async function updateClub(clubId, patch, button, successMessage) {
    const original = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'მუშავდება...';
    }

    const { error } = await state.client
      .from('clubs')
      .update(patch)
      .eq('id', clubId);

    if (button) {
      button.disabled = false;
      button.textContent = original;
    }

    if (error) {
      setClubState('კლუბის განახლება ვერ მოხერხდა.', true);
      return;
    }

    setClubState(successMessage, false);
    await Promise.all([loadClubs(), loadOverviewStats()]);
  }

  async function saveClub(event) {
    event.preventDefault();
    const payload = getClubFormValues();

    if (!payload.name || !payload.city) {
      setClubState('გუნდის სახელი და ქალაქი სავალდებულოა.', true);
      return;
    }

    const body = {
      slug: payload.slug,
      short_code: payload.shortCode,
      name: payload.name,
      city: payload.city,
      country: 'Georgia',
      age_band: payload.ageBand,
      coach_name: payload.coachName,
      players_count: 0,
      logo_path: payload.logoPath,
      summary: payload.summary,
      is_public: payload.isPublic,
      is_active: payload.isActive
    };

    let query = state.client.from('clubs');
    let error = null;

    if (payload.id) {
      const result = await query.update(body).eq('id', payload.id);
      error = result.error || null;
    } else {
      const result = await query.insert(body);
      error = result.error || null;
    }

    if (error) {
      setClubState('კლუბის შენახვა ვერ მოხერხდა.', true);
      return;
    }

    setClubState(payload.id ? 'კლუბი განახლდა.' : 'ახალი კლუბი დაემატა.', false);
    resetClubForm();
    await Promise.all([loadClubs(), loadOverviewStats()]);
  }

  async function loadPlayers() {
    const { data, error } = await state.client
      .from('player_registry')
      .select(PLAYER_FIELDS)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      byId('playerList').innerHTML = '<div class="state-box error">ფეხბურთელების წამოღება ვერ მოხერხდა.</div>';
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows.map((row) => row.id).filter(Boolean);
    const manualVotesMap = new Map();

    if (ids.length) {
      const { data: overrides } = await state.client
        .from('player_vote_manual_overrides')
        .select('player_id, manual_votes')
        .in('player_id', ids);

      if (Array.isArray(overrides)) {
        overrides.forEach(function (row) {
          manualVotesMap.set(String(row.player_id || ''), Number(row.manual_votes || 0) || 0);
        });
      }
    }

    state.players = rows.map(function (row) {
      return {
        ...row,
        manualVotes: manualVotesMap.get(String(row.id || '')) || 0
      };
    });
    renderPlayers();
  }

  function renderPlayers() {
    const list = byId('playerList');
    const query = normalize(byId('playerSearchInput')?.value);
    const players = state.players.filter((player) => {
      if (!query) return true;
      return [
        player.full_name,
        player.club_name,
        player.position_label,
        player.primary_position,
        player.age_group
      ].some((value) => normalize(value).includes(query));
    });

    if (!players.length) {
      list.innerHTML = '<div class="state-box">ფეხბურთელი ვერ მოიძებნა.</div>';
      return;
    }

    const clubOptions = ['<option value="">უგუნდოდ</option>'].concat(
      state.clubs.map((club) => `<option value="${escapeHtml(club.slug)}">${escapeHtml(club.name)}</option>`)
    ).join('');

    list.innerHTML = players.map((player) => `
      <article class="player-card" data-player-id="${player.id}">
        <div class="player-top">
          <div>
            <h4>${escapeHtml(player.full_name || 'უსახელო მოთამაშე')}</h4>
            <div class="meta">
              <span>${escapeHtml(player.position_label || player.primary_position || 'პოზიცია არ არის')}</span>
              <span>${escapeHtml(player.age_group || 'PRO')}</span>
              <span>${escapeHtml(player.club_name || 'უგუნდოდ')}</span>
              <span>${escapeHtml(roleLabel(player.owner_role))}</span>
            </div>
          </div>
          <span class="chip">${player.visibility_public ? 'საჯარო' : 'დამალული'}</span>
        </div>
        <div class="player-actions">
          <button class="btn btn-white" type="button" data-player-action="toggle-public">${player.visibility_public ? 'დამალვა' : 'გაჯაროება'}</button>
          <button class="btn btn-white" type="button" data-player-action="toggle-active">${player.is_active ? 'გამორთვა' : 'გააქტიურება'}</button>
          <select class="inline-select" data-player-club>
            ${clubOptions}
          </select>
          <input class="inline-select" type="number" min="0" step="1" value="${escapeHtml(String(player.manualVotes || 0))}" data-player-manual-votes>
          <button class="btn btn-soft" type="button" data-player-action="save-votes">ხმების შენახვა</button>
          <button class="btn btn-soft" type="button" data-player-action="save-club">გუნდის შენახვა</button>
          <a class="btn btn-red" href="../player-profile.html?player=${encodeURIComponent(player.id)}">პროფილი</a>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-player-id]').forEach((card) => {
      const player = players.find((item) => String(item.id) === String(card.getAttribute('data-player-id')));
      const select = card.querySelector('[data-player-club]');
      if (select) {
        select.value = player?.club_slug || '';
      }
    });

    list.querySelectorAll('[data-player-action]').forEach((button) => {
      button.addEventListener('click', async function () {
        const card = button.closest('[data-player-id]');
        const player = state.players.find((item) => String(item.id) === String(card?.getAttribute('data-player-id')));
        if (!player) return;
        const action = button.getAttribute('data-player-action');
        if (action === 'toggle-public') {
          await updatePlayer(player.id, { visibility_public: !player.visibility_public }, button);
        } else if (action === 'toggle-active') {
          await updatePlayer(player.id, { is_active: !player.is_active }, button);
        } else if (action === 'save-votes') {
          const input = card.querySelector('[data-player-manual-votes]');
          await saveManualVotes(player.id, input?.value, button);
        } else if (action === 'save-club') {
          const select = card.querySelector('[data-player-club]');
          const slug = String(select?.value || '').trim();
          const club = state.clubs.find((item) => item.slug === slug) || null;
          await updatePlayer(player.id, {
            club_name: club ? club.name : '',
            club_slug: club ? club.slug : '',
            club_route: club ? getClubRoute(club.slug) : '',
            club_status: club ? 'registered' : 'free-agent'
          }, button);
        }
      });
    });
  }

  async function updatePlayer(playerId, patch, button) {
    const original = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'მუშავდება...';
    }

    const { error } = await state.client
      .from('player_registry')
      .update(patch)
      .eq('id', playerId);

    if (button) {
      button.disabled = false;
      button.textContent = original;
    }

    if (error) {
      byId('playerList').insertAdjacentHTML('afterbegin', '<div class="state-box error">ფეხბურთელის განახლება ვერ შესრულდა.</div>');
      return;
    }

    await Promise.all([loadPlayers(), loadOverviewStats()]);
  }

  async function saveManualVotes(playerId, rawValue, button) {
    const original = button?.textContent || '';
    const manualVotes = Math.max(0, parseInt(rawValue, 10) || 0);

    if (button) {
      button.disabled = true;
      button.textContent = 'ინახება...';
    }

    const { error } = await state.client
      .from('player_vote_manual_overrides')
      .upsert({
        player_id: playerId,
        manual_votes: manualVotes,
        updated_by: state.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'player_id' });

    if (button) {
      button.disabled = false;
      button.textContent = original;
    }

    if (error) {
      byId('playerList').insertAdjacentHTML('afterbegin', '<div class="state-box error">ხმების შენახვა ვერ მოხერხდა.</div>');
      return;
    }

    await Promise.all([loadPlayers(), loadOverviewStats(), loadMonthlySnapshot()]);
  }

  async function loadUsers() {
    const { data, error } = await state.client
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      byId('userList').innerHTML = '<div class="state-box error">მომხმარებლების წამოღება ვერ მოხერხდა.</div>';
      return;
    }

    state.users = Array.isArray(data) ? data : [];
    renderUsers();
  }

  function renderUsers() {
    const list = byId('userList');
    const query = normalize(byId('userSearchInput')?.value);
    const users = state.users.filter((user) => {
      if (!query) return true;
      return [user.email, user.role].some((value) => normalize(value).includes(query));
    });

    if (!users.length) {
      list.innerHTML = '<div class="state-box">მომხმარებელი ვერ მოიძებნა.</div>';
      return;
    }

    list.innerHTML = users.map((user) => `
      <article class="user-card" data-user-id="${user.id}">
        <div class="user-top">
          <div>
            <h4>${escapeHtml(user.email || 'უცნობი ელფოსტა')}</h4>
            <div class="meta">
              <span>${escapeHtml(roleLabel(user.role))}</span>
              <span>${escapeHtml(formatDate(user.created_at))}</span>
            </div>
          </div>
        </div>
        <div class="user-actions">
          <select class="inline-select" data-user-role>
            <option value="player">მოთამაშე</option>
            <option value="parent">მშობელი</option>
            <option value="agent">აგენტი</option>
            <option value="academy">გუნდის მენეჯერი</option>
            <option value="admin">ადმინი</option>
          </select>
          <button class="btn btn-red" type="button" data-user-save>როლის შენახვა</button>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-user-id]').forEach((card) => {
      const user = users.find((item) => String(item.id) === String(card.getAttribute('data-user-id')));
      const select = card.querySelector('[data-user-role]');
      if (select) {
        select.value = user?.role || 'player';
      }
    });

    list.querySelectorAll('[data-user-save]').forEach((button) => {
      button.addEventListener('click', async function () {
        const card = button.closest('[data-user-id]');
        const userId = card?.getAttribute('data-user-id');
        const select = card?.querySelector('[data-user-role]');
        const role = String(select?.value || 'player');
        await updateUserRole(userId, role, button);
      });
    });
  }

  function getMonthlyPlayerOptions(selectedId) {
    const options = ['<option value="">აირჩიე მოთამაშე</option>'].concat(
      state.players.map(function (player) {
        const effectiveVotes = (Number(player.votes_count || 0) || 0) + (Number(player.manualVotes || 0) || 0);
        return `<option value="${escapeHtml(player.id)}" ${String(selectedId || '') === String(player.id || '') ? 'selected' : ''}>${escapeHtml(player.full_name || 'უსახელო მოთამაშე')} • ${escapeHtml(player.position_label || player.primary_position || 'პოზიცია')} • ${effectiveVotes} ხმა</option>`;
      })
    );
    return options.join('');
  }

  function populateLineupSelectors(selectedLineup) {
    const selectedMap = new Map(
      (Array.isArray(selectedLineup) ? selectedLineup : []).map(function (entry) {
        return [String(entry.slot || ''), String(entry.player_id || '')];
      })
    );

    LINEUP_SLOTS.forEach(function (slot) {
      const select = byId('lineup-' + slot);
      if (!select) return;
      select.innerHTML = getMonthlyPlayerOptions(selectedMap.get(slot));
    });
  }

  async function loadMonthlySnapshot() {
    if (!window.siteData?.fetchCurrentMonthlySnapshot) {
      setMonthlyState('თვის შედეგების მოდული ვერ ჩაიტვირთა.', true);
      return;
    }

    const publicPlayers = await window.siteData.fetchPublicPlayers(state.client);
    const snapshot = await window.siteData.fetchCurrentMonthlySnapshot(state.client, publicPlayers);
    state.monthlySnapshot = snapshot;

    if (!snapshot) {
      setMonthlyState('თვის შედეგების წამოღება ვერ მოხერხდა.', true);
      return;
    }

    byId('monthlyCycleInput').value = `${snapshot.cycleStart} — ${snapshot.cycleEnd}`;
    byId('monthlyFeaturedVotesInput').value = String(snapshot.featuredVotes || 0);
    const featuredSelect = byId('monthlyFeaturedPlayerSelect');
    if (featuredSelect) {
      featuredSelect.innerHTML = getMonthlyPlayerOptions(snapshot.featuredPlayer?.id || '');
    }
    populateLineupSelectors(
      (snapshot.lineup || []).map(function (entry) {
        return { slot: entry.slot, player_id: entry.player?.id || '' };
      })
    );
    setMonthlyState('აქედან შეგიძლია ხელით გადაწყვიტო თვის ფეხბურთელი და სიმბოლური 11-ეული.', false);
  }

  async function saveMonthlyFeaturedPlayer(resetToAuto) {
    if (!state.monthlySnapshot?.cycleKey) {
      setMonthlyState('თვის ციკლი ჯერ არ ჩატვირთულა.', true);
      return;
    }

    const playerId = resetToAuto ? null : String(byId('monthlyFeaturedPlayerSelect')?.value || '').trim();

    const { error } = await state.client
      .from('monthly_featured_snapshots')
      .update({
        manual_featured_player_id: playerId || null,
        updated_by: state.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('cycle_key', state.monthlySnapshot.cycleKey);

    if (error) {
      setMonthlyState('თვის ფეხბურთელის შენახვა ვერ მოხერხდა.', true);
      return;
    }

    setMonthlyState(resetToAuto ? 'თვის ფეხბურთელი ავტომატურ არჩევანზე დაბრუნდა.' : 'თვის ფეხბურთელი განახლდა.', false);
    await loadMonthlySnapshot();
  }

  async function saveMonthlyLineup(resetToAuto) {
    if (!state.monthlySnapshot?.cycleKey) {
      setMonthlyState('თვის ციკლი ჯერ არ ჩატვირთულა.', true);
      return;
    }

    const manualLineup = resetToAuto ? null : LINEUP_SLOTS.map(function (slot) {
      return {
        slot: slot,
        player_id: String(byId('lineup-' + slot)?.value || '').trim()
      };
    }).filter(function (entry) {
      return Boolean(entry.player_id);
    });

    const { error } = await state.client
      .from('monthly_featured_snapshots')
      .update({
        manual_lineup: manualLineup,
        updated_by: state.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('cycle_key', state.monthlySnapshot.cycleKey);

    if (error) {
      setMonthlyState('სიმბოლური 11-ეულის შენახვა ვერ მოხერხდა.', true);
      return;
    }

    setMonthlyState(resetToAuto ? 'სიმბოლური 11-ეული ავტომატურ რეჟიმზე დაბრუნდა.' : 'სიმბოლური 11-ეული განახლდა.', false);
    await loadMonthlySnapshot();
  }

  async function updateUserRole(userId, role, button) {
    const original = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'მუშავდება...';
    }

    const { error } = await state.client
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (button) {
      button.disabled = false;
      button.textContent = original;
    }

    if (error) {
      byId('userList').insertAdjacentHTML('afterbegin', '<div class="state-box error">როლის შეცვლა ვერ შესრულდა.</div>');
      return;
    }

    await Promise.all([loadUsers(), loadOverviewStats()]);
  }

  function bindEvents() {
    document.querySelectorAll('[data-scroll-target]').forEach((button) => {
      button.addEventListener('click', function () {
        byId(button.getAttribute('data-scroll-target'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    byId('clubForm')?.addEventListener('submit', saveClub);
    byId('clubFormReset')?.addEventListener('click', resetClubForm);
    byId('clubCancelEdit')?.addEventListener('click', resetClubForm);
    byId('reloadClubsButton')?.addEventListener('click', loadClubs);
    byId('reloadPlayersButton')?.addEventListener('click', loadPlayers);
    byId('reloadUsersButton')?.addEventListener('click', loadUsers);
    byId('reloadMonthlyButton')?.addEventListener('click', loadMonthlySnapshot);

    byId('clubSearchInput')?.addEventListener('input', renderClubs);
    byId('playerSearchInput')?.addEventListener('input', renderPlayers);
    byId('userSearchInput')?.addEventListener('input', renderUsers);

    byId('clubSearchClear')?.addEventListener('click', function () {
      byId('clubSearchInput').value = '';
      renderClubs();
    });
    byId('playerSearchClear')?.addEventListener('click', function () {
      byId('playerSearchInput').value = '';
      renderPlayers();
    });
    byId('userSearchClear')?.addEventListener('click', function () {
      byId('userSearchInput').value = '';
      renderUsers();
    });

    byId('clubLogoInput')?.addEventListener('input', function () {
      updateLogoPreview(byId('clubLogoInput').value);
    });

    byId('clubLogoFile')?.addEventListener('change', async function (event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        byId('clubLogoInput').value = dataUrl;
        updateLogoPreview(dataUrl);
        setClubState('ლოგო ჩაიტვირთა. ახლა შენახვაც დააჭირე.', false);
      } catch (error) {
        setClubState(error.message || 'ლოგოს წაკითხვა ვერ მოხერხდა.', true);
      }
      event.target.value = '';
    });

    byId('clubLogoClear')?.addEventListener('click', function () {
      byId('clubLogoInput').value = '';
      updateLogoPreview('');
    });

    byId('saveFeaturedPlayerButton')?.addEventListener('click', function () {
      saveMonthlyFeaturedPlayer(false);
    });
    byId('resetFeaturedPlayerButton')?.addEventListener('click', function () {
      saveMonthlyFeaturedPlayer(true);
    });
    byId('saveLineupButton')?.addEventListener('click', function () {
      saveMonthlyLineup(false);
    });
    byId('resetLineupButton')?.addEventListener('click', function () {
      saveMonthlyLineup(true);
    });
  }

  async function init() {
    const auth = window.siteAuth;
    if (!auth?.requireAuth) {
      alert('ავტორიზაციის მოდული ვერ ჩაიტვირთა.');
      return;
    }

    const authState = await auth.requireAuth('admin/');
    state.client = authState?.client || null;
    state.user = authState?.user || null;

    if (!state.client || !state.user) {
      return;
    }

    if ((auth.getUserRole ? auth.getUserRole(state.user) : '') !== 'admin') {
      alert('ამ გვერდზე წვდომა მხოლოდ ადმინისთვის არის ხელმისაწვდომი.');
      window.location.replace('../index.html');
      return;
    }

    bindEvents();
    resetClubForm();
    await Promise.all([
      loadOverviewStats(),
      loadRequests(),
      loadClubs(),
      loadPlayers(),
      loadUsers()
    ]);
    await loadMonthlySnapshot();
  }

  init();
})();
