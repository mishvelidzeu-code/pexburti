
    (async function () {
      const client = window.siteAuth?.getClient ? window.siteAuth.getClient() : null;
      if (!client || !window.siteData?.fetchPublicPlayers || !window.siteData?.fetchCurrentMonthlySnapshot) {
        return;
      }

      const players = await window.siteData.fetchPublicPlayers(client);
      if (!players.length) {
        return;
      }

      const snapshot = await window.siteData.fetchCurrentMonthlySnapshot(client, players);
      if (!snapshot) {
        return;
      }

      function escapeHtml(value) {
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      const summaryText = document.querySelector('.month-squad-card .month-card-summary p');
      const helperText = document.querySelector('.month-squad-expanded .small');
      if (summaryText) {
        summaryText.textContent = `სიმბოლური 11-ეული ჩაკეტილია მიმდინარე ციკლისთვის (${snapshot.cycleStart} - ${snapshot.cycleEnd}) და განახლდება ყოველი თვის 28 რიცხვში.`;
      }
      if (helperText) {
        helperText.textContent = `მოთამაშეზე კლიკით იხსნება მისი პროფილი. მიმდინარე შედეგი ჩაკეტილია ${snapshot.cycleStart}-დან ${snapshot.cycleEnd}-მდე.`;
      }

      const pitchNode = document.querySelector('.weekly-pitch');
      if (pitchNode && Array.isArray(snapshot.lineup) && snapshot.lineup.length) {
        pitchNode.innerHTML = `
          <div class="pitch-lines"></div>
          <div class="pitch-circle"></div>
          <div class="pitch-box top"></div>
          <div class="pitch-box bottom"></div>
          ${snapshot.lineup.map(function (entry) {
            const player = entry.player;
            return `
              <a class="pitch-player ${escapeHtml(entry.slot)}" href="${window.siteData.buildPlayerHref(player.id, 'index.html')}" aria-label="${escapeHtml(player.fullName)}">
                <img src="${escapeHtml(player.photo)}" alt="${escapeHtml(player.fullName)}">
                <div class="pitch-badge">
                  <strong>${escapeHtml(player.fullName)}</strong>
                  <span>${escapeHtml(player.positionCode || 'MF')} • ${escapeHtml(player.ageLabel || 'PRO')}</span>
                </div>
              </a>
            `;
          }).join('')}
        `;
      }

      const topPlayer = snapshot.featuredPlayer;
      if (!topPlayer) {
        return;
      }

      const monthLink = document.querySelector('.month-player-link');
      const monthImage = document.querySelector('.month-player-media img');
      const monthRating = document.querySelector('.month-player-rating strong');
      const monthName = document.querySelector('.month-player-copy h3');
      const monthSubline = document.querySelector('.month-player-subline');
      const monthStats = document.querySelector('.month-player-stats');
      const monthNote = document.querySelector('.month-player-note');
      const monthPrimaryAction = document.querySelector('.month-player-actions .btn.btn-primary');

      const playerHref = window.siteData.buildPlayerHref(topPlayer.id, 'index.html');
      if (monthLink) {
        monthLink.href = playerHref;
        monthLink.setAttribute('aria-label', `${topPlayer.fullName} პროფილი`);
      }
      if (monthImage) {
        monthImage.src = topPlayer.photo;
        monthImage.alt = topPlayer.fullName;
      }
      if (monthRating) {
        monthRating.textContent = String(topPlayer.rating || 0);
      }
      if (monthName) {
        monthName.textContent = topPlayer.fullName;
      }
      if (monthSubline) {
        monthSubline.innerHTML = `
          <span>${escapeHtml(topPlayer.positionLabel || 'მოთამაშე')}</span>
          <div class="pill">${escapeHtml(topPlayer.ageLabel || 'PRO')}</div>
        `;
      }
      if (monthStats) {
        monthStats.innerHTML = `
          <div class="month-player-stat">
            <span>გუნდი</span>
            <strong>${escapeHtml(topPlayer.team || 'უგუნდოდ')}</strong>
          </div>
          <div class="month-player-stat">
            <span>მუშა ფეხი</span>
            <strong>${escapeHtml(topPlayer.foot || 'არ არის მითითებული')}</strong>
          </div>
          <div class="month-player-stat">
            <span>მთლიანი ხმები</span>
            <strong>${escapeHtml(String(topPlayer.votesCount || 0))}</strong>
          </div>
        `;
      }
      if (monthNote) {
        monthNote.textContent = `${topPlayer.fullName} არჩეულია მიმდინარე თვის საუკეთესო ფეხბურთელად. შედეგი ჩაიკეტა ${snapshot.cycleStart}-ზე და შემდეგი განახლება მოხდება შემდეგი თვის 28 რიცხვში.`;
      }
      if (monthPrimaryAction) {
        monthPrimaryAction.href = playerHref;
      }
    })();
  