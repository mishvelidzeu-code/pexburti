(function () {
  const POSITION_LABELS = {
    goalkeeper: '\u10db\u10d4\u10d9\u10d0\u10e0\u10d4',
    defender: '\u10d3\u10d0\u10db\u10ea\u10d5\u10d4\u10da\u10d8',
    midfielder: '\u10dc\u10d0\u10ee\u10d4\u10d5\u10d0\u10e0\u10db\u10ea\u10d5\u10d4\u10da\u10d8',
    forward: '\u10d7\u10d0\u10d5\u10d3\u10d0\u10db\u10e1\u10ee\u10db\u10d4\u10da\u10d8',
    gk: '\u10db\u10d4\u10d9\u10d0\u10e0\u10d4',
    df: '\u10d3\u10d0\u10db\u10ea\u10d5\u10d4\u10da\u10d8',
    mf: '\u10dc\u10d0\u10ee\u10d4\u10d5\u10d0\u10e0\u10db\u10ea\u10d5\u10d4\u10da\u10d8',
    fw: '\u10d7\u10d0\u10d5\u10d3\u10d0\u10db\u10e1\u10ee\u10db\u10d4\u10da\u10d8'
  };

  const POSITION_CODES = {
    goalkeeper: 'GK',
    defender: 'DF',
    midfielder: 'MF',
    forward: 'FW',
    gk: 'GK',
    df: 'DF',
    mf: 'MF',
    fw: 'FW'
  };

  const LINEUP_SLOTS = [
    { slot: 'gk', key: 'goalkeeper' },
    { slot: 'rb', key: 'defender' },
    { slot: 'rcb', key: 'defender' },
    { slot: 'lcb', key: 'defender' },
    { slot: 'lb', key: 'defender' },
    { slot: 'rcm', key: 'midfielder' },
    { slot: 'cm', key: 'midfielder' },
    { slot: 'lcm', key: 'midfielder' },
    { slot: 'rw', key: 'forward' },
    { slot: 'st', key: 'forward' },
    { slot: 'lw', key: 'forward' }
  ];

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

  function titleCaseSlug(slug) {
    return String(slug || '')
      .split('-')
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function slugify(value) {
    if (window.sitePlayerDomain?.slugify) {
      return window.sitePlayerDomain.slugify(value);
    }
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u10d0-\u10ff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function hashString(value) {
    const raw = String(value || '');
    let hash = 0;
    for (let index = 0; index < raw.length; index += 1) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getAgeLabel(key) {
    if (window.siteAgeGroups?.getAgeGroupLabel) {
      return window.siteAgeGroups.getAgeGroupLabel(key);
    }
    return String(key || 'pro').toUpperCase();
  }

  function toFootLabel(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return '\u10d0\u10e0 \u10d0\u10e0\u10d8\u10e1 \u10db\u10d8\u10d7\u10d8\u10d7\u10d4\u10d1\u10e3\u10da\u10d8';
    }
    if (normalized === 'left' || normalized.indexOf('\u10db\u10d0\u10e0\u10ea\u10ee') >= 0) {
      return '\u10db\u10d0\u10e0\u10ea\u10ee\u10d4\u10dc\u10d0';
    }
    if (normalized === 'right' || normalized.indexOf('\u10db\u10d0\u10e0\u10ef') >= 0) {
      return '\u10db\u10d0\u10e0\u10ef\u10d5\u10d4\u10dc\u10d0';
    }
    if (normalized === 'both' || normalized.indexOf('\u10dd\u10e0\u10d8\u10d5\u10d4') >= 0) {
      return '\u10dd\u10e0\u10d8\u10d5\u10d4';
    }
    return String(value || '').trim();
  }

  function normalizePositionKey(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return 'midfielder';
    }
    if (normalized === 'gk' || normalized.indexOf('goal') >= 0 || normalized.indexOf('\u10db\u10d4\u10d9\u10d0\u10e0') >= 0) {
      return 'goalkeeper';
    }
    if (normalized === 'df' || normalized.indexOf('def') >= 0 || normalized.indexOf('\u10d3\u10d0\u10db\u10ea') >= 0) {
      return 'defender';
    }
    if (normalized === 'fw' || normalized.indexOf('for') >= 0 || normalized.indexOf('\u10d7\u10d0\u10d5\u10d3\u10d0\u10db') >= 0) {
      return 'forward';
    }
    return 'midfielder';
  }

  function buildTeamHref(slug) {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug) {
      return 'gundebi.html';
    }
    if (cleanSlug === 'dinamo-tbilisi') {
      return 'team-dinamo-tbilisi.html';
    }
    return 'team-dinamo-tbilisi.html?club=' + encodeURIComponent(cleanSlug);
  }

  function buildPlayerHref(playerId, fromPath) {
    return 'player-profile.html?player=' + encodeURIComponent(String(playerId || '')) + '&from=' + encodeURIComponent(fromPath || 'pexburtelebi.html');
  }

  function resolvePhoto(rawId, rawName, existingPhoto) {
    const cleanPhoto = String(existingPhoto || '').trim();
    if (cleanPhoto) {
      return cleanPhoto;
    }
    const imageIndex = (hashString(String(rawId || '') + ':' + String(rawName || '')) % 70) + 1;
    return 'https://i.pravatar.cc/400?img=' + imageIndex;
  }

  function resolveClubLogo(existingLogo, shortCode) {
    const cleanLogo = String(existingLogo || '').trim();
    if (cleanLogo) {
      return cleanLogo;
    }

    const code = String(shortCode || 'FG').trim().slice(0, 3).toUpperCase() || 'FG';
    const paletteIndex = hashString(code) % 6;
    const palettes = [
      ['#b91c1c', '#7f1d1d', '#fca5a5'],
      ['#1d4ed8', '#1e3a8a', '#93c5fd'],
      ['#0f766e', '#134e4a', '#99f6e4'],
      ['#7c3aed', '#4c1d95', '#c4b5fd'],
      ['#ea580c', '#9a3412', '#fdba74'],
      ['#1f2937', '#0f172a', '#cbd5e1']
    ];
    const palette = palettes[paletteIndex];
    const svg = [
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 112'>",
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
      "<stop offset='0' stop-color='" + palette[0] + "'/>",
      "<stop offset='1' stop-color='" + palette[1] + "'/>",
      "</linearGradient></defs>",
      "<path d='M48 4L84 16V48C84 69 69 88 48 104C27 88 12 69 12 48V16L48 4Z' fill='url(#g)'/>",
      "<path d='M48 14L74 23V48C74 63 64 77 48 89C32 77 22 63 22 48V23L48 14Z' fill='none' stroke='white' stroke-opacity='.68' stroke-width='2'/>",
      "<circle cx='48' cy='40' r='14' fill='" + palette[2] + "' fill-opacity='.96'/>",
      "<text x='48' y='45' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif' font-size='17' font-weight='900' fill='white'>" + code + "</text>",
      "<text x='48' y='74' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif' font-size='9' font-weight='800' letter-spacing='.18em' fill='white'>CLUB</text>",
      "</svg>"
    ].join('');
    return 'data:image/svg+xml;base64,' + window.btoa(svg);
  }

  function buildRating(player) {
    const votes = Number(player.votesCount || 0) || 0;
    const age = Number(player.age || 0) || 0;
    const rating = 7.2 + Math.min(2.6, (votes * 0.18)) + Math.min(0.4, age * 0.01);
    return Math.min(9.9, Number(rating.toFixed(1)));
  }

  function enrichPlayer(entry) {
    if (!entry || !String(entry.fullName || '').trim()) {
      return null;
    }

    const names = splitName(entry.fullName);
    const positionKey = normalizePositionKey(entry.positionLabel || entry.position);
    const ageGroup = String(entry.ageGroup || entry.ageLabel || 'pro').trim().toLowerCase() || 'pro';
    const ageLabel = getAgeLabel(ageGroup);
    const clubSlug = String(entry.teamSlug || '').trim().toLowerCase();
    const teamName = String(entry.team || titleCaseSlug(clubSlug) || '\u10e3\u10d2\u10e3\u10dc\u10d3\u10dd\u10d3').trim();

    return {
      id: String(entry.id || entry.playerId || '').trim(),
      fullName: String(entry.fullName || '').trim(),
      firstName: names.firstName,
      lastName: names.lastName,
      age: Number.isFinite(Number(entry.age)) ? Number(entry.age) : null,
      ageGroup: ageGroup,
      ageLabel: ageLabel,
      positionKey: positionKey,
      positionCode: POSITION_CODES[positionKey] || 'MF',
      positionLabel: String(entry.positionLabel || POSITION_LABELS[positionKey] || '\u10db\u10dd\u10d7\u10d0\u10db\u10d0\u10e8\u10d4').trim(),
      foot: toFootLabel(entry.foot),
      team: teamName,
      teamSlug: clubSlug,
      teamRoute: buildTeamHref(clubSlug),
      teamStatus: String(entry.teamStatus || '').trim(),
      photo: resolvePhoto(entry.id || entry.playerId, entry.fullName, entry.photo),
      votesCount: Number(entry.votesCount || entry.votes || 0) || 0,
      rating: buildRating(entry),
      ownerRole: String(entry.ownerRole || entry.roleSource || 'player').trim(),
      updatedAt: String(entry.updatedAt || entry.registeredAt || '').trim()
    };
  }

  function enrichClub(row, playerCounts, playerVotes) {
    const slug = String(row.slug || '').trim().toLowerCase();
    const shortCode = String(row.short_code || '').trim() || titleCaseSlug(slug).slice(0, 2).toUpperCase();
    const playerCount = playerCounts.get(slug) || Number(row.players_count || 0) || 0;
    const votesCount = playerVotes.get(slug) || 0;
    const band = String(row.age_band || 'PRO').trim();
    return {
      id: String(row.id || '').trim(),
      slug: slug,
      shortCode: shortCode,
      name: String(row.name || titleCaseSlug(slug)).trim(),
      city: String(row.city || '').trim(),
      country: String(row.country || 'Georgia').trim(),
      location: [row.city, row.country].filter(Boolean).join(', '),
      ageBand: band,
      ageLabel: band.toUpperCase(),
      coach: String(row.coach_name || '\u10d0\u10e0 \u10d0\u10e0\u10d8\u10e1 \u10db\u10d8\u10d7\u10d8\u10d7\u10d4\u10d1\u10e3\u10da\u10d8').trim(),
      playersCount: playerCount,
      votesCount: votesCount,
      logoPath: resolveClubLogo(row.logo_path, shortCode),
      route: buildTeamHref(slug),
      summary: String(row.summary || '').trim()
    };
  }

  async function fetchPublicPlayers(client) {
    const entries = window.sitePlayerDomain?.fetchPublicDirectoryEntries
      ? await window.sitePlayerDomain.fetchPublicDirectoryEntries(client)
      : [];

    const enriched = Array.isArray(entries)
      ? entries.map(enrichPlayer).filter(Boolean)
      : [];

    if (!client?.from || !enriched.length) {
      return enriched;
    }

    try {
      const ids = enriched.map(function (player) { return player.id; }).filter(Boolean);
      const { data, error } = await client
        .from('player_vote_manual_overrides')
        .select('player_id, manual_votes')
        .in('player_id', ids);

      if (error || !Array.isArray(data)) {
        return enriched;
      }

      const manualMap = new Map();
      data.forEach(function (row) {
        manualMap.set(String(row.player_id || ''), Number(row.manual_votes || 0) || 0);
      });

      return enriched.map(function (player) {
        const manualVotes = manualMap.get(player.id) || 0;
        const votesCount = (Number(player.votesCount || 0) || 0) + manualVotes;
        return {
          ...player,
          votesCount: votesCount,
          rating: buildRating({ ...player, votesCount: votesCount })
        };
      });
    } catch (error) {
      return enriched;
    }
  }

  async function fetchPlayerById(client, playerId) {
    const cleanId = String(playerId || '').trim();
    if (!client?.from || !cleanId) {
      return null;
    }

    try {
      const { data, error } = await client
        .from('player_registry')
        .select(window.sitePlayerDomain?.DIRECTORY_FIELDS || '*')
        .eq('id', cleanId)
        .maybeSingle();

      if (error || !data) {
        const fallbackEntry = await window.sitePlayerDomain?.fetchManagedEntry?.(client, cleanId);
        return fallbackEntry ? enrichPlayer(fallbackEntry) : null;
      }

      const isVisible = data.visibility_public === null || data.visibility_public === undefined || data.visibility_public === true;
      const isActive = data.is_active === null || data.is_active === undefined || data.is_active === true;
      if (!isVisible || !isActive) {
        return null;
      }

      let votesCount = 0;
      const { data: totalsData } = await client
        .from('player_vote_totals')
        .select('votes_count')
        .eq('player_id', cleanId)
        .maybeSingle();

      if (totalsData?.votes_count) {
        votesCount = Number(totalsData.votes_count || 0) || 0;
      }

      const { data: manualVoteData } = await client
        .from('player_vote_manual_overrides')
        .select('manual_votes')
        .eq('player_id', cleanId)
        .maybeSingle();

      if (manualVoteData?.manual_votes) {
        votesCount += Number(manualVoteData.manual_votes || 0) || 0;
      }

      const mapped = window.sitePlayerDomain?.mapRegistryEntry
        ? window.sitePlayerDomain.mapRegistryEntry({ ...data, votes_count: votesCount })
        : data;

      return enrichPlayer(mapped);
    } catch (error) {
      const fallbackEntry = await window.sitePlayerDomain?.fetchManagedEntry?.(client, cleanId);
      return fallbackEntry ? enrichPlayer(fallbackEntry) : null;
    }
  }

  async function fetchPublicClubs(client) {
    if (!client?.from) {
      return [];
    }

    try {
      const [clubResponse, players] = await Promise.all([
        client
          .from('clubs')
          .select('id, slug, short_code, name, city, country, age_band, coach_name, players_count, logo_path, summary, is_public, is_active')
          .eq('is_public', true)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        fetchPublicPlayers(client).catch(function () { return []; })
      ]);

      const clubRows = Array.isArray(clubResponse.data) && !clubResponse.error
        ? clubResponse.data
        : [];

      const playerCounts = new Map();
      const playerVotes = new Map();

      players.forEach(function (player) {
        const slug = String(player.teamSlug || '').trim().toLowerCase();
        if (!slug) {
          return;
        }
        playerCounts.set(slug, (playerCounts.get(slug) || 0) + 1);
        playerVotes.set(slug, (playerVotes.get(slug) || 0) + (Number(player.votesCount || 0) || 0));
      });

      const enrichedClubs = clubRows.map(function (row) {
        return enrichClub(row, playerCounts, playerVotes);
      });

      if (enrichedClubs.length) {
        return enrichedClubs;
      }

      const clubMap = new Map();
      players.forEach(function (player) {
        const teamName = String(player.team || '').trim();
        const teamSlug = String(player.teamSlug || '').trim().toLowerCase();
        if (!teamName && !teamSlug) {
          return;
        }
        const key = teamSlug || titleCaseSlug(teamName);
        if (!clubMap.has(key)) {
          clubMap.set(key, {
            id: key,
            slug: teamSlug || slugify(teamName),
            short_code: (teamName || key).slice(0, 2).toUpperCase(),
            name: teamName || titleCaseSlug(teamSlug),
            city: '',
            country: 'Georgia',
            age_band: 'U8-PRO',
            coach_name: 'არ არის მითითებული',
            players_count: 0,
            logo_path: '',
            summary: 'ფეხბურთელების ბაზიდან აწყობილი გუნდი.',
            is_public: true,
            is_active: true
          });
        }
      });

      return Array.from(clubMap.values()).map(function (row) {
        return enrichClub(row, playerCounts, playerVotes);
      });
    } catch (error) {
      return [];
    }
  }

  async function fetchClubBySlug(client, clubSlug) {
    const clubs = await fetchPublicClubs(client);
    const cleanSlug = String(clubSlug || '').trim().toLowerCase();
    return clubs.find(function (club) {
      return club.slug === cleanSlug;
    }) || null;
  }

  async function fetchPlayersForClub(client, clubSlug) {
    const cleanSlug = String(clubSlug || '').trim().toLowerCase();
    const players = await fetchPublicPlayers(client);
    return players.filter(function (player) {
      return String(player.teamSlug || '').trim().toLowerCase() === cleanSlug;
    });
  }

  function buildClubRankings(players, clubs) {
    return clubs
      .map(function (club) {
        const squad = players.filter(function (player) {
          return player.teamSlug === club.slug;
        });
        const voteTotal = squad.reduce(function (sum, player) {
          return sum + (Number(player.votesCount || 0) || 0);
        }, 0);
        const ageGroups = new Set(squad.map(function (player) {
          return player.ageGroup;
        }).filter(Boolean));
        const score = (squad.length * 4) + voteTotal + ageGroups.size;
        return {
          ...club,
          publicPlayers: squad.length,
          votesCount: voteTotal,
          ageGroupsCount: ageGroups.size,
          score: score
        };
      })
      .sort(function (a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return normalizeText(a.name).localeCompare(normalizeText(b.name), 'ka');
      });
  }

  function buildAgeGroupLeaders(players) {
    const buckets = new Map();
    players.forEach(function (player) {
      const key = String(player.ageGroup || 'pro').trim().toLowerCase();
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(player);
    });

    return Array.from(buckets.entries())
      .map(function (entry) {
        const key = entry[0];
        const ranked = entry[1].slice().sort(function (a, b) {
          if (b.votesCount !== a.votesCount) {
            return b.votesCount - a.votesCount;
          }
          return normalizeText(a.fullName).localeCompare(normalizeText(b.fullName), 'ka');
        });
        return {
          key: key,
          label: getAgeLabel(key),
          players: ranked.slice(0, 5)
        };
      })
      .sort(function (a, b) {
        return normalizeText(a.label).localeCompare(normalizeText(b.label), 'ka');
      });
  }

  function takePlayersForLineup(pool, amount, usedIds) {
    const selected = [];
    for (let index = 0; index < pool.length && selected.length < amount; index += 1) {
      const player = pool[index];
      if (usedIds.has(player.id)) {
        continue;
      }
      usedIds.add(player.id);
      selected.push(player);
    }
    return selected;
  }

  function buildFeaturedLineup(players) {
    const ranked = players.slice().sort(function (a, b) {
      if (b.votesCount !== a.votesCount) {
        return b.votesCount - a.votesCount;
      }
      return b.rating - a.rating;
    });

    const grouped = {
      goalkeeper: ranked.filter(function (player) { return player.positionKey === 'goalkeeper'; }),
      defender: ranked.filter(function (player) { return player.positionKey === 'defender'; }),
      midfielder: ranked.filter(function (player) { return player.positionKey === 'midfielder'; }),
      forward: ranked.filter(function (player) { return player.positionKey === 'forward'; })
    };

    const usedIds = new Set();
    const chosen = []
      .concat(takePlayersForLineup(grouped.goalkeeper, 1, usedIds))
      .concat(takePlayersForLineup(grouped.defender, 4, usedIds))
      .concat(takePlayersForLineup(grouped.midfielder, 3, usedIds))
      .concat(takePlayersForLineup(grouped.forward, 3, usedIds));

    if (chosen.length < LINEUP_SLOTS.length) {
      chosen.push.apply(chosen, takePlayersForLineup(ranked, LINEUP_SLOTS.length - chosen.length, usedIds));
    }

    return LINEUP_SLOTS.map(function (slot, index) {
      return {
        slot: slot.slot,
        player: chosen[index] || null
      };
    }).filter(function (entry) {
      return Boolean(entry.player);
    });
  }

  async function fetchCurrentMonthlySnapshot(client, players) {
    if (!client?.rpc) {
      return null;
    }

    try {
      const { data, error } = await client.rpc('get_or_create_monthly_featured_snapshot');
      if (error || !data) {
        return null;
      }

      const playerPool = Array.isArray(players) ? players : await fetchPublicPlayers(client);
      const playerMap = new Map(
        playerPool.map(function (player) {
          return [String(player.id || '').trim(), player];
        })
      );

      const featuredPlayerId = String(data.featured_player_id || '').trim();
      const lineupRows = Array.isArray(data.lineup) ? data.lineup : [];
      const lineup = lineupRows
        .map(function (entry) {
          const player = playerMap.get(String(entry.player_id || '').trim());
          if (!player) {
            return null;
          }
          return {
            slot: String(entry.slot || '').trim(),
            player: player
          };
        })
        .filter(Boolean);

      return {
        cycleKey: String(data.cycle_key || '').trim(),
        cycleStart: String(data.cycle_start || '').trim(),
        cycleEnd: String(data.cycle_end || '').trim(),
        featuredVotes: Number(data.featured_votes || 0) || 0,
        featuredPlayer: playerMap.get(featuredPlayerId) || null,
        lineup: lineup
      };
    } catch (error) {
      return null;
    }
  }

  window.siteData = {
    buildClubRankings: buildClubRankings,
    buildFeaturedLineup: buildFeaturedLineup,
    buildPlayerHref: buildPlayerHref,
    buildTeamHref: buildTeamHref,
    buildAgeGroupLeaders: buildAgeGroupLeaders,
    enrichPlayer: enrichPlayer,
    fetchClubBySlug: fetchClubBySlug,
    fetchCurrentMonthlySnapshot: fetchCurrentMonthlySnapshot,
    fetchPlayerById: fetchPlayerById,
    fetchPlayersForClub: fetchPlayersForClub,
    fetchPublicClubs: fetchPublicClubs,
    fetchPublicPlayers: fetchPublicPlayers,
    getAgeLabel: getAgeLabel,
    normalizeText: normalizeText,
    resolvePhoto: resolvePhoto,
    toFootLabel: toFootLabel
  };
})();
