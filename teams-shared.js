(function () {
  const teams = [
    { mark: 'DT', name: 'დინამო თბილისი', city: 'თბილისი, საქართველო', age: 'pro', ageLabel: 'PRO', players: 24, coach: 'გ. აბრამიძე', route: 'team-dinamo-tbilisi.html', slug: 'dinamo-tbilisi' },
    { mark: 'TQ', name: 'ტორპედო ქუთაისი', city: 'ქუთაისი, საქართველო', age: 'pro', ageLabel: 'PRO', players: 23, coach: 'ლ. კალანდაძე', route: '', slug: 'torpedo-kutaisi' },
    { mark: 'SB', name: 'საბურთალო თბილისი', city: 'თბილისი, საქართველო', age: 'u21', ageLabel: 'U21', players: 22, coach: 'ნ. ჯავახიშვილი', route: '', slug: 'saburtalo-tbilisi' },
    { mark: 'DB', name: 'დინამო ბათუმი', city: 'ბათუმი, საქართველო', age: 'u19', ageLabel: 'U19', players: 21, coach: 'რ. შანიძე', route: '', slug: 'dinamo-batumi' },
    { mark: 'DG', name: 'დილა გორი', city: 'გორი, საქართველო', age: 'u17', ageLabel: 'U17', players: 20, coach: 'თ. ნოზაძე', route: '', slug: 'dila-gori' },
    { mark: 'KF', name: 'კოლხეთი ფოთი', city: 'ფოთი, საქართველო', age: 'u16', ageLabel: 'U16', players: 19, coach: 'ბ. ქარჩავა', route: '', slug: 'kolkheti-poti' },
    { mark: 'SZ', name: 'სამგურალი წყალტუბო', city: 'წყალტუბო, საქართველო', age: 'u15', ageLabel: 'U15', players: 18, coach: 'ს. ფაღავა', route: '', slug: 'samgurali-tsqaltubo' },
    { mark: 'GG', name: 'გაგრა თბილისი', city: 'თბილისი, საქართველო', age: 'u14', ageLabel: 'U14', players: 18, coach: 'ო. ჭელიძე', route: '', slug: 'gagra-tbilisi' },
    { mark: 'TL', name: 'თელავი', city: 'თელავი, საქართველო', age: 'u13', ageLabel: 'U13', players: 17, coach: 'გ. დიასამიძე', route: '', slug: 'telavi' },
    { mark: 'SM', name: 'სამტრედია', city: 'სამტრედია, საქართველო', age: 'u12', ageLabel: 'U12', players: 17, coach: 'ი. მელქაძე', route: '', slug: 'samtredia' },
    { mark: 'SQ', name: 'შუქურა ქობულეთი', city: 'ქობულეთი, საქართველო', age: 'u11', ageLabel: 'U11', players: 16, coach: 'ლ. დუმბაძე', route: '', slug: 'shukura-kobuleti' },
    { mark: 'MM', name: 'მერანი მარტვილი', city: 'მარტვილი, საქართველო', age: 'u10', ageLabel: 'U10', players: 16, coach: 'ა. ჭანტურია', route: '', slug: 'merani-martvili' },
    { mark: 'VJ', name: 'ვიტ ჯორჯია', city: 'თბილისი, საქართველო', age: 'u9', ageLabel: 'U9', players: 15, coach: 'შ. მერაბიშვილი', route: '', slug: 'wit-georgia' },
    { mark: 'LT', name: 'ლოკომოტივი თბილისი', city: 'თბილისი, საქართველო', age: 'u8', ageLabel: 'U8', players: 15, coach: 'დ. გაბიტაშვილი', route: '', slug: 'lokomotivi-tbilisi' },
    { mark: 'RS', name: 'რუსთავი', city: 'რუსთავი, საქართველო', age: 'u7', ageLabel: 'U7', players: 14, coach: 'ვ. მაისურაძე', route: '', slug: 'rustavi' },
    { mark: 'CS', name: 'ჩიხურა საჩხერე', city: 'საჩხერე, საქართველო', age: 'u6', ageLabel: 'U6', players: 14, coach: 'რ. კიკნაძე', route: '', slug: 'chikhura' },
    { mark: 'SP', name: 'სპაერი', city: 'თბილისი, საქართველო', age: 'u21', ageLabel: 'U21', players: 22, coach: 'დ. ჩხეტიანი', route: '', slug: 'spaeri' },
    { mark: 'IB', name: 'იბერია 1999', city: 'თბილისი, საქართველო', age: 'u19', ageLabel: 'U19', players: 21, coach: 'გ. ზაქარეიშვილი', route: '', slug: 'iberia-1999' },
    { mark: 'GR', name: 'გარეჯი საგარეჯო', city: 'საგარეჯო, საქართველო', age: 'u17', ageLabel: 'U17', players: 19, coach: 'მ. ხუციშვილი', route: '', slug: 'gareji-sagarejo' },
    { mark: 'SN', name: 'სიონი ბოლნისი', city: 'ბოლნისი, საქართველო', age: 'u16', ageLabel: 'U16', players: 18, coach: 'ზ. მუმლაძე', route: '', slug: 'sioni-bolnisi' }
  ];

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function cloneTeam(team) {
    return {
      ...team
    };
  }

  function getTeams() {
    return teams.map(cloneTeam);
  }

  function findTeamByName(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return null;
    }

    const matched = teams.find((team) => normalizeText(team.name) === normalized);
    return matched ? cloneTeam(matched) : null;
  }

  function searchTeams(query, limit) {
    const normalized = normalizeText(query);
    const maxItems = Number(limit) > 0 ? Number(limit) : 6;

    const matched = (!normalized ? teams : teams.filter((team) => {
      const haystack = [
        team.name,
        team.city,
        team.ageLabel,
        team.mark
      ].map(normalizeText).join(' ');

      return haystack.includes(normalized);
    })).slice(0, maxItems);

    return matched.map(cloneTeam);
  }

  window.siteTeams = {
    teams: getTeams(),
    getTeams,
    findTeamByName,
    normalizeText,
    searchTeams
  };
})();
