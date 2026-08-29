import type { Discipline, Bimestre } from '../types';

/**
 * Normaliza qualquer variação de nome de disciplina para a chave canônica
 */
export function normalizeDiscipline(input: string): Discipline {
  if (!input) return 'Geografia';
  const clean = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (clean.includes('arte')) return 'Arte';
  if (clean.includes('cien')) return 'Ciencias';
  if (clean.includes('fisic') || clean.includes('edf') || clean.includes('educacao')) return 'Educacao Fisica';
  if (clean.includes('relig') || clean.includes('ensino')) return 'Ensino Religioso';
  if (clean.includes('geo')) return 'Geografia';
  if (clean.includes('hist')) return 'Historia';
  if (clean.includes('port') || clean.includes('lingua')) return 'Lingua Portuguesa';
  if (clean.includes('mat')) return 'Matematica';
  if (clean.includes('prod') || clean.includes('text')) return 'Producao Textual';

  return 'Geografia';
}

/**
 * Normaliza qualquer variação de bimestre ("3º Bimestre", "3 Bimestre", "3", "3°", "III Bimestre", "3ª Etapa") para a chave canônica
 */
export function normalizeBimestre(input: string): Bimestre {
  if (!input) return '3 Bimestre';
  const clean = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1) Numerais arábicos (1, 2, 3, 4) e variações ordinais
  if (clean.includes('1') || /\b1\b|1[oªº]|1\.o|primeir/i.test(clean)) return '1 Bimestre';
  if (clean.includes('2') || /\b2\b|2[oªº]|2\.o|segund/i.test(clean)) return '2 Bimestre';
  if (clean.includes('3') || /\b3\b|3[oªº]|3\.o|3a|terceir/i.test(clean)) return '3 Bimestre';
  if (clean.includes('4') || /\b4\b|4[oªº]|4\.o|4a|quart/i.test(clean)) return '4 Bimestre';

  // 2) Numerais romanos com limites de palavra (\b) para não casar com as letras de palavras como "bimestre"
  if (/\biv\b/i.test(clean)) return '4 Bimestre';
  if (/\biii\b/i.test(clean)) return '3 Bimestre';
  if (/\bii\b/i.test(clean)) return '2 Bimestre';
  if (/\bi\b/i.test(clean)) return '1 Bimestre';

  return '3 Bimestre';
}
