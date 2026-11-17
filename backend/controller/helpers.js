const crypto = require("crypto");

/** Adds a string `id` to a lean document so the frontend never has to touch `_id`. */
const withId = (doc) => (doc ? { ...doc, id: String(doc._id) } : doc);
const withIds = (docs) => (docs || []).map(withId);

/** Normalises any date input to midnight UTC so attendance upserts stay stable. */
const dayOnly = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const uniqueCode = (prefix = "INV") =>
  `${prefix}-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

/** Human-friendly temporary password that always satisfies the 8+ character rule. */
const randomPassword = () => {
  const words = ["Robot", "Coder", "Spark", "Build", "Learn", "Bright", "Maker", "Logic"];
  const word = words[crypto.randomInt(words.length)];
  return `${word}@${crypto.randomInt(1000, 9999)}`;
};

const monthRange = (month) => {
  const base = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
  return { start, end };
};

const pct = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

module.exports = { withId, withIds, dayOnly, uniqueCode, randomPassword, monthRange, pct, money };
