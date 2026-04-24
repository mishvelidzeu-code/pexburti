(function () {
  const DIRECTORY_FIELDS = [
    'id',
    'source_key',
    'auth_user_id',
    'owner_user_id',
    'owner_role',
    'full_name',
    'first_name',
    'last_name',
    'avatar_path',
    'birth_date',
    'birth_year',
    'current_age',
    'season_year',
    'age_group',
    'age_group_auto',
    'age_group_override',
    'primary_position',
    'position_label',
    'preferred_foot',
    'club_name',
    'club_slug',
    'club_route',
    'club_status',
    'visibility_public',
    'is_active',
    'created_at',
    'updated_at'
  ].join(', ');

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
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

  function resolveTeamRoute(entry) {
    if (entry?.club_route) {
      return entry.club_route;
    }

    const slug = String(entry?.club_slug || '').trim().toLowerCase();
    if (slug) {
      if (slug === 'dinamo-tbilisi') {
        return 'team-dinamo-tbilisi.html';
      }
      return 'team-dinamo-tbilisi.html?club=' + encodeURIComponent(slug);
    }

    const teamsApi = window.siteTeams;
    if (!teamsApi?.teams) {
      return '';
    }

    const name = normalizeText(entry?.club_name);
    if (!name) {
      return '';
    }

    const byName = teamsApi.teams.find(function (team) {
      return normalizeText(team.name) === name;
    });
    return byName?.route || '';
  }

  function mapRegistryEntry(entry) {
    if (!entry || !String(entry.full_name || '').trim()) {
      return null;
    }

    const ageGroupKey = String(entry.age_group || 'pro').trim().toLowerCase() || 'pro';
    const ageGroupLabel = window.siteAgeGroups?.getAgeGroupLabel
      ? window.siteAgeGroups.getAgeGroupLabel(ageGroupKey)
      : ageGroupKey.toUpperCase();

    return {
      id: String(entry.id || '').trim(),
      sourceKey: String(entry.source_key || '').trim(),
      authUserId: String(entry.auth_user_id || '').trim(),
      ownerUserId: String(entry.owner_user_id || '').trim(),
      ownerRole: String(entry.owner_role || 'player').trim(),
      fullName: String(entry.full_name || '').trim(),
      firstName: String(entry.first_name || '').trim(),
      lastName: String(entry.last_name || '').trim(),
      photo: String(entry.avatar_path || '').trim(),
      birthDate: String(entry.birth_date || '').trim(),
      age: Number.isFinite(Number(entry.current_age)) ? Number(entry.current_age) : null,
      ageGroup: ageGroupKey,
      ageLabel: ageGroupLabel,
      position: String(entry.primary_position || '').trim(),
      positionLabel: String(entry.position_label || entry.primary_position || '').trim(),
      foot: String(entry.preferred_foot || '').trim(),
      team: String(entry.club_name || '').trim(),
      teamSlug: String(entry.club_slug || '').trim(),
      teamRoute: resolveTeamRoute(entry),
      teamStatus: String(entry.club_status || '').trim(),
      visibilityPublic: Boolean(entry.visibility_public),
      votesCount: Number(entry.votes_count || 0) || 0,
      createdAt: String(entry.created_at || '').trim(),
      updatedAt: String(entry.updated_at || '').trim()
    };
  }

  function mapProfileFallbackEntry(entry) {
    if (!entry) {
      return null;
    }

    const fullName = String(
      entry.display_name ||
      entry.full_name ||
      entry.name ||
      ''
    ).trim();

    if (!fullName) {
      return null;
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const teamName = String(
      entry.club_name ||
      entry.current_club ||
      entry.team_name ||
      entry.club ||
      ''
    ).trim();
    const teamSlug = String(entry.club_slug || slugify(teamName)).trim().toLowerCase();
    const positionRaw = String(
      entry.position_label ||
      entry.primary_position ||
      entry.position ||
      ''
    ).trim();
    const ageGroupKey = String(entry.age_group || 'pro').trim().toLowerCase() || 'pro';
    const ageGroupLabel = window.siteAgeGroups?.getAgeGroupLabel
      ? window.siteAgeGroups.getAgeGroupLabel(ageGroupKey)
      : ageGroupKey.toUpperCase();

    return {
      id: String(entry.user_id || entry.id || '').trim(),
      sourceKey: 'profile:' + String(entry.user_id || entry.id || '').trim(),
      authUserId: String(entry.user_id || '').trim(),
      ownerUserId: String(entry.user_id || '').trim(),
      ownerRole: 'player',
      fullName: fullName,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
      photo: String(entry.avatar_path || '').trim(),
      birthDate: String(entry.birth_date || '').trim(),
      age: Number.isFinite(Number(entry.age)) ? Number(entry.age) : null,
      ageGroup: ageGroupKey,
      ageLabel: ageGroupLabel,
      position: positionRaw,
      positionLabel: positionRaw,
      foot: String(entry.preferred_foot || entry.foot || '').trim(),
      team: teamName,
      teamSlug: teamSlug,
      teamRoute: resolveTeamRoute({ club_slug: teamSlug, club_name: teamName }),
      teamStatus: teamName ? 'registered' : 'free-agent',
      visibilityPublic: true,
      votesCount: 0,
      createdAt: String(entry.created_at || '').trim(),
      updatedAt: String(entry.updated_at || '').trim(),
      sourceTable: 'player_profiles'
    };
  }

  async function fetchPlayerProfilesFallback(client) {
    if (!client?.from) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('player_profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error || !Array.isArray(data) || !data.length) {
        return [];
      }

      return data.map(mapProfileFallbackEntry).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async function syncMyAccountDomain(client) {
    if (!client?.rpc) {
      return { ok: false, reason: 'missing-client' };
    }

    try {
      const { data, error } = await client.rpc('sync_my_account_domain');
      if (error) {
        return { ok: false, reason: 'rpc-error', error: error };
      }
      return { ok: true, data: data || null };
    } catch (error) {
      return { ok: false, reason: 'rpc-error', error: error };
    }
  }

  async function fetchPublicDirectoryEntries(client) {
    if (!client?.from) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('player_registry')
        .select(DIRECTORY_FIELDS)
        .order('updated_at', { ascending: false });

      if (error || !Array.isArray(data) || !data.length) {
        return await fetchPlayerProfilesFallback(client);
      }

      const publicRows = data.filter(function (entry) {
        const isVisible = entry.visibility_public === null || entry.visibility_public === undefined || entry.visibility_public === true;
        const isActive = entry.is_active === null || entry.is_active === undefined || entry.is_active === true;
        return isVisible && isActive;
      });

      if (!publicRows.length) {
        return data
          .map(function (entry) {
            return mapRegistryEntry({
              ...entry,
              votes_count: 0
            });
          })
          .filter(Boolean);
      }

      const ids = publicRows.map(function (entry) {
        return entry.id;
      }).filter(Boolean);

      const totalsMap = new Map();
      if (ids.length) {
        const { data: totalsData, error: totalsError } = await client
          .from('player_vote_totals')
          .select('player_id, votes_count')
          .in('player_id', ids);

        if (!totalsError && Array.isArray(totalsData)) {
          totalsData.forEach(function (row) {
            totalsMap.set(String(row.player_id || ''), Number(row.votes_count || 0) || 0);
          });
        }
      }

      return publicRows
        .map(function (entry) {
          return mapRegistryEntry({
            ...entry,
            votes_count: totalsMap.get(String(entry.id || '')) || 0
          });
        })
        .filter(Boolean);
    } catch (error) {
      return await fetchPlayerProfilesFallback(client);
    }
  }

  async function fetchManagedEntry(client, userId) {
    if (!client?.from || !userId) {
      return null;
    }

    try {
      const { data, error } = await client
        .from('player_registry')
        .select(DIRECTORY_FIELDS)
        .or(`auth_user_id.eq.${userId},owner_user_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error || !Array.isArray(data) || !data.length) {
        const fallbacks = await fetchPlayerProfilesFallback(client);
        return fallbacks.find(function (entry) {
          return String(entry.authUserId || '') === String(userId);
        }) || null;
      }

      const preferred = data.find(function (entry) {
        return String(entry.auth_user_id || '') === String(userId);
      }) || data[0];

      return mapRegistryEntry(preferred);
    } catch (error) {
      const fallbacks = await fetchPlayerProfilesFallback(client);
      return fallbacks.find(function (entry) {
        return String(entry.authUserId || '') === String(userId);
      }) || null;
    }
  }

  async function fetchCurrentUserVotes(client, userId) {
    if (!client?.from || !userId) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('player_votes')
        .select('player_id')
        .eq('voter_user_id', userId);

      if (error || !Array.isArray(data)) {
        return [];
      }

      return data
        .map(function (row) {
          return String(row.player_id || '').trim();
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async function voteForPlayer(client, playerId, userId) {
    if (!client?.from || !playerId || !userId) {
      return { ok: false, reason: 'missing-data' };
    }

    try {
      const { error } = await client
        .from('player_votes')
        .insert({
          player_id: playerId,
          voter_user_id: userId
        });

      if (error) {
        if (String(error.code || '') === '23505') {
          return { ok: false, reason: 'duplicate' };
        }
        return { ok: false, reason: 'insert-error', error: error };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, reason: 'insert-error', error: error };
    }
  }

  window.sitePlayerDomain = {
    DIRECTORY_FIELDS: DIRECTORY_FIELDS,
    fetchCurrentUserVotes: fetchCurrentUserVotes,
    fetchManagedEntry: fetchManagedEntry,
    fetchPublicDirectoryEntries: fetchPublicDirectoryEntries,
    mapRegistryEntry: mapRegistryEntry,
    mapProfileFallbackEntry: mapProfileFallbackEntry,
    normalizeText: normalizeText,
    resolveTeamRoute: resolveTeamRoute,
    slugify: slugify,
    syncMyAccountDomain: syncMyAccountDomain,
    voteForPlayer: voteForPlayer
  };
})();
