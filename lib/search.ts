function simplify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .replace(/(.)\1+/gu, "$1");
}

function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

function typoDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function rank(query: string, simpleQuery: string, name: string): number | null {
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(/[-_]/).some((word) => word.startsWith(query))) return 2;
  if (name.includes(query)) return 3;
  if (!simpleQuery) return null;

  const simpleName = simplify(name);
  if (simpleName.includes(simpleQuery)) return 4;
  const candidates = [simpleName, ...name.split(/[-_]/).map(simplify)];
  const typos = Math.min(...candidates.map((candidate) => typoDistance(simpleQuery, candidate)));
  return typos <= allowedTypos(simpleQuery.length) ? 4 + typos : null;
}

export function findMatches(query: string, names: string[]): string[] {
  if (!query) return [...names].sort();
  const simpleQuery = simplify(query);
  return names
    .map((name) => ({ name, rank: rank(query, simpleQuery, name) }))
    .filter((match): match is { name: string; rank: number } => match.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .map((match) => match.name);
}
