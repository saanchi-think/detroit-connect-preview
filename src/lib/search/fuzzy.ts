const SEARCH_STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "at",
  "be",
  "can",
  "detroit",
  "does",
  "find",
  "for",
  "from",
  "help",
  "how",
  "i",
  "in",
  "is",
  "it",
  "looking",
  "me",
  "my",
  "need",
  "of",
  "someone",
  "that",
  "the",
  "this",
  "to",
  "want",
  "we",
  "what",
  "where",
  "who",
  "with",
  "you",
  "your",
]);

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeFuzzySearch(value: string) {
  const tokens = normalizeSearchText(value)
    .split(/[\s-]+/)
    .filter(Boolean);
  const meaningful = tokens.filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token));
  return meaningful.length > 0 ? meaningful : tokens;
}

function allowedDistance(length: number) {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  if (length <= 10) return 2;
  return 3;
}

function boundedDamerauLevenshtein(left: string, right: string, limit: number) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  const matrix = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let row = 0; row <= left.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= right.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= left.length; row += 1) {
    let rowMinimum = limit + 1;

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      let distance = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distance = Math.min(distance, matrix[row - 2][column - 2] + 1);
      }

      matrix[row][column] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > limit && row > right.length + limit) return limit + 1;
  }

  return matrix[left.length][right.length];
}

export function fuzzyTokenScore(queryToken: string, candidateToken: string) {
  const query = normalizeSearchText(queryToken);
  const candidate = normalizeSearchText(candidateToken);

  if (!query || !candidate) return Number.POSITIVE_INFINITY;
  if (query === candidate) return 0;
  if (query.length >= 3 && candidate.startsWith(query)) return 0.2;
  if (query.length >= 3 && candidate.includes(query)) return 0.35;

  const distanceLimit = allowedDistance(query.length);
  if (distanceLimit === 0) return Number.POSITIVE_INFINITY;

  const distance = boundedDamerauLevenshtein(query, candidate, distanceLimit);
  return distance <= distanceLimit
    ? 1 + distance / Math.max(query.length, candidate.length)
    : Number.POSITIVE_INFINITY;
}

export function fuzzySearchScore(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedText = normalizeSearchText(values.filter(Boolean).join(" "));

  if (!normalizedQuery) return 0;
  if (!normalizedText) return Number.POSITIVE_INFINITY;
  if (normalizedText === normalizedQuery) return 0;
  if (normalizedText.includes(normalizedQuery)) return 0.1;

  const queryTokens = tokenizeFuzzySearch(normalizedQuery);
  const candidateTokens = tokenizeFuzzySearch(normalizedText);
  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let total = 0;

  for (const queryToken of queryTokens) {
    let best = Number.POSITIVE_INFINITY;

    for (const candidateToken of candidateTokens) {
      best = Math.min(best, fuzzyTokenScore(queryToken, candidateToken));
      if (best === 0) break;
    }

    if (!Number.isFinite(best)) return Number.POSITIVE_INFINITY;
    total += best;
  }

  return total / queryTokens.length;
}

export function matchesFuzzySearch(
  query: string,
  values: Array<string | null | undefined>,
) {
  return Number.isFinite(fuzzySearchScore(query, values));
}
