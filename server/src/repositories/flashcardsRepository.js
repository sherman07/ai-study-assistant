import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { randomId } from "../utils/ids.js";
import {
  allowedValue,
  cleanString,
  firstValue,
  intValue,
  jsonValue,
  limitValue,
  nullableString
} from "../utils/validators.js";

function mapDeck(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    generatedContentId: row.generated_content_id || "",
    studyRoomId: row.study_room_id || "",
    title: row.title || "Flashcards",
    language: row.language || "",
    settings: jsonValue(row.settings_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCard(row = {}) {
  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front || "",
    back: row.back || "",
    hint: row.hint || "",
    sourceReference: row.source_reference || "",
    difficulty: row.difficulty || "",
    tags: jsonValue(row.tags_json, []),
    cardOrder: row.card_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}












async function supabaseDeckRowById(deckId) {
  const rows = await supabaseRequest("GET", "flashcard_decks", {
    query: {
      select: "*",
      id: `eq.${cleanString(deckId, 96)}`,
      limit: 1
    }
  });
  return firstSupabaseRow(rows);
}

async function supabaseUserOwnsDeck(userId, deckId) {
  const row = await supabaseDeckRowById(deckId);
  return Boolean(row && row.user_id === userId);
}

async function supabaseCreateDeck(userId, payload = {}) {
  const id = cleanString(payload.id, 96) || randomId("deck");
  const existing = payload.id ? await supabaseDeckRowById(id) : null;
  if (existing && existing.user_id !== userId) {
    const error = new Error("Flashcard deck id is not available.");
    error.status = 403;
    throw error;
  }
  const saved = await supabaseRequest("POST", "flashcard_decks", {
    query: { on_conflict: "id" },
    body: [supabaseDeckRow(userId, payload, id)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  if (Array.isArray(payload.cards)) {
    for (let index = 0; index < payload.cards.length; index += 1) {
      await supabaseCreateCard(userId, { ...payload.cards[index], deckId: id, cardOrder: index });
    }
  }
  const savedRow = firstSupabaseRow(saved);
  if (!savedRow) return supabaseGetDeck(userId, id, { includeCards: true });
  const deck = mapDeck(savedRow);
  deck.cards = await supabaseListCards(userId, id, 500);
  return deck;
}

async function supabaseListDecks(userId, limit = 50) {
  const safeLimit = limitValue(limit);
  const rows = await supabaseRequest("GET", "flashcard_decks", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  return Array.isArray(rows) ? rows.map(mapDeck) : [];
}

async function supabaseGetDeck(userId, deckId, { includeCards = false } = {}) {
  const rows = await supabaseRequest("GET", "flashcard_decks", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(deckId, 96)}`,
      limit: 1
    }
  });
  const row = firstSupabaseRow(rows);
  if (!row) return null;
  const deck = mapDeck(row);
  if (includeCards) deck.cards = await supabaseListCards(userId, deck.id, 500);
  return deck;
}

async function supabasePatchDeck(userId, deckId, patch = {}) {
  const current = await supabaseGetDeck(userId, deckId);
  if (!current) return null;
  return supabaseCreateDeck(userId, { ...current.settings, ...current, ...patch, id: current.id });
}

async function supabaseDeleteDeck(userId, deckId) {
  const rows = await supabaseRequest("DELETE", "flashcard_decks", {
    query: {
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(deckId, 96)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}

async function supabaseCardRowById(cardId) {
  const rows = await supabaseRequest("GET", "flashcards", {
    query: {
      select: "*",
      id: `eq.${cleanString(cardId, 96)}`,
      limit: 1
    }
  });
  return firstSupabaseRow(rows);
}

async function supabaseCreateCard(userId, payload = {}) {
  const deckId = cleanString(firstValue(payload, ["deck_id", "deckId"]), 96);
  if (!deckId || !(await supabaseUserOwnsDeck(userId, deckId))) return null;
  const id = cleanString(payload.id, 96) || randomId("card");
  const existing = await supabaseCardRowById(id);
  if (existing) {
    const existingDeck = await supabaseDeckRowById(existing.deck_id);
    if (!existingDeck || existingDeck.user_id !== userId) {
      const error = new Error("Flashcard id is not available.");
      error.status = 403;
      throw error;
    }
  }
  const saved = await supabaseRequest("POST", "flashcards", {
    query: { on_conflict: "id" },
    body: [supabaseCardRow(payload, id, deckId)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const savedRow = firstSupabaseRow(saved);
  return savedRow ? mapCard(savedRow) : supabaseGetCard(userId, id);
}

async function supabaseDeckIdsForUser(userId, deckId = "") {
  if (deckId) return (await supabaseUserOwnsDeck(userId, deckId)) ? [cleanString(deckId, 96)] : [];
  const decks = await supabaseRequest("GET", "flashcard_decks", {
    query: {
      select: "id",
      user_id: `eq.${cleanString(userId, 80)}`,
      limit: 500
    }
  });
  return (Array.isArray(decks) ? decks : []).map(row => cleanString(row.id, 96)).filter(Boolean);
}

async function supabaseListCards(userId, deckId = "", limit = 200) {
  const safeLimit = limitValue(limit, 200, 500);
  const deckIds = await supabaseDeckIdsForUser(userId, deckId);
  if (!deckIds.length) return [];
  const rows = await supabaseRequest("GET", "flashcards", {
    query: {
      select: "*",
      deck_id: `in.(${deckIds.join(",")})`,
      order: "card_order.asc,created_at.asc",
      limit: safeLimit
    }
  });
  return Array.isArray(rows) ? rows.map(mapCard) : [];
}

async function supabaseGetCard(userId, cardId) {
  const row = await supabaseCardRowById(cardId);
  if (!row || !(await supabaseUserOwnsDeck(userId, row.deck_id))) return null;
  return mapCard(row);
}

async function supabasePatchCard(userId, cardId, patch = {}) {
  const current = await supabaseGetCard(userId, cardId);
  if (!current) return null;
  return supabaseCreateCard(userId, { ...current, ...patch, id: current.id, deckId: current.deckId });
}

async function supabaseDeleteCard(userId, cardId) {
  const row = await supabaseCardRowById(cardId);
  if (!row || !(await supabaseUserOwnsDeck(userId, row.deck_id))) return false;
  const rows = await supabaseRequest("DELETE", "flashcards", {
    query: { id: `eq.${cleanString(cardId, 96)}` },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}


async function createDeck(userId, payload = {}) {
  return supabaseCreateDeck(userId, payload);
}
async function listDecks(userId, limit = 50) {
  return supabaseListDecks(userId, limit);
}
async function getDeck(userId, deckId, { includeCards = false } = {}) {
  return supabaseGetDeck(userId, deckId, { includeCards });
}
async function patchDeck(userId, deckId, patch = {}) {
  return supabasePatchDeck(userId, deckId, patch);
}
async function deleteDeck(userId, deckId) {
  return supabaseDeleteDeck(userId, deckId);
}
async function createCard(userId, payload = {}) {
  return supabaseCreateCard(userId, payload);
}
async function listCards(userId, deckId = "", limit = 200) {
  return supabaseListCards(userId, deckId, limit);
}
async function getCard(userId, cardId) {
  return supabaseGetCard(userId, cardId);
}
async function patchCard(userId, cardId, patch = {}) {
  return supabasePatchCard(userId, cardId, patch);
}
async function deleteCard(userId, cardId) {
  return supabaseDeleteCard(userId, cardId);
}
export {
  createCard,
  createDeck,
  deleteCard,
  deleteDeck,
  getCard,
  getDeck,
  listCards,
  listDecks,
  patchCard,
  patchDeck
};
