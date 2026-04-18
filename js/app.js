// js/app.js  v2
import { checkAndRunWeeklyReset }     from './reset.js';
import { fetchActiveGames, fetchGame, createGame, castVote, removeVote as dbRemoveVote } from './games.js';
import { recordVote, removeVote as localRemoveVote } from './votes.js';
import { initCreateMap }              from './map.js';
import {
  renderGamesList, renderDetailModal, updateVoteDisplay,
  showResetBanner, showToast, updateStats, wireFilters, setAllGames,
} from './ui.js';

// ============================================================
// BOOT
// ============================================================

async function boot() {
  const didReset = await checkAndRunWeeklyReset().catch(err => {
    console.error('Reset check failed:', err);
    return false;
  });

  if (didReset) showResetBanner();

  // Wire filter/search UI — callback re-renders with filtered subset
  wireFilters(games => renderGamesList(games, openDetailModal));

  await loadGames();
  wireCreateModal();
  wireDetailModal();
}

// ============================================================
// GAMES LIST
// ============================================================

async function loadGames() {
  try {
    const games = await fetchActiveGames();
    setAllGames(games);          // expose to filter system
    updateStats(games);          // update hero numbers
    renderGamesList(games, openDetailModal);
  } catch (err) {
    document.getElementById('games-list').innerHTML =
      `<div class="empty-state"><span class="empty-state-icon">⚠️</span><div class="empty-state-title">Could not load games</div><p>${err.message}</p></div>`;
    console.error('loadGames error:', err);
  }
}

// ============================================================
// CREATE GAME MODAL
// ============================================================

let createMap = null;

function wireCreateModal() {
  const overlay   = document.getElementById('modal-overlay');
  const btnOpen   = document.getElementById('btn-open-modal');
  const btnClose  = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel-modal');
  const btnSubmit = document.getElementById('btn-submit-game');

  btnOpen.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    if (!createMap) {
      createMap = initCreateMap(handleLocationSelect);
    } else {
      setTimeout(() => createMap.invalidateSize(), 100);
    }
  });

  const closeModal = () => overlay.classList.add('hidden');
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  document.querySelectorAll('.sport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('selected-sport').value = btn.dataset.sport;
    });
  });

  btnSubmit.addEventListener('click', handleCreateGame);
}

function handleLocationSelect({ name, lat, lng }) {
  document.getElementById('selected-location-name').value = name;
  document.getElementById('selected-location-lat').value  = lat;
  document.getElementById('selected-location-lng').value  = lng;
  const display = document.getElementById('location-display');
  display.textContent = `📍 ${name}`;
  display.classList.add('selected');
}

async function handleCreateGame() {
  const sport     = document.getElementById('selected-sport').value;
  const locName   = document.getElementById('selected-location-name').value;
  const lat       = parseFloat(document.getElementById('selected-location-lat').value);
  const lng       = parseFloat(document.getElementById('selected-location-lng').value);
  const expiresAt = document.getElementById('expires-at').value;
  const times     = [...document.querySelectorAll('.time-input')].map(el => el.value).filter(Boolean);

  if (!locName)          return showToast('Please select a location on the map.', 'error');
  if (times.length < 2)  return showToast('Please enter at least 2 time options.', 'error');
  if (!expiresAt)        return showToast('Please set an expiry date.', 'error');

  const btn = document.getElementById('btn-submit-game');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  try {
    await createGame({ sport, locationName: locName, lat, lng, times, expiresAt });
    document.getElementById('modal-overlay').classList.add('hidden');
    resetCreateForm();
    showToast('Game created! 🎉', 'success');
    await loadGames();
  } catch (err) {
    showToast(`Failed to create game: ${err.message}`, 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Game';
  }
}

function resetCreateForm() {
  document.querySelectorAll('.time-input').forEach(el => (el.value = ''));
  document.getElementById('expires-at').value = '';
  document.getElementById('selected-location-name').value = '';
  document.getElementById('selected-location-lat').value  = '';
  document.getElementById('selected-location-lng').value  = '';
  const display = document.getElementById('location-display');
  display.textContent = 'No location selected';
  display.classList.remove('selected');
  document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-sport="football"]').classList.add('active');
  document.getElementById('selected-sport').value = 'football';
}

// ============================================================
// DETAIL + VOTING MODAL
// ============================================================

function wireDetailModal() {
  const overlay  = document.getElementById('detail-overlay');
  const btnClose = document.getElementById('btn-close-detail');
  const closeDetail = () => overlay.classList.add('hidden');
  btnClose.addEventListener('click', closeDetail);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDetail(); });
}

async function openDetailModal(gameId) {
  try {
    const game = await fetchGame(gameId);
    renderDetailModal(game, handleVote, handleUnvote);
  } catch (err) {
    showToast(`Could not load game: ${err.message}`, 'error');
  }
}

async function handleVote(gameId, optionIndex) {
  try {
    const updatedGame = await castVote(gameId, optionIndex);
    recordVote(gameId, optionIndex);
    updateVoteDisplay(updatedGame, optionIndex, false);
    showToast('Vote recorded! ⚡', 'success');
    loadGames();
  } catch (err) {
    showToast(`Vote failed: ${err.message}`, 'error');
    console.error('handleVote error:', err);
  }
}

async function handleUnvote(gameId, optionIndex) {
  try {
    const updatedGame = await dbRemoveVote(gameId, optionIndex);
    localRemoveVote(gameId, optionIndex);
    updateVoteDisplay(updatedGame, optionIndex, true);
    showToast('Vote removed.', 'info');
    loadGames();
  } catch (err) {
    showToast(`Unvote failed: ${err.message}`, 'error');
    console.error('handleUnvote error:', err);
  }
}

boot();