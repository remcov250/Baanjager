// Status notes grow as a log: the newest line first, older lines kept below.
// Kept apart from server.mjs so a test can load it without starting a server.

export const CHECK_PREFIX = "Check";

// Put a dated check line on top of an existing status note without touching
// the rest. A check repeated on the same day with the same text is a no-op,
// so an assistant that retries doesn't stack duplicates.
export function prependCheck(existing, note, day) {
  const line = `${CHECK_PREFIX} ${day}: ${String(note).trim()}`;
  const current = existing ?? "";
  if (current.split("\n")[0] === line) return current;
  return current ? `${line}\n${current}` : line;
}
