// js/games.js
// -------------------------------------------------------
// All Supabase database operations for games.
//
// Data shape (games table):
//   id          uuid (auto)
//   sport       text  ('football' | 'basketball')
//   locationName text
//   lat         float8
//   lng         float8
//   timeOptions jsonb  — array of { time: ISO string, votes: number }
//   expiresAt   timestamptz
//   createdAt   timestamptz (default now())
// -------------------------------------------------------

import { supabase } from './supabase.js';

// ---- Read -----------------------------------------------

/**
 * Fetches all games that have not yet expired, ordered newest first.
 */
export async function fetchActiveGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .gt('expiresAt', new Date().toISOString())
    .order('createdAt', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetches a single game by id.
 */
export async function fetchGame(id) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---- Create ---------------------------------------------

/**
 * Inserts a new game record.
 * @param {object} payload
 * @param {string}   payload.sport
 * @param {string}   payload.locationName
 * @param {number}   payload.lat
 * @param {number}   payload.lng
 * @param {string[]} payload.times  — array of ISO date-time strings
 * @param {string}   payload.expiresAt — ISO date string
 */
export async function createGame({ sport, locationName, lat, lng, times, expiresAt }) {
  // Build time-options array with 0 votes
  const timeOptions = times.map(t => ({ time: t, votes: 0 }));

  const { data, error } = await supabase
    .from('games')
    .insert([{
      sport,
      locationName,
      lat,
      lng,
      timeOptions,
      expiresAt,
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Decrements the vote count for one time option (unvote).
 * Mirrors castVote — fetches current state, decrements, writes back.
 * Vote floor is 0 (cannot go negative).
 *
 * @param {string} gameId
 * @param {number} optionIndex
 * @returns {object} updated game row
 */
export async function removeVote(gameId, optionIndex) {
  const game    = await fetchGame(gameId);
  const options = [...game.timeOptions];

  if (!options[optionIndex]) throw new Error('Invalid option index');

  options[optionIndex] = {
    ...options[optionIndex],
    votes: Math.max(0, (options[optionIndex].votes || 0) - 1),
  };

  const { data, error } = await supabase
    .from('games')
    .update({ timeOptions: options })
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---- Voting ---------------------------------------------

/**
 * Increments the vote count for one time option in a game.
 *
 * Strategy:
 *   - We fetch the current timeOptions array.
 *   - Increment the target index locally.
 *   - Write the whole array back.
 *   This is safe at our scale; for high concurrency use a Postgres function.
 *
 * @param {string} gameId
 * @param {number} optionIndex — index inside timeOptions array
 * @returns {object} updated game row
 */
export async function castVote(gameId, optionIndex) {
  // Fetch current state first
  const game = await fetchGame(gameId);
  const options = [...game.timeOptions];

  if (!options[optionIndex]) throw new Error('Invalid option index');

  // Increment locally
  options[optionIndex] = {
    ...options[optionIndex],
    votes: (options[optionIndex].votes || 0) + 1,
  };

  const { data, error } = await supabase
    .from('games')
    .update({ timeOptions: options })
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}