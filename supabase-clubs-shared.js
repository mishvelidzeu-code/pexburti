(function () {
  let teams = [];
  let loadPromise = null;

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function buildTeamRoute(slug) {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug) {
      return '';
    }
    if (cleanSlug === 'dinamo-tbilisi') {
      return 'team-dinamo-tbilisi.html';
    }
    return 'team-dinamo-tbilisi.html?club=' + encodeURIComponent(cleanSlug);
  }

  function shortCode(name, existing) {
    const cleanExisting = String(existing || '').trim();
    if (cleanExisting) {
      return cleanExisting.toUpperCase();
    }
    const initials = String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) {
        return part[0] ? part[0].toUpperCase() : '';
      })
      .join('');
    return initials || 'FG';
  }

  function mapClub(row) {
    const slug = String(row.slug || '').trim().toLowerCase();
    const nameEn = String(row.name || '').trim();
    const nameKa = String(row.name_ka || '').trim();
    const displayName = nameKa || nameEn;
    return {
      id: String(row.id || '').trim(),
      slug: slug,
      name: displayName,
      nameKa: nameKa,
      nameEn: nameEn,
      city: [row.city, row.country].filter(Boolean).join(', '),
      route: buildTeamRoute(slug),
      shortCode: shortCode(displayName, row.short_code),
      mark: shortCode(displayName, row.short_code),
      logoPath: String(row.logo_path || '').trim(),
      age: String(row.age_band || 'pro').trim().toLowerCase(),
      ageLabel: String(row.age_band || 'PRO').trim().toUpperCase()
    };
  }

  async function hydrate(client) {
    if (!client?.from) {
      teams = [];
      api.teams = teams;
      return teams;
    }

    if (!loadPromise) {
      loadPromise = client
        .from('clubs')
        .select('id, slug, short_code, name, name_ka, city, country, age_band, logo_path, is_public, is_active')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .then(function (response) {
          teams = Array.isArray(response.data) && !response.error
            ? response.data.map(mapClub).filter(function (club) {
              return Boolean(club.name);
            })
            : [];
          api.teams = teams;
          return teams;
        })
        .catch(function () {
          teams = [];
          api.teams = teams;
          return teams;
        })
        .finally(function () {
          loadPromise = null;
        });
    }

    return loadPromise;
  }

  function getTeams() {
    return teams.slice();
  }

  function findTeamByName(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return null;
    }
    return teams.find(function (team) {
      return normalizeText(team.name) === normalized;
    }) || null;
  }

  function searchTeams(query, limit) {
    const normalized = normalizeText(query);
    const cap = Number(limit) > 0 ? Number(limit) : teams.length;
    if (!normalized) {
      return teams.slice(0, cap);
    }
    return teams
      .filter(function (team) {
        return normalizeText(team.name).includes(normalized) ||
          normalizeText(team.nameKa || '').includes(normalized) ||
          normalizeText(team.nameEn || '').includes(normalized) ||
          normalizeText(team.city).includes(normalized) ||
          normalizeText(team.ageLabel).includes(normalized);
      })
      .slice(0, cap);
  }

  function autoHydrate(attempt) {
    const tries = Number(attempt || 0);
    const client = window.siteAuth?.getClient ? window.siteAuth.getClient() : null;
    if (!client?.from) {
      if (tries < 30) {
        window.setTimeout(function () {
          autoHydrate(tries + 1);
        }, 80);
      }
      return;
    }
    hydrate(client);
  }

  const api = {
    teams: teams,
    findTeamByName: findTeamByName,
    getTeams: getTeams,
    hydrate: hydrate,
    normalizeText: normalizeText,
    searchTeams: searchTeams
  };

  window.siteTeams = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      autoHydrate(0);
    }, { once: true });
  } else {
    autoHydrate(0);
  }
})();
