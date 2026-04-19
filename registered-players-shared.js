(function () {
  const DIRECTORY_KEY = 'mfg-registered-player-directory-v1';

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ')
    };
  }

  function safeStorage(method, fallback) {
    try {
      return method();
    } catch (error) {
      return fallback;
    }
  }

  function getStoredCandidates() {
    return safeStorage(function () {
      const raw = localStorage.getItem(DIRECTORY_KEY);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }, []);
  }

  function saveStoredCandidates(candidates) {
    safeStorage(function () {
      localStorage.setItem(DIRECTORY_KEY, JSON.stringify(candidates));
      return true;
    }, false);
  }

  function georgianFootLabel(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return 'არ არის მითითებული';
    }

    if (normalized === 'left' || normalized.includes('მარცხ')) {
      return 'მარცხენა';
    }
    if (normalized === 'right' || normalized.includes('მარჯ')) {
      return 'მარჯვენა';
    }
    if (normalized === 'both' || normalized.includes('ორივე')) {
      return 'ორივე';
    }

    return String(value || '').trim();
  }

  function resolveAge(value, birthDate) {
    const ageFromBirthDate = window.siteAgeGroups?.calculateActualAgeFromBirthDate
      ? window.siteAgeGroups.calculateActualAgeFromBirthDate(birthDate)
      : null;

    if (Number.isFinite(ageFromBirthDate)) {
      return ageFromBirthDate;
    }

    const numericAge = Number(value);
    return Number.isFinite(numericAge) ? numericAge : null;
  }

  function resolveAgeGroup(value, birthDate, age) {
    const normalized = String(value || '').trim();
    if (normalized) {
      return normalized.toLowerCase();
    }

    if (birthDate && window.siteAgeGroups?.getAgeGroupKeyFromBirthDate) {
      return window.siteAgeGroups.getAgeGroupKeyFromBirthDate(birthDate).toLowerCase();
    }

    if (Number.isFinite(age) && window.siteAgeGroups?.getAgeGroupKeyByAge) {
      return window.siteAgeGroups.getAgeGroupKeyByAge(age).toLowerCase();
    }

    return 'pro';
  }

  function sanitizeCandidate(candidate) {
    if (!candidate || !String(candidate.fullName || '').trim()) {
      return null;
    }

    const fullName = String(candidate.fullName || '').trim();
    const names = splitName(fullName);
    const age = Number(candidate.age);
    const cleanAge = Number.isFinite(age) ? age : null;
    const ageCat = String(candidate.ageCat || 'pro').trim().toLowerCase() || 'pro';

    return {
      key: String(candidate.key || ('candidate:' + normalizeText(fullName))).trim(),
      userId: String(candidate.userId || '').trim(),
      roleSource: String(candidate.roleSource || 'player').trim(),
      fullName: fullName,
      firstName: names.firstName,
      lastName: names.lastName,
      age: cleanAge,
      ageCat: ageCat,
      ageLabel: ageCat.toUpperCase(),
      foot: georgianFootLabel(candidate.foot),
      position: String(candidate.position || '').trim(),
      positionLabel: String(candidate.positionLabel || candidate.position || 'არ არის მითითებული').trim(),
      team: String(candidate.team || 'უგუნდოდ').trim() || 'უგუნდოდ',
      photo: String(candidate.photo || '').trim(),
      source: String(candidate.source || 'local').trim(),
      registeredAt: String(candidate.registeredAt || new Date().toISOString()).trim()
    };
  }

  function mergeCandidateDetails(baseCandidate, incomingCandidate) {
    const base = sanitizeCandidate(baseCandidate);
    const incoming = sanitizeCandidate(incomingCandidate);
    if (!base) {
      return incoming;
    }
    if (!incoming) {
      return base;
    }

    return {
      ...base,
      ...incoming,
      fullName: incoming.fullName || base.fullName,
      firstName: incoming.firstName || base.firstName,
      lastName: incoming.lastName || base.lastName,
      age: Number.isFinite(incoming.age) ? incoming.age : base.age,
      ageCat: incoming.ageCat || base.ageCat,
      ageLabel: (incoming.ageCat || base.ageCat || 'pro').toUpperCase(),
      foot: incoming.foot && incoming.foot !== 'არ არის მითითებული' ? incoming.foot : base.foot,
      positionLabel: incoming.positionLabel && incoming.positionLabel !== 'არ არის მითითებული'
        ? incoming.positionLabel
        : base.positionLabel,
      team: incoming.team && incoming.team !== 'უგუნდოდ' ? incoming.team : base.team,
      photo: incoming.photo || base.photo,
      source: incoming.source || base.source,
      registeredAt: incoming.registeredAt || base.registeredAt
    };
  }

  function upsertCandidate(candidate) {
    const cleanCandidate = sanitizeCandidate(candidate);
    if (!cleanCandidate) {
      return null;
    }

    const stored = getStoredCandidates();
    const normalizedName = normalizeText(cleanCandidate.fullName);
    const existingIndex = stored.findIndex(function (item) {
      return item.key === cleanCandidate.key || normalizeText(item.fullName) === normalizedName;
    });

    if (existingIndex >= 0) {
      stored[existingIndex] = mergeCandidateDetails(stored[existingIndex], cleanCandidate);
    } else {
      stored.push(cleanCandidate);
    }

    saveStoredCandidates(stored);
    return cleanCandidate;
  }

  function buildCandidateFromAuthUser(user) {
    const role = window.siteAuth?.getUserRole ? window.siteAuth.getUserRole(user) : 'player';
    const profile = user?.user_metadata?.profile || {};

    if (role === 'player') {
      const fullName = window.siteAuth?.getUserDisplayName
        ? window.siteAuth.getUserDisplayName(user)
        : (user?.email || 'ფეხბურთელი');
      const age = resolveAge(profile.playerAge, profile.playerBirthDate);

      return sanitizeCandidate({
        key: `player:${user.id}`,
        userId: user.id,
        roleSource: 'player',
        fullName: fullName,
        age: age,
        ageCat: resolveAgeGroup(profile.playerAgeCategory, profile.playerBirthDate, age),
        foot: profile.playerFoot,
        position: profile.playerPosition,
        positionLabel: profile.playerPosition,
        team: profile.playerTeam,
        photo: profile.playerPhoto || profile.profilePhoto || '',
        source: 'auth',
        registeredAt: user?.created_at || new Date().toISOString()
      });
    }

    if (role === 'parent') {
      const childName = String(profile.childName || '').trim();
      if (!childName) {
        return null;
      }

      const age = resolveAge(profile.childAge, profile.childBirthDate);
      return sanitizeCandidate({
        key: `parent-child:${user.id}`,
        userId: user.id,
        roleSource: 'parent-child',
        fullName: childName,
        age: age,
        ageCat: resolveAgeGroup(profile.childAgeCategory, profile.childBirthDate, age),
        foot: profile.childFoot,
        position: profile.childPosition,
        positionLabel: profile.childPosition,
        team: profile.childTeam,
        photo: profile.childPhoto || profile.profilePhoto || '',
        source: 'auth',
        registeredAt: user?.created_at || new Date().toISOString()
      });
    }

    return null;
  }

  function syncFromAuthUser(user) {
    const candidate = buildCandidateFromAuthUser(user);
    if (!candidate) {
      return null;
    }
    return upsertCandidate(candidate);
  }

  function mapPublicPlayer(player) {
    return sanitizeCandidate({
      key: `public-player:${player.user_id}`,
      userId: player.user_id,
      roleSource: 'player',
      fullName: player.display_name,
      age: player.age,
      ageCat: String(player.age_group || 'pro').trim().toLowerCase(),
      foot: player.preferred_foot,
      positionLabel: player.position_label,
      team: player.current_club_name,
      photo: player.avatar_path,
      source: 'supabase',
      registeredAt: player.updated_at || player.created_at || new Date().toISOString()
    });
  }

  async function fetchPublicCandidates(client) {
    if (!client?.from) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('player_profiles')
        .select('user_id, display_name, avatar_path, age, age_group, preferred_foot, position_label, current_club_name, visibility_public, created_at, updated_at')
        .eq('visibility_public', true)
        .not('display_name', 'is', null)
        .order('updated_at', { ascending: false });

      if (error || !Array.isArray(data)) {
        return [];
      }

      return data
        .map(mapPublicPlayer)
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function mergeCandidates() {
    const buckets = Array.prototype.slice.call(arguments).flat().filter(Boolean);
    const merged = [];
    const keys = new Map();
    const names = new Map();

    buckets.forEach(function (candidate) {
      const cleanCandidate = sanitizeCandidate(candidate);
      if (!cleanCandidate) {
        return;
      }

      const nameKey = normalizeText(cleanCandidate.fullName);
      const existingIndex = keys.has(cleanCandidate.key)
        ? keys.get(cleanCandidate.key)
        : (names.has(nameKey) ? names.get(nameKey) : -1);

      if (existingIndex >= 0) {
        merged[existingIndex] = mergeCandidateDetails(merged[existingIndex], cleanCandidate);
        keys.set(merged[existingIndex].key, existingIndex);
        names.set(normalizeText(merged[existingIndex].fullName), existingIndex);
        return;
      }

      const nextIndex = merged.push(cleanCandidate) - 1;
      keys.set(cleanCandidate.key, nextIndex);
      names.set(nameKey, nextIndex);
    });

    return merged;
  }

  window.siteRegisteredPlayers = {
    buildCandidateFromAuthUser: buildCandidateFromAuthUser,
    fetchPublicCandidates: fetchPublicCandidates,
    getStoredCandidates: getStoredCandidates,
    mergeCandidates: mergeCandidates,
    normalizeText: normalizeText,
    syncFromAuthUser: syncFromAuthUser,
    upsertCandidate: upsertCandidate
  };
})();
