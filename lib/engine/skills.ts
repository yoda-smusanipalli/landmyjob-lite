import rawDictionary from "@/data/skills-dictionary.json";

export interface DictionaryEntry {
  skill: string;
  aliases: string[];
  category: string;
  caseSensitive?: boolean;
}

export interface SkillHit {
  skill: string;
  /** Character offset of the first match in the searched text. */
  index: number;
  /** Offset just past the first match. */
  end: number;
}

interface CompiledEntry {
  skill: string;
  patterns: RegExp[];
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/**
 * An alias matches only as a whole token: not preceded by a letter, digit, "+", "#" or "."
 * (so "js" doesn't match inside "Node.js") and not followed by a letter, digit, "+" or "#".
 */
function compile(entries: DictionaryEntry[]): CompiledEntry[] {
  return entries.map((e) => ({
    skill: e.skill,
    patterns: e.aliases.map(
      (alias) =>
        new RegExp(`(?<![A-Za-z0-9+#.])${escapeRegex(alias)}(?![A-Za-z0-9+#])`, e.caseSensitive ? "g" : "gi"),
    ),
  }));
}

const DEFAULT_DICTIONARY = compile((rawDictionary as { skills: DictionaryEntry[] }).skills);

export function compileDictionary(entries: DictionaryEntry[]) {
  return compile(entries);
}

/** Finds every dictionary skill in `text`, one hit per skill at its earliest position, sorted by position. */
export function findSkills(text: string, dictionary: CompiledEntry[] = DEFAULT_DICTIONARY): SkillHit[] {
  const hits: SkillHit[] = [];
  for (const entry of dictionary) {
    let best: SkillHit | null = null;
    for (const re of entry.patterns) {
      re.lastIndex = 0;
      const m = re.exec(text);
      // Earliest match wins; at the same position, the longest alias ("Tailwind CSS" over "Tailwind").
      if (m && (best === null || m.index < best.index || (m.index === best.index && m[0].length > best.end - best.index))) {
        best = { skill: entry.skill, index: m.index, end: m.index + m[0].length };
      }
    }
    if (best) hits.push(best);
  }
  return hits.sort((a, b) => a.index - b.index);
}

export function skillSet(text: string, dictionary?: CompiledEntry[]): Set<string> {
  return new Set(findSkills(text, dictionary).map((h) => h.skill));
}
