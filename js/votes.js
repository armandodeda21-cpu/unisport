// js/votes.js
// -------------------------------------------------------
// Client-side vote tracking using localStorage.
//
// We store a Set of strings like "gameId:optionIndex" so a
// user can only vote on each time-option once per browser.
// No authentication required.
//
// Storage key: "css_voted_options"
// -------------------------------------------------------

const STORAGE_KEY = 'css_voted_options';

/**
 * Loads the voted set from localStorage.
 * @returns {Set<string>}
 */
function loadVoted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/**
 * Persists the voted set back to localStorage.
 * @param {Set<string>} set
 */
function saveVoted(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

/**
 * Returns true if the user has already voted for this option.
 * @param {string} gameId
 * @param {number} optionIndex
 */
export function hasVoted(gameId, optionIndex) {
  return loadVoted().has(`${gameId}:${optionIndex}`);
}

/**
 * Records that the user voted for this option.
 * @param {string} gameId
 * @param {number} optionIndex
 */
export function recordVote(gameId, optionIndex) {
  const set = loadVoted();
  set.add(`${gameId}:${optionIndex}`);
  saveVoted(set);
}

/**
 * Removes a single vote record so the user can vote again.
 * Called when the user clicks "Unvote".
 * @param {string} gameId
 * @param {number} optionIndex
 */
export function removeVote(gameId, optionIndex) {
  const set = loadVoted();
  set.delete(`${gameId}:${optionIndex}`);
  saveVoted(set);
}

/**
 * Clears ALL stored votes (called after a weekly reset).
 * Not currently wired automatically — call manually if needed.
 */
export function clearAllVotes() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}