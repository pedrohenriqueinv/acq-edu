/**
 * Sanitizador de texto para compatibilidade com sistemas ASP legados.
 * Garante que nenhum caractere especial quebre o banco de dados do GEMUL.
 */

const REPLACEMENTS: [RegExp, string][] = [
  // Aspas tipográficas curvas para aspas padrão
  [/[\u201C\u201D\u201E\u201F\u275D\u275E]/g, '"'],
  [/[\u2018\u2019\u201A\u201B\u275B\u275C]/g, "'"],
  // Travessão e meia risca
  [/[\u2013\u2014\u2015]/g, '-'],
  // Reticências
  [/\u2026/g, '...'],
  // Bullet points
  [/[\u2022\u2023\u2043\u204C\u204D]/g, '-'],
  // Remove qualquer caractere fora da faixa Latin-1
  [/[^\x00-\xFF]/g, ''],
];

export function sanitizeText(text: string): string {
  if (!text) return '';

  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // Normaliza linhas, remove espaços redundantes no início/fim de cada linha e quebras excessivas
  return result
    .split('\n')
    .map(line => line.trim().replace(/  +/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeAndTruncate(text: string, maxLength: number): string {
  const sanitized = sanitizeText(text);
  if (sanitized.length <= maxLength) return sanitized;

  const truncated = sanitized.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

export function countChars(text: string): number {
  return sanitizeText(text).length;
}

export function isWithinLimit(text: string, maxLength: number): boolean {
  return countChars(text) <= maxLength;
}

// Limites de caracteres estimados para os campos do GEMUL
export const GEMUL_LIMITS = {
  skills: 1000,
  knowledgeObjects: 1000,
  methodology: 2000,
  evaluation: 1000,
  thematicUnit: 255,
};