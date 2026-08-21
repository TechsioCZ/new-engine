const PHRASES: readonly (readonly [string, string])[] = [
  ["doplnok výživy", "doplněk stravy"],
  ["doplnky výživy", "doplňky stravy"],
  ["výživový doplnok", "doplněk stravy"],
  ["odporúčané dávkovanie", "doporučené dávkování"],
  ["spôsob použitia", "způsob použití"],
  ["krajina pôvodu", "země původu"],
  ["uchovávajte mimo dosahu detí", "uchovávejte mimo dosah dětí"],
  ["na suchom a chladnom mieste", "na suchém a chladném místě"],
] as const

const WORDS: Readonly<Record<string, string>> = {
  aj: "také",
  ak: "pokud",
  ako: "jako",
  alebo: "nebo",
  bezprostredne: "bezprostředně",
  chladnom: "chladném",
  dávkovanie: "dávkování",
  detí: "dětí",
  dlhodobo: "dlouhodobě",
  dôležité: "důležité",
  je: "je",
  ktorý: "který",
  ktorá: "která",
  ktoré: "které",
  ktorí: "kteří",
  ľudí: "lidí",
  miesto: "místo",
  mieste: "místě",
  množstvo: "množství",
  môže: "může",
  môžu: "mohou",
  nápoj: "nápoj",
  odporúčame: "doporučujeme",
  odporúčané: "doporučené",
  pokožke: "pokožce",
  podľa: "podle",
  počas: "během",
  použitie: "použití",
  používanie: "používání",
  používajte: "používejte",
  pre: "pro",
  pred: "před",
  priamemu: "přímému",
  prírodná: "přírodní",
  prírodné: "přírodní",
  prírodný: "přírodní",
  pri: "při",
  slnečnému: "slunečnímu",
  starostlivosť: "péče",
  uchovávajte: "uchovávejte",
  upozornenie: "upozornění",
  užívanie: "užívání",
  vďaka: "díky",
  vhodné: "vhodné",
  všetci: "všichni",
  všetko: "vše",
  všetky: "všechny",
  výrobok: "výrobek",
  zdravie: "zdraví",
  zloženie: "složení",
  žiareniu: "záření",
}

const preserveCase = (source: string, translated: string) => {
  if (source === source.toLocaleUpperCase("sk-SK")) {
    return translated.toLocaleUpperCase("cs-CZ")
  }
  if (source[0] === source[0]?.toLocaleUpperCase("sk-SK")) {
    return `${translated[0]?.toLocaleUpperCase("cs-CZ") ?? ""}${translated.slice(1)}`
  }
  return translated
}

const translateText = (source: string) => {
  let translated = source
  for (const [from, to] of PHRASES) {
    translated = translated
      .replaceAll(from, to)
      .replaceAll(
        `${from[0]?.toLocaleUpperCase("sk-SK")}${from.slice(1)}`,
        `${to[0]?.toLocaleUpperCase("cs-CZ")}${to.slice(1)}`
      )
  }
  translated = translated.replace(/[\p{L}]+/gu, (word) => {
    const replacement = WORDS[word.toLocaleLowerCase("sk-SK")]
    return replacement ? preserveCase(word, replacement) : word
  })
  return translated
    .replaceAll("ľ", "l")
    .replaceAll("Ľ", "L")
    .replaceAll("ĺ", "l")
    .replaceAll("Ĺ", "L")
    .replaceAll("ŕ", "r")
    .replaceAll("Ŕ", "R")
    .replaceAll("ô", "ů")
    .replaceAll("Ô", "Ů")
    .replaceAll("ä", "e")
    .replaceAll("Ä", "E")
}

/**
 * Produces deterministic, test-only Czech copy while leaving HTML tags and
 * their attributes byte-identical. It is deliberately not publication-grade.
 */
export const buildTemporaryCzechTranslation = (
  source: string | null | undefined
): string | null => {
  if (!source?.trim()) {
    return null
  }
  return source
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") ? part : translateText(part)))
    .join("")
}
