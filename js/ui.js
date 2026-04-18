// js/ui.js  v2 — redesigned rendering with toasts, share, richer cards
import { hasVoted } from './votes.js';

const SPORT_EMOJI = { football: '⚽', basketball: '🏀' };
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/L4jJdnHg6GoBJQeavJzjZS?mode=gi_t';

// ============================================================
// TOAST SYSTEM
// ============================================================

/**
 * Shows a floating toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms
 */
export function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: '⚡' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ============================================================
// DATE HELPERS
// ============================================================

function fmtDay(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - Date.now()) / 86_400_000);
}

function maxVotes(options) {
  return Math.max(...options.map(o => o.votes || 0), 0);
}

function totalVotes(options) {
  return options.reduce((s, o) => s + (o.votes || 0), 0);
}

// ============================================================
// STATS BAR
// ============================================================

export function updateStats(games) {
  const count   = games.length;
  const votes   = games.reduce((s, g) => s + totalVotes(g.timeOptions || []), 0);
  document.getElementById('stat-games').textContent = count;
  document.getElementById('stat-votes').textContent = votes;
  document.getElementById('games-count').textContent = `${count} game${count !== 1 ? 's' : ''}`;
}

// ============================================================
// FILTER / SEARCH
// ============================================================

let _allGames = [];
let _activeFilter = 'all';
let _searchQuery  = '';

export function wireFilters(onRender) {
  // Filter chips
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      _activeFilter = chip.dataset.filter;
      onRender(applyFilters());
    });
  });

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    _searchQuery = e.target.value.toLowerCase().trim();
    onRender(applyFilters());
  });
}

export function setAllGames(games) {
  _allGames = games;
}

function applyFilters() {
  return _allGames.filter(g => {
    const sportOk  = _activeFilter === 'all' || g.sport === _activeFilter;
    const searchOk = !_searchQuery ||
      g.sport.includes(_searchQuery) ||
      (g.locationName || '').toLowerCase().includes(_searchQuery);
    return sportOk && searchOk;
  });
}

// ============================================================
// GAME LIST
// ============================================================

export function renderGamesList(games, onCardClick) {
  const container = document.getElementById('games-list');
  container.innerHTML = '';

  if (!games || games.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🏟️</span>
        <div class="empty-state-title">No games yet</div>
        <p>Be the first to schedule one — hit <strong>New Game</strong> above!</p>
      </div>`;
    return;
  }

  games.forEach((game, idx) => {
    const card = buildGameCard(game);
    card.style.animationDelay = `${idx * 55}ms`;
    card.addEventListener('click', () => onCardClick(game.id));
    container.appendChild(card);
  });
}

function buildGameCard(game) {
  const opts    = game.timeOptions || [];
  const top     = maxVotes(opts);
  const leading = opts.reduce((b, o) => (o.votes >= b.votes ? o : b), opts[0] || { time: null, votes: 0 });
  const days    = daysUntil(game.expiresAt);
  const urgent  = days !== null && days <= 2;

  const card = document.createElement('article');
  card.className = 'game-card';
  card.dataset.sport = game.sport;

  card.innerHTML = `
    <div class="card-body">
      <div class="card-top">
        <span class="sport-pill ${game.sport}">
          ${SPORT_EMOJI[game.sport] || '🏅'} ${game.sport}
        </span>
        <div class="card-badges">
          <span class="card-expiry ${urgent ? 'urgent' : ''}">
            ${urgent ? '🔥 ' : ''}${days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `Exp. ${fmtDate(game.expiresAt)}`}
          </span>
        </div>
      </div>

      <div class="card-location">
        <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 0C3.24 0 1 2.24 1 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/></svg>
        ${game.locationName}
      </div>

      <div class="card-votes">
        ${opts.map(o => {
          const pct = top > 0 ? Math.round((o.votes / top) * 100) : 0;
          const isLead = top > 0 && o.votes === top;
          return `
            <div class="vote-row ${isLead ? 'leading' : ''}">
              <span class="vote-row-label">${fmtDateTime(o.time)}</span>
              <span class="vote-row-count">${o.votes || 0}</span>
              <div class="vote-bar-track">
                <div class="vote-bar-fill" style="width:${pct}%"></div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card-footer">
      <span class="card-footer-leading">
        ${leading.time
          ? `⭐ <strong>${fmtDateTime(leading.time)}</strong> is leading`
          : 'No votes yet — be first!'
        }
      </span>
      <span class="card-cta">Vote →</span>
    </div>`;

  return card;
}

// ============================================================
// DETAIL MODAL
// ============================================================

let _detailMap = null;

export function renderDetailModal(game, onVote, onUnvote) {
  const body = document.getElementById('detail-body');
  const opts = game.timeOptions || [];

  body.innerHTML = `
    <!-- Hero -->
    <div class="detail-hero">
      <div class="detail-sport-icon ${game.sport}">${SPORT_EMOJI[game.sport] || '🏅'}</div>
      <div class="detail-hero-info">
        <div class="detail-hero-sport">${game.sport.charAt(0).toUpperCase() + game.sport.slice(1)}</div>
        <div class="detail-hero-loc">
          <svg width="11" height="13" viewBox="0 0 12 14" fill="none"><path d="M6 0C3.24 0 1 2.24 1 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/></svg>
          ${game.locationName} &nbsp;·&nbsp; Exp. ${fmtDate(game.expiresAt)}
        </div>
      </div>
    </div>

    <!-- Share / actions -->
    <div class="detail-actions">
      <button class="btn-share" id="btn-share-game">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share Game
      </button>
    </div>

    <!-- Location map -->
    <div class="form-group">
      <div class="detail-section-label">📍 Location</div>
      <div id="detail-map" class="detail-map"></div>
    </div>

    <!-- Vote options -->
    <div class="form-group">
      <div class="detail-section-label">🗳️ Vote for a time</div>
      <p class="vote-hint">Tap to vote · Tap again to unvote · One vote per option per device</p>
      <div class="vote-options-list" id="vote-list">
        ${opts.map((o, idx) => {
          const voted = hasVoted(game.id, idx);
          return `
            <div class="vote-option-item ${voted ? 'voted' : ''}" id="opt-${idx}">
              <div class="vote-time-block">
                <div class="vote-time-day">${fmtDay(o.time)}</div>
                <div class="vote-time-main">${fmtTime(o.time)}</div>
              </div>
              <span class="vote-count-badge" id="count-${idx}">${o.votes || 0}</span>
              <button
                class="btn-vote ${voted ? 'voted' : ''}"
                data-game="${game.id}"
                data-idx="${idx}"
                data-voted="${voted ? '1' : '0'}"
              >${voted ? '✓ Unvote' : 'Vote'}</button>
            </div>`;
        }).join('')}
      </div>
    </div>

    <!-- WhatsApp -->
    <div class="whatsapp-section">
      <div class="detail-section-label">💬 Got suggestions?</div>
      <p class="vote-hint">Join the group chat to suggest new times, locations or sports.</p>
      <a class="btn-whatsapp" href="${WHATSAPP_GROUP_URL}" target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Join WhatsApp Group
      </a>
    </div>
  `;

  // Wire vote / unvote buttons
  body.querySelectorAll('.btn-vote').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx   = parseInt(btn.dataset.idx, 10);
      const voted = btn.dataset.voted === '1';
      btn.disabled = true;
      btn.textContent = '…';
      if (voted) await onUnvote(game.id, idx);
      else       await onVote(game.id, idx);
    });
  });

  // Share button — Web Share API with clipboard fallback
  document.getElementById('btn-share-game')?.addEventListener('click', () => {
    const text = `🏅 ${game.sport} @ ${game.locationName} — vote for a time!`;
    const url  = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Campus Sports Game', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`)
        .then(() => showToast('Link copied to clipboard!', 'success'))
        .catch(() => showToast('Could not copy link', 'error'));
    }
  });

  // Show modal
  document.getElementById('detail-title').textContent =
    `${SPORT_EMOJI[game.sport] || ''} ${game.sport.charAt(0).toUpperCase() + game.sport.slice(1)}`;
  document.getElementById('detail-overlay').classList.remove('hidden');

  // Init map after modal is visible
  requestAnimationFrame(() => initDetailMap(game.lat, game.lng, game.locationName));
}

function initDetailMap(lat, lng, name) {
  if (_detailMap) { _detailMap.remove(); _detailMap = null; }

  // Clean up old "open in maps" link if any
  document.querySelectorAll('.open-in-maps').forEach(el => el.remove());

  _detailMap = L.map('detail-map', {
    zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, touchZoom: false, keyboard: false,
  }).setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 19,
  }).addTo(_detailMap);

  const icon = L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:#e8ff47;border:3px solid #080a10;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 12px rgba(232,255,71,0.5)"></div>`,
    iconSize: [32, 32], iconAnchor: [16, 32],
  });

  L.marker([lat, lng], { icon })
    .addTo(_detailMap)
    .bindPopup(`<strong>${name}</strong>`)
    .openPopup();

  const mapEl = document.getElementById('detail-map');
  const link  = document.createElement('a');
  link.className   = 'open-in-maps';
  link.href        = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  link.target      = '_blank';
  link.rel         = 'noopener noreferrer';
  link.innerHTML   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Open in OpenStreetMap`;
  mapEl.insertAdjacentElement('afterend', link);
}

// ============================================================
// VOTE DISPLAY UPDATE
// ============================================================

export function updateVoteDisplay(game, optionIndex, isUnvote = false) {
  const opts    = game.timeOptions || [];
  const count   = opts[optionIndex]?.votes || 0;
  const countEl = document.getElementById(`count-${optionIndex}`);
  const btn     = document.querySelector(`[data-idx="${optionIndex}"]`);
  const item    = document.getElementById(`opt-${optionIndex}`);

  if (countEl) countEl.textContent = count;

  if (isUnvote) {
    if (btn)  { btn.textContent = 'Vote'; btn.classList.remove('voted'); btn.dataset.voted = '0'; btn.disabled = false; }
    if (item) item.classList.remove('voted');
  } else {
    if (btn)  { btn.textContent = '✓ Unvote'; btn.classList.add('voted'); btn.dataset.voted = '1'; btn.disabled = false; }
    if (item) item.classList.add('voted');
  }
}

// ============================================================
// MISC
// ============================================================

export function showResetBanner() {
  const b = document.getElementById('reset-banner');
  b.classList.remove('hidden');
  setTimeout(() => b.classList.add('hidden'), 6000);
}