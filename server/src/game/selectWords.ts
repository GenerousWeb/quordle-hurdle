export function selectWords(pool: Set<string>, usedWords: Set<string>, count: number): string[] {
  const available = Array.from(pool).filter((w) => !usedWords.has(w));
  const result: string[] = [];
  const selected = new Set<string>();
  const target = Math.min(count, available.length);

  while (result.length < target) {
    const idx = Math.floor(Math.random() * available.length);
    const word = available[idx];
    if (word && !selected.has(word)) {
      result.push(word);
      selected.add(word);
    }
  }
  return result;
}
