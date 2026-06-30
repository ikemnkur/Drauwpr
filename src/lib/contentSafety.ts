const CUSS_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'pussy',
  'whore',
  'slut',
];

function maskWord(word: string): string {
  if (word.length <= 2) return '*'.repeat(word.length);
  return `${word[0]}${'*'.repeat(word.length - 2)}${word[word.length - 1]}`;
}

export function censorTitle(title: string, mature = false): string {
  const raw = String(title || '');
  if (!mature) return raw;

  return CUSS_WORDS.reduce((acc, word) => {
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    return acc.replace(pattern, (match) => maskWord(match));
  }, raw);
}

export function isMatureContent(mature?: boolean | number | null): boolean {
  return Boolean(mature);
}
