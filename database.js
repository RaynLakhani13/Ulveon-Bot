const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function load() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = { editions: {}, entries: {}, rankings: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Editions ──────────────────────────────────────────────────────────────
function createEdition(id, name, year) {
  const db = load();
  db.editions[id] = { id, name, year, createdAt: Date.now() };
  save(db);
  return db.editions[id];
}

function getEdition(id) {
  return load().editions[id] || null;
}

function listEditions() {
  const db = load();
  return Object.values(db.editions).sort((a, b) => a.year - b.year);
}

// ── Entries ───────────────────────────────────────────────────────────────
function addEntry(entryId, editionId, country, artist, song) {
  const db = load();
  if (!db.entries[editionId]) db.entries[editionId] = {};
  db.entries[editionId][entryId] = { entryId, editionId, country, artist, song, addedAt: Date.now() };
  save(db);
  return db.entries[editionId][entryId];
}

function getEntries(editionId) {
  const db = load();
  return Object.values(db.entries[editionId] || {}).sort((a, b) => a.country.localeCompare(b.country));
}

function getEntry(editionId, entryId) {
  const db = load();
  return db.entries[editionId]?.[entryId] || null;
}

function removeEntry(editionId, entryId) {
  const db = load();
  if (!db.entries[editionId]?.[entryId]) return false;
  delete db.entries[editionId][entryId];
  // Also wipe this entry from all rankings for this edition
  for (const userId of Object.keys(db.rankings[editionId] || {})) {
    db.rankings[editionId][userId] = db.rankings[editionId][userId].filter(r => r.entryId !== entryId);
  }
  save(db);
  return true;
}

// ── Rankings ──────────────────────────────────────────────────────────────
/**
 * Set a user's score for a single entry (1–12 scale, Eurovision-style).
 * Replaces any prior score for that entry in that edition.
 */
function setScore(userId, username, editionId, entryId, score) {
  const db = load();
  if (!db.rankings[editionId]) db.rankings[editionId] = {};
  if (!db.rankings[editionId][userId]) db.rankings[editionId][userId] = [];

  const list = db.rankings[editionId][userId];
  const idx = list.findIndex(r => r.entryId === entryId);
  if (idx >= 0) {
    list[idx] = { entryId, score, username, updatedAt: Date.now() };
  } else {
    list.push({ entryId, score, username, updatedAt: Date.now() });
  }
  save(db);
}

function getUserRanking(userId, editionId) {
  const db = load();
  return (db.rankings[editionId]?.[userId] || []).sort((a, b) => b.score - a.score);
}

/**
 * Returns aggregated leaderboard: entries sorted by total points across all voters.
 */
function getLeaderboard(editionId) {
  const db = load();
  const entries = getEntries(editionId);
  const allRankings = db.rankings[editionId] || {};

  const totals = {};
  const voterCounts = {};
  for (const entry of entries) {
    totals[entry.entryId] = 0;
    voterCounts[entry.entryId] = 0;
  }

  for (const userRankings of Object.values(allRankings)) {
    for (const r of userRankings) {
      if (totals[r.entryId] !== undefined) {
        totals[r.entryId] += r.score;
        voterCounts[r.entryId]++;
      }
    }
  }

  return entries
    .map(e => ({
      ...e,
      totalPoints: totals[e.entryId] || 0,
      voterCount: voterCounts[e.entryId] || 0,
      avgScore: voterCounts[e.entryId] ? (totals[e.entryId] / voterCounts[e.entryId]).toFixed(2) : '—',
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

function getVoterCount(editionId) {
  const db = load();
  return Object.keys(db.rankings[editionId] || {}).length;
}

module.exports = {
  createEdition, getEdition, listEditions,
  addEntry, getEntries, getEntry, removeEntry,
  setScore, getUserRanking, getLeaderboard, getVoterCount,
};
