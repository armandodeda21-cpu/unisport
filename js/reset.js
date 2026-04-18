// js/reset.js
// -------------------------------------------------------
// Lazy weekly reset logic.
//
// Strategy:
//   - A row in the `config` table stores key='lastReset' with
//     a timestamp value.
//   - On each page load we fetch that timestamp and compare it
//     to the most recent Sunday 00:00 UTC.
//   - If lastReset is BEFORE the most recent Sunday, we:
//       1. Try to claim the reset via an optimistic-lock UPDATE
//          (only update WHERE last_reset < newSunday to prevent
//           race conditions when two tabs open at once).
//       2. Zero-out all vote counts.
//   - Returns true when a reset was performed (so UI can show banner).
// -------------------------------------------------------

import { supabase } from './supabase.js';

/**
 * Returns the UTC timestamp (ms) of the most recent Sunday at 00:00.
 */
function lastSundayMidnightUTC() {
  const now  = new Date();
  const day  = now.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day * 86_400_000 + now.getUTCHours() * 3_600_000
             + now.getUTCMinutes() * 60_000 + now.getUTCSeconds() * 1_000
             + now.getUTCMilliseconds();
  return new Date(now.getTime() - diff).getTime(); // ms since epoch
}

/**
 * Runs the lazy weekly reset check.
 * Call once on page load.
 * @returns {Promise<boolean>} true if a reset was performed this load
 */
export async function checkAndRunWeeklyReset() {
  const newSunday = lastSundayMidnightUTC();
  const newSundayISO = new Date(newSunday).toISOString();

  // 1. Fetch current lastReset from config table
  const { data: cfg, error: cfgErr } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'lastReset')
    .single();

  if (cfgErr) {
    // Row may not exist yet — treat as never reset
    console.warn('checkAndRunWeeklyReset: config fetch error', cfgErr.message);
  }

  const lastReset = cfg?.value ? new Date(cfg.value).getTime() : 0;

  // 2. If last reset is already this week (or future), nothing to do
  if (lastReset >= newSunday) return false;

  // 3. Optimistic-lock: only update the row if it hasn't been updated yet
  //    (prevents double-reset when two browser tabs race each other)
  const { data: updated, error: updateErr } = await supabase
    .from('config')
    .update({ value: newSundayISO })
    .eq('key', 'lastReset')
    .lt('value', newSundayISO)   // <-- only if still stale
    .select();

  if (updateErr) {
    console.error('checkAndRunWeeklyReset: update error', updateErr.message);
    return false;
  }

  // If another tab won the race, updated will be empty
  if (!updated || updated.length === 0) return false;

  // 4. We won the race — reset all vote counts to 0
  await resetAllVotes();

  return true;
}

/**
 * Sets votes to 0 for every time option in every game.
 * Uses a stored Postgres function for atomicity (see SETUP.md).
 */
async function resetAllVotes() {
  const { error } = await supabase.rpc('reset_all_votes');
  if (error) console.error('resetAllVotes RPC error:', error.message);
}
