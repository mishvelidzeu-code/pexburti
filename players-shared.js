(function () {
  const rawPlayers = [
    { id: 1, first: "გიორგი", last: "მიქაუტაძე", pos: "fw", ageCat: "u17", age: 16, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 2, first: "ხვიჩა", last: "კვარაცხელია", pos: "mf", ageCat: "u16", age: 15, foot: "ორივე", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 3, first: "ლუკა", last: "მაისურაძე", pos: "df", ageCat: "u15", age: 14, foot: "მარცხენა", img: "https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 4, first: "საბა", last: "ლობჟანიძე", pos: "mf", ageCat: "u14", age: 13, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 5, first: "ზურიკო", last: "დავითაშვილი", pos: "fw", ageCat: "u13", age: 12, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 6, first: "გიორგი", last: "მამარდაშვილი", pos: "gk", ageCat: "u17", age: 16, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 7, first: "ოთარ", last: "კაკაბაძე", pos: "df", ageCat: "u12", age: 11, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 8, first: "გურამ", last: "კაშია", pos: "df", ageCat: "u11", age: 10, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 9, first: "ბუდუ", last: "ზივზივაძე", pos: "fw", ageCat: "u10", age: 9, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 10, first: "გიორგი", last: "ჩაკვეტაძე", pos: "mf", ageCat: "u9", age: 8, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 11, first: "ნიკა", last: "კვეკვესკირი", pos: "mf", ageCat: "u8", age: 7, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 12, first: "ლუკა", last: "ლოჩოშვილი", pos: "df", ageCat: "u15", age: 14, foot: "მარცხენა", img: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 13, first: "სანდრო", last: "ალთუნაშვილი", pos: "mf", ageCat: "u16", age: 15, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 14, first: "გიორგი", last: "გოჩოლეიშვილი", pos: "df", ageCat: "u14", age: 13, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 15, first: "ლაშა", last: "დვალი", pos: "df", ageCat: "u17", age: 16, foot: "მარცხენა", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 16, first: "შოთა", last: "ნონიკაშვილი", pos: "mf", ageCat: "u13", age: 12, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 17, first: "ანზორ", last: "მექვაბიშვილი", pos: "mf", ageCat: "u12", age: 11, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 18, first: "გიორგი", last: "ლორია", pos: "gk", ageCat: "u15", age: 14, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 19, first: "ლევან", last: "შენგელია", pos: "fw", ageCat: "u10", age: 9, foot: "მარცხენა", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 20, first: "თორნიკე", last: "ოქრიაშვილი", pos: "mf", ageCat: "u11", age: 10, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 21, first: "ლუკა", last: "გუგეშაშვილი", pos: "gk", ageCat: "u8", age: 7, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 22, first: "ივა", last: "გელაშვილი", pos: "df", ageCat: "u9", age: 8, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 23, first: "გიორგი", last: "არაბიძე", pos: "fw", ageCat: "u16", age: 15, foot: "მარცხენა", img: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 24, first: "ბექა", last: "მიქელთაძე", pos: "fw", ageCat: "u14", age: 13, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 25, first: "დავით", last: "ხოჭოლავა", pos: "df", ageCat: "u17", age: 16, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 26, first: "ჯაბა", last: "კანკავა", pos: "mf", ageCat: "u15", age: 14, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 27, first: "გაბრიელ", last: "სიგუა", pos: "mf", ageCat: "u13", age: 12, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 28, first: "ირაკლი", last: "აზაროვი", pos: "df", ageCat: "u14", age: 13, foot: "მარცხენა", img: "https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 29, first: "ვლადიმერ", last: "მამუჩაშვილი", pos: "mf", ageCat: "u16", age: 15, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&h=400&q=80" },
    { id: 30, first: "როინ", last: "კვასხვაძე", pos: "gk", ageCat: "u12", age: 11, foot: "მარჯვენა", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&h=400&q=80" }
  ];

  const clubCycle = [
    { team: "დინამო თბილისი", city: "თბილისი" },
    { team: "დინამო ბათუმი", city: "ბათუმი" },
    { team: "იბერია 1999", city: "თბილისი" },
    { team: "ტორპედო ქუთაისი", city: "ქუთაისი" },
    { team: "საბურთალო", city: "თბილისი" },
    { team: "რუსთავი", city: "რუსთავი" },
    { team: "სამგურალი", city: "წყალტუბო" },
    { team: "დილა", city: "გორი" }
  ];

  const positionLabels = {
    gk: "მეკარე",
    df: "დამცველი",
    mf: "ნახევარმცველი",
    fw: "თავდამსხმელი"
  };

  const summaryByPosition = {
    gk: "რეაქცია, სეივი და პირველი პასი.",
    df: "ორთაბრძოლა, პოზიციონირება და ბალანსი.",
    mf: "ტემპის კონტროლი, ხედვა და გადაწყვეტილება.",
    fw: "ფინიში, მოძრაობა და სივრცის გამოყენება."
  };

  const detailedClubOverrides = {
    1: { team: "დინამო თბილისი", city: "თბილისი" },
    2: { team: "იბერია 1999", city: "თბილისი" },
    5: { team: "რუსთავი", city: "რუსთავი" },
    6: { team: "დინამო თბილისი", city: "თბილისი" },
    7: { team: "იბერია 1999", city: "თბილისი" },
    8: { team: "ტორპედო ქუთაისი", city: "ქუთაისი" },
    10: { team: "სამგურალი", city: "წყალტუბო" },
    15: { team: "საბურთალო", city: "თბილისი" },
    17: { team: "დილა", city: "გორი" },
    26: { team: "დინამო ბათუმი", city: "ბათუმი" },
    28: { team: "დინამო ბათუმი", city: "ბათუმი" }
  };

  const lineupPlan = [
    { slot: "gk", id: 6, role: "GK", note: "კვირის სეივების ლიდერი" },
    { slot: "rb", id: 7, role: "RB", note: "სისწრაფე და დისციპლინა" },
    { slot: "rcb", id: 8, role: "CB", note: "დაცვის ლიდერი" },
    { slot: "lcb", id: 15, role: "CB", note: "ძლიერი ორთაბრძოლა" },
    { slot: "lb", id: 28, role: "LB", note: "აქტიური ფლანგი" },
    { slot: "rcm", id: 26, role: "CM", note: "ტემპის კონტროლი" },
    { slot: "cm", id: 17, role: "CM", note: "კვირის ბალანსი ცენტრში" },
    { slot: "lcm", id: 10, role: "AM", note: "ხედვა და პასი" },
    { slot: "rw", id: 2, role: "RW", note: "1v1 და ფანტაზია" },
    { slot: "st", id: 1, role: "ST", note: "კვირის ფინიშერი" },
    { slot: "lw", id: 5, role: "LW", note: "სისწრაფე და შეტევა" }
  ];

  const playersDirectory = rawPlayers.map((player, index) => {
    const fallbackClub = clubCycle[index % clubCycle.length];
    const overrideClub = detailedClubOverrides[player.id] || {};
    const team = overrideClub.team || fallbackClub.team;
    const city = overrideClub.city || fallbackClub.city;

    return {
      ...player,
      name: `${player.first} ${player.last}`,
      team: team,
      city: city,
      posLabel: positionLabels[player.pos] || "მოთამაშე",
      summary: summaryByPosition[player.pos] || "პერსპექტიული მოთამაშე.",
      categoryLabel: String(player.ageCat || "").toUpperCase(),
      profileTitle: `${player.first} ${player.last} • ${(positionLabels[player.pos] || "მოთამაშე").toLowerCase()}`
    };
  });

  const playersById = Object.fromEntries(
    playersDirectory.map((player) => [String(player.id), player])
  );

  const featuredLineup = lineupPlan
    .map((item) => {
      const player = playersById[String(item.id)];
      if (!player) {
        return null;
      }

      return {
        ...item,
        player: player
      };
    })
    .filter(Boolean);

  window.playersDirectory = playersDirectory;
  window.playersById = playersById;
  window.featuredLineup = featuredLineup;
  window.getPlayerById = function (id) {
    return playersById[String(id)] || null;
  };
})();
