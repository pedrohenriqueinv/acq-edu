import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeText } from './sanitizer';
import { normalizeDiscipline, normalizeBimestre } from './normalizer';
import type { Lesson, Discipline, Bimestre, MatrixSkill } from '../types';

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Consulta dinamicamente a API do Google para descobrir quais modelos estão disponíveis para esta chave de API
 */
export async function listAvailableModels(apiKey: string): Promise<string[]> {
  const cleanKey = apiKey.trim();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    const data = await res.json();

    if (data.models && Array.isArray(data.models)) {
      return data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
    }
  } catch (err: any) {
    console.warn('[GEMUL AI] Falha ao listar modelos:', err.message);
  }

  return [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-pro'
  ];
}

/**
 * Reparador de JSON ultra-resiliente
 */
function safeParseJsonArray(rawString: string): any[] {
  if (!rawString) return [];

  const directMatch = rawString.match(/\[[\s\S]*\]/);
  if (directMatch) {
    try {
      return JSON.parse(directMatch[0]);
    } catch {}
  }

  const startIdx = rawString.indexOf('[');
  if (startIdx !== -1) {
    const fromStart = rawString.substring(startIdx);
    const lastClosingBrace = fromStart.lastIndexOf('}');
    if (lastClosingBrace !== -1) {
      const repaired = fromStart.substring(0, lastClosingBrace + 1) + ']';
      try {
        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
  }

  const items: any[] = [];
  const objectRegex = /\{[\s\S]*?\}/g;
  let match;
  while ((match = objectRegex.exec(rawString)) !== null) {
    try {
      const item = JSON.parse(match[0]);
      if (item.discipline || item.thematicUnit || item.skillCode) {
        items.push(item);
      }
    } catch {}
  }

  return items;
}

/**
 * Executa chamada direta à API do Google via REST com fallback
 */
async function generateWithFallback(apiKey: string, prompt: string): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Chave de API não informada.');
  }

  const availableModels = await listAvailableModels(cleanKey);
  let lastErrorMsg = '';

  for (const modelName of availableModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 8192,
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        lastErrorMsg = `${data.error.message} (${data.error.status || data.error.code})`;
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err: any) {
      lastErrorMsg = err.message;
    }
  }

  // Fallback via SDK
  try {
    const genAI = new GoogleGenerativeAI(cleanKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (text) return text;
  } catch (err: any) {
    lastErrorMsg = err.message;
  }

  throw new Error(`Erro na API do Gemini: ${lastErrorMsg}`);
}

/**
 * Extrai a Matriz Curricular estruturada a partir do texto bruto de um documento Word/PDF
 */
export async function extractMatrixFromDocument(
  rawText: string,
  apiKey: string,
  onProgress?: (msg: string) => void
): Promise<Omit<MatrixSkill, 'id' | 'createdAt'>[]> {
  onProgress?.('Analisando documento da Matriz Curricular...');

  const groups = [
    {
      name: 'Língua Portuguesa, Matemática e Produção Textual',
      disciplines: ['Lingua Portuguesa', 'Matematica', 'Producao Textual']
    },
    {
      name: 'Ciências, Geografia, História, Arte, Ed. Física e Ens. Religioso',
      disciplines: ['Ciencias', 'Geografia', 'Historia', 'Arte', 'Educacao Fisica', 'Ensino Religioso']
    }
  ];

  const allExtracted: Omit<MatrixSkill, 'id' | 'createdAt'>[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    onProgress?.(`Extraindo disciplinas: ${group.name} (${i + 1}/${groups.length})...`);

    const prompt = `Você é um especialista em Currículo Escolar, BNCC e Documento Curricular de Goiás (DC-GO).

Recebi o documento da MATRIZ CURRICULAR do 1º Ano do Ensino Fundamental.
Extraia TODAS as habilidades, unidades temáticas e objetos de conhecimento/conteúdos EXCLUSIVAMENTE para as seguintes disciplinas:
${group.disciplines.map(d => `- "${d}"`).join('\n')}

DOCUMENTO DA MATRIZ:
"""
${rawText}
"""

Retorne um array JSON com cada habilidade/conteúdo encontrado, seguindo esta estrutura:

[
  {
    "discipline": "Lingua Portuguesa",
    "bimestre": "3 Bimestre",
    "thematicUnit": "Oralidade e Leitura",
    "skillCode": "EF01LP18",
    "skillDescription": "Reconhecer quando uma fala ou texto transmite informações verdadeiras ou fictícias...",
    "knowledgeObjects": "Leitura de textos variados (poemas, contos, parlendas). Compreensão leitora."
  }
]

REGRAS:
1. Extraia o máximo de itens detalhados presentes no documento para essas disciplinas.
2. Mantenha os códigos das habilidades fiéis ao documento.
3. Responda APENAS com o JSON válido.`;

    try {
      const responseText = await generateWithFallback(apiKey, prompt);
      const parsedItems = safeParseJsonArray(responseText);

      for (const item of parsedItems) {
        if (item.thematicUnit || item.skillDescription || item.knowledgeObjects) {
          allExtracted.push({
            discipline: normalizeDiscipline(item.discipline || group.disciplines[0]),
            bimestre: normalizeBimestre(item.bimestre || '3 Bimestre'),
            thematicUnit: sanitizeText(item.thematicUnit || 'Unidade Temática'),
            skillCode: sanitizeText(item.skillCode || 'BNCC'),
            skillDescription: sanitizeText(item.skillDescription || ''),
            knowledgeObjects: sanitizeText(item.knowledgeObjects || ''),
          });
        }
      }
    } catch (err: any) {
      console.warn(`[GEMUL AI] Erro no bloco ${group.name}:`, err);
    }
  }

  if (allExtracted.length === 0) {
    throw new Error('Nenhuma habilidade pôde ser extraída do documento.');
  }

  return allExtracted;
}

export interface GenerateLessonInput {
  discipline: Discipline;
  lessonNumber: number;
  lessonDate: string;
  month: number;
  year: number;
  grade: string;
  classGroup: string;
  bimestre: Bimestre;
  thematicUnit?: string;
  matrixSkills: MatrixSkill[];
  groupIndex: number;
  groupSize: number;
  teacherName: string;
  schoolName: string;
  lessonIndexInMonth?: number;
  totalLessonsInMonth?: number;
}

export interface GeneratedLessonData {
  thematicUnit: string;
  bimestre: Bimestre;
  skills: string;
  knowledgeObjects: string;
  methodology: string;
  evaluation: string;
}

/**
 * Gera o plano completo de UMA aula vinculando obrigatoriamente a habilidade da Matriz Curricular
 */
export async function generateLesson(
  input: GenerateLessonInput,
  apiKey: string
): Promise<GeneratedLessonData> {
  const normDisc = normalizeDiscipline(input.discipline);
  const normBim = normalizeBimestre(input.bimestre);

  // Filtra as habilidades da matriz para esta disciplina e bimestre
  const relevantSkills = input.matrixSkills.filter(
    s => normalizeDiscipline(s.discipline) === normDisc &&
         normalizeBimestre(s.bimestre) === normBim
  );

  // Mapeia o item exato da matriz para esta aula
  const lessonIdx = input.lessonIndexInMonth ?? 0;
  const targetSkill = relevantSkills.length > 0
    ? relevantSkills[lessonIdx % relevantSkills.length]
    : null;

  const thematicUnitBase = targetSkill?.thematicUnit || input.thematicUnit || 'Unidade Temática';
  const skillCodeBase = targetSkill?.skillCode || 'BNCC';
  const skillDescBase = targetSkill ? `${targetSkill.skillCode} - ${targetSkill.skillDescription}` : 'Habilidade BNCC';
  const knowledgeObjBase = targetSkill?.knowledgeObjects || 'Objeto de Conhecimento';

  const sequenceRole = input.groupSize > 1
    ? `\nSEQUÊNCIA DIDÁTICA: Esta é a aula ${input.groupIndex + 1} de ${input.groupSize} aulas seguidas no mesmo dia (${input.lessonDate}).
- Aula 1: Sondagem inicial, sensibilização e introdução do conceito.
- Aula 2: Atividade prática orientada, lúdica ou no livro didático.
- Aula 3: Registro no caderno, sistematização e avaliação formativa.`
    : '';

  const prompt = `Você é uma professora coordenadora de 1º Ano do Ensino Fundamental.
Escreva o plano de aula COMPLETO e DETALHADO da Aula ${input.lessonNumber} de ${input.discipline}.

DADOS OBRIGATÓRIOS DA AULA:
- Professora: ${input.teacherName}
- Escola: ${input.schoolName}
- Disciplina: ${input.discipline}
- Data da Aula: ${input.lessonDate} (${MONTH_NAMES[input.month]}/${input.year})
- Número da Aula: ${input.lessonNumber}
- Turma: ${input.grade} ${input.classGroup} (Matutino)
- Bimestre: ${input.bimestre}
${sequenceRole}

ITEM DA MATRIZ CURRICULAR VINCULADO A ESTA AULA:
- Unidade Temática: ${thematicUnitBase}
- Código & Habilidade: ${skillDescBase}
- Conteúdo / Objeto de Conhecimento: ${knowledgeObjBase}

INSTRUÇÕES DE ESCRITA:
1. "thematicUnit": Use exatamente "${thematicUnitBase}".
2. "skills": Use exatamente "${skillDescBase}".
3. "knowledgeObjects": Use exatamente "${knowledgeObjBase}".
4. "methodology": Escreva o roteiro didático real da aula com os 5 passos pedagógicos abaixo (NUNCA USE reticências ou "..."):
   - 1. Acolhida e Sondagem (5 min): Roda de conversa inicial sobre o tema.
   - 2. Apresentação e Motivação (10 min): Explicação contextualizada e lúdica para crianças de 1º ano.
   - 3. Desenvolvimento Pedagógico (20 min): Atividade prática, recorte/colagem ou livro didático.
   - 4. Registro no Caderno (10 min): Sistematização escrita/desenho no caderno.
   - 5. Fechamento da Aula (5 min): Síntese coletiva do aprendizado.
5. "evaluation": Escreva os critérios de avaliação formativa e observação contínua específicos para esta aula e faixa etária.

Retorne EXATAMENTE no formato JSON abaixo, com textos completos e reais:

{
  "thematicUnit": "${thematicUnitBase}",
  "bimestre": "${input.bimestre}",
  "skills": "${skillDescBase}",
  "knowledgeObjects": "${knowledgeObjBase}",
  "methodology": "1. Acolhida e Sondagem (5 min): ...\\n2. Apresentação (10 min): ...\\n3. Desenvolvimento (20 min): ...\\n4. Registro (10 min): ...\\n5. Fechamento (5 min): ...",
  "evaluation": "Avaliação formativa e contínua por meio da observação direta..."
}`;

  let parsed: any = null;
  try {
    const responseText = await generateWithFallback(apiKey, prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn('[GEMUL AI] Erro ao chamar IA para aula única, usando dados da matriz:', err);
  }

  // Validador anti-reticências (anti "...")
  const isInvalid = (val: string) => !val || val === '...' || val.trim() === '' || val.length < 5;

  return {
    thematicUnit: (!isInvalid(parsed?.thematicUnit)) ? sanitizeText(parsed.thematicUnit) : thematicUnitBase,
    bimestre: parsed?.bimestre || input.bimestre,
    skills: (!isInvalid(parsed?.skills)) ? sanitizeText(parsed.skills) : skillDescBase,
    knowledgeObjects: (!isInvalid(parsed?.knowledgeObjects)) ? sanitizeText(parsed.knowledgeObjects) : knowledgeObjBase,
    methodology: (!isInvalid(parsed?.methodology)) ? sanitizeText(parsed.methodology) : `1. Acolhida e Sondagem (5 min): Roda de conversa inicial para acolher as crianças e levantar os saberes prévios sobre ${thematicUnitBase}.\n2. Apresentação e Motivação (10 min): Explicação dialogada e contextualizada com recursos visuais sobre ${knowledgeObjBase}.\n3. Desenvolvimento Pedagógico (20 min): Realização de atividade prática orientada e fixação no material didático com apoio individualizado.\n4. Registro no Caderno (10 min): Sistematização das descobertas por meio de escrita espontânea e ilustrações no caderno.\n5. Fechamento da Aula (5 min): Compartilhamento das produções e síntese coletiva do que foi aprendido no dia.`,
    evaluation: (!isInvalid(parsed?.evaluation)) ? sanitizeText(parsed.evaluation) : `Avaliação formativa e contínua através da observação direta do engajamento dos alunos nas atividades, diagnóstico da apropriação dos conceitos de ${knowledgeObjBase} e análise dos registros individuais no caderno.`,
  };
}

/**
 * Gera em lote todas as aulas do mês distribuindo a matriz de forma sequencial e coesa
 */
export async function generateMonthLessons(
  lessons: Lesson[],
  matrixSkills: MatrixSkill[],
  apiKey: string,
  teacherName: string,
  schoolName: string,
  onProgress?: (current: number, total: number, discipline: string) => void
): Promise<Lesson[]> {
  const results: Lesson[] = [];
  const total = lessons.length;
  let current = 0;

  const byDiscipline = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const norm = normalizeDiscipline(l.discipline);
    if (!byDiscipline.has(norm)) byDiscipline.set(norm, []);
    byDiscipline.get(norm)!.push(l);
  }

  const sameDayGroups = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const key = `${normalizeDiscipline(l.discipline)}|${l.lessonDate}`;
    if (!sameDayGroups.has(key)) sameDayGroups.set(key, []);
    sameDayGroups.get(key)!.push(l);
  }

  const sortedLessons = [...lessons].sort((a, b) => a.lessonNumber - b.lessonNumber);

  for (const lesson of sortedLessons) {
    const normDisc = normalizeDiscipline(lesson.discipline);
    const discLessons = byDiscipline.get(normDisc) || [lesson];
    const lessonIndexInMonth = discLessons.findIndex(l => l.lessonNumber === lesson.lessonNumber);
    const totalLessonsInMonth = discLessons.length;

    const groupKey = `${normDisc}|${lesson.lessonDate}`;
    const group = sameDayGroups.get(groupKey) || [lesson];
    const groupIndex = group.findIndex(l => l.lessonNumber === lesson.lessonNumber);
    const groupSize = group.length;

    onProgress?.(++current, total, normDisc);

    try {
      const generated = await generateLesson(
        {
          discipline: normDisc as Discipline,
          lessonNumber: lesson.lessonNumber,
          lessonDate: lesson.lessonDate,
          month: lesson.month,
          year: lesson.year,
          grade: lesson.grade,
          classGroup: lesson.classGroup,
          bimestre: lesson.bimestre,
          thematicUnit: lesson.thematicUnit,
          matrixSkills,
          groupIndex: Math.max(0, groupIndex),
          groupSize,
          teacherName,
          schoolName,
          lessonIndexInMonth,
          totalLessonsInMonth,
        },
        apiKey
      );

      results.push({
        ...lesson,
        ...generated,
        status: 'generated',
        groupIndex,
        groupSize,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error(`Erro ao gerar aula ${lesson.lessonNumber} de ${normDisc}:`, err);
      results.push({ ...lesson, status: 'pending' });
    }

    await new Promise(resolve => setTimeout(resolve, 350));
  }

  return results;
}
