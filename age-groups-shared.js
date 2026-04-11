(function () {
  const AGE_GROUPS = [
    { key: 'pro', label: 'PRO', copy: 'ძირითადი პროფესიონალური ჯგუფი' },
    { key: 'u19', label: 'U19', copy: '18-19 წლის ასაკობრივი ხაზი' },
    { key: 'u17', label: 'U17', copy: '17 წლის ასაკობრივი ჯგუფი' },
    { key: 'u16', label: 'U16', copy: '16 წლის ასაკობრივი ჯგუფი' },
    { key: 'u15', label: 'U15', copy: '15 წლის ასაკობრივი ჯგუფი' },
    { key: 'u14', label: 'U14', copy: '14 წლის ასაკობრივი ჯგუფი' },
    { key: 'u13', label: 'U13', copy: '13 წლის ასაკობრივი ჯგუფი' },
    { key: 'u12', label: 'U12', copy: '12 წლის ასაკობრივი ჯგუფი' },
    { key: 'u11', label: 'U11', copy: '11 წლის ასაკობრივი ჯგუფი' },
    { key: 'u10', label: 'U10', copy: '10 წლის ასაკობრივი ჯგუფი' },
    { key: 'u9', label: 'U9', copy: '9 წლის ასაკობრივი ჯგუფი' },
    { key: 'u8', label: 'U8', copy: '8 წლის და უფრო პატარა ასაკობრივი ჯგუფი' }
  ];

  function getAgeGroups() {
    return AGE_GROUPS.map((group) => ({ ...group }));
  }

  function normalizeAgeGroupKey(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return AGE_GROUPS.some((group) => group.key === normalized)
      ? normalized
      : '';
  }

  function parseBirthDate(value) {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [yearPart, monthPart, dayPart] = raw.split('-');
      const year = Number(yearPart);
      const month = Number(monthPart);
      const day = Number(dayPart);
      const date = new Date(year, month - 1, day);

      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }

      return {
        year,
        month,
        day,
        iso: raw,
        formatted: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).padStart(4, '0')}`,
        date
      };
    }

    const match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) {
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return {
      year,
      month,
      day,
      iso: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      formatted: raw,
      date
    };
  }

  function getSeasonYear(referenceDate) {
    const base = referenceDate instanceof Date ? referenceDate : new Date();
    return base.getFullYear();
  }

  function getSeasonReferenceDate(seasonYear) {
    return new Date(Number(seasonYear) || getSeasonYear(), 0, 1, 12, 0, 0, 0);
  }

  function calculateActualAgeFromBirthDate(value, referenceDate) {
    const parsed = parseBirthDate(value);
    if (!parsed) {
      return null;
    }

    const base = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date();
    let age = base.getFullYear() - parsed.year;
    const monthDiff = base.getMonth() - (parsed.month - 1);
    const dayDiff = base.getDate() - parsed.day;

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }

    return age;
  }

  function calculateSeasonAgeFromBirthDate(value, seasonYear) {
    return calculateActualAgeFromBirthDate(
      value,
      getSeasonReferenceDate(seasonYear)
    );
  }

  function getAgeGroupKeyByAge(age) {
    if (!Number.isFinite(age)) {
      return 'pro';
    }

    if (age <= 8) {
      return 'u8';
    }
    if (age === 9) {
      return 'u9';
    }
    if (age === 10) {
      return 'u10';
    }
    if (age === 11) {
      return 'u11';
    }
    if (age === 12) {
      return 'u12';
    }
    if (age === 13) {
      return 'u13';
    }
    if (age === 14) {
      return 'u14';
    }
    if (age === 15) {
      return 'u15';
    }
    if (age === 16) {
      return 'u16';
    }
    if (age === 17) {
      return 'u17';
    }
    if (age <= 19) {
      return 'u19';
    }

    return 'pro';
  }

  function getAgeGroupKeyByBirthYear(year, seasonYear) {
    const numericYear = Number(year);
    if (!Number.isFinite(numericYear)) {
      return 'pro';
    }

    return getAgeGroupKeyByAge(getSeasonYear(new Date(Number(seasonYear) || getSeasonYear(), 0, 1)) - numericYear);
  }

  function getAgeGroupKeyFromBirthDate(value, seasonYear) {
    const parsed = parseBirthDate(value);
    if (!parsed) {
      return 'pro';
    }

    const seasonAge = calculateSeasonAgeFromBirthDate(parsed.iso, seasonYear);
    return getAgeGroupKeyByAge(seasonAge);
  }

  function getAgeGroupConfig(key) {
    const normalized = normalizeAgeGroupKey(key);
    return AGE_GROUPS.find((group) => group.key === normalized) || AGE_GROUPS[0];
  }

  function getAgeGroupLabel(key) {
    return getAgeGroupConfig(key).label;
  }

  function resolveAgeGroupState(options) {
    const settings = options || {};
    const seasonYear = getSeasonYear(settings.referenceDate);
    const parsedBirth = parseBirthDate(settings.birthDate);
    const birthYear = parsedBirth?.year || Number(settings.birthYear) || null;
    const overrideKey = normalizeAgeGroupKey(settings.overrideKey);
    const fallbackKey = normalizeAgeGroupKey(settings.fallbackKey);
    const autoKey = parsedBirth
      ? getAgeGroupKeyFromBirthDate(parsedBirth.iso, seasonYear)
      : (
        normalizeAgeGroupKey(settings.autoKey) ||
        (birthYear ? getAgeGroupKeyByBirthYear(birthYear, seasonYear) : fallbackKey || 'pro')
      );
    const effectiveKey = overrideKey || autoKey || fallbackKey || 'pro';
    const actualAge = calculateActualAgeFromBirthDate(parsedBirth?.iso || settings.birthDate, settings.referenceDate);

    return {
      seasonYear,
      birthYear,
      autoKey,
      overrideKey,
      effectiveKey,
      manual: Boolean(overrideKey),
      actualAge: Number.isFinite(actualAge) ? actualAge : null
    };
  }

  window.siteAgeGroups = {
    AGE_GROUPS: getAgeGroups(),
    calculateActualAgeFromBirthDate,
    calculateSeasonAgeFromBirthDate,
    getAgeGroupConfig,
    getAgeGroupKeyByAge,
    getAgeGroupKeyByBirthYear,
    getAgeGroupKeyFromBirthDate,
    getAgeGroupLabel,
    getAgeGroups,
    getSeasonReferenceDate,
    getSeasonYear,
    normalizeAgeGroupKey,
    parseBirthDate,
    resolveAgeGroupState
  };
})();
