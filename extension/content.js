/**
 * GEMUL Professor — Content Script (Manifest V3)
 * Injeta o painel flutuante e controla o preenchimento automático
 * nas páginas do sistema GEMUL de Anápolis-GO.
 */

'use strict';

// ─── Constantes ──────────────────────────────────────────────────────────────
const PAGE_ACOMPANHAMENTO = 'sca_planejamento_acompanhamento_professor.asp';
const PAGE_PLANEJAMENTO   = 'sca_planejamento_professor.asp';
const STORAGE_KEY_LESSONS = 'gemul_professor_lessons';
const STORAGE_KEY_PROGRESS = 'gemul_professor_progress';

// Delay humano configurável entre ações (ms)
const HUMAN_DELAY_MIN = 800;
const HUMAN_DELAY_MAX = 1500;

// ─── Utilitários ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function humanDelay() {
  const ms = HUMAN_DELAY_MIN + Math.random() * (HUMAN_DELAY_MAX - HUMAN_DELAY_MIN);
  return sleep(ms);
}

/**
 * Preenche um campo de formulário disparando todos os eventos necessários
 * para que os scripts do Classic ASP reconheçam a alteração.
 */
function fillField(element, value) {
  if (!element) return false;
  element.focus();
  element.value = value;
  element.dispatchEvent(new Event('input',  { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur',   { bubbles: true }));
  return true;
}

/**
 * Preenche um select pelo valor ou pelo texto visível.
 */
function fillSelect(selectEl, targetValue) {
  if (!selectEl) return false;
  const opts = Array.from(selectEl.options);

  // 1) Tenta match exato no value
  let opt = opts.find(o => o.value === targetValue || o.value.toLowerCase() === targetValue.toLowerCase());
  // 2) Tenta match no texto
  if (!opt) opt = opts.find(o => o.text.toLowerCase().includes(targetValue.toLowerCase()));
  // 3) Tenta match parcial no value
  if (!opt) opt = opts.find(o => o.value.toLowerCase().includes(targetValue.toLowerCase()));

  if (opt) {
    selectEl.value = opt.value;
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

/**
 * Sanitiza texto para compatibilidade com ASP legado (Windows-1252).
 * - Remove emojis e caracteres fora de Latin-1
 * - Converte aspas tipográficas
 * - Limita múltiplas quebras de linha
 */
function sanitizeForASP(text) {
  if (!text) return '';
  return text
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u2023\u2043]/g, '-')
    .replace(/[^\x00-\xFF]/g, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Storage ─────────────────────────────────────────────────────────────────

async function getLessonsFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY_LESSONS], result => {
      resolve(result[STORAGE_KEY_LESSONS] || []);
    });
  });
}

async function getProgressFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY_PROGRESS], result => {
      resolve(result[STORAGE_KEY_PROGRESS] || { lastInjectedIndex: -1, isRunning: false });
    });
  });
}

async function saveProgress(data) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY_PROGRESS]: data }, resolve);
  });
}

/**
 * Encontra a aula correspondente no banco de dados local.
 * Usa disciplina + número da aula + mês + ano como chave de busca.
 */
async function findMatchingLesson(discipline, lessonNumber, lessonDate) {
  const lessons = await getLessonsFromStorage();
  if (!lessons || lessons.length === 0) return null;

  // Normaliza nome da disciplina para comparação
  const normDisc = d => (d || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return lessons.find(l => {
    const discMatch = normDisc(l.discipline) === normDisc(discipline);
    const numMatch  = Number(l.lessonNumber) === Number(lessonNumber);
    return discMatch && numMatch;
  }) || null;
}

// ─── Leitura de Contexto da Página ───────────────────────────────────────────

function readLessonPageContext() {
  const getText = sel => document.querySelector(sel)?.value?.trim() || document.querySelector(sel)?.textContent?.trim() || '';

  // Lê os inputs do cabeçalho readonly do GEMUL
  const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
  const findInput = (label) => {
    for (const inp of inputs) {
      const id = (inp.id || '').toLowerCase();
      const name = (inp.name || '').toLowerCase();
      const prevText = (inp.previousSibling?.textContent || inp.closest('td')?.previousElementSibling?.textContent || '').toLowerCase();
      if (id.includes(label) || name.includes(label) || prevText.includes(label)) return inp.value?.trim();
    }
    return '';
  };

  // Tenta extrair via labels próximos
  const allInputs = document.querySelectorAll('input[readonly], input[disabled]');
  const values = Array.from(allInputs).map(i => i.value?.trim()).filter(Boolean);

  return {
    discipline: findInput('disciplina') || values.find(v => ['arte','ciências','ciencias','geografia','história','historia','matemática','matematica','lingua','língua','educação','educacao','ensino','produção','producao'].some(d => v.toLowerCase().includes(d))) || '',
    lessonNumber: findInput('aula') || document.querySelector('[name*="aula" i], [id*="aula" i]')?.value || '',
    lessonDate: findInput('data') || document.querySelector('[name*="data" i], [id*="data" i]')?.value || '',
    grade: findInput('periodo') || findInput('ano') || '',
    bimestre: '1º Bimestre',
  };
}

// ─── Mapeamento de Campos do GEMUL ───────────────────────────────────────────

function getFormFields() {
  // Mapeamento amplo para capturar os campos independente do HTML exato
  const allSelects   = Array.from(document.querySelectorAll('select'));
  const allTextareas = Array.from(document.querySelectorAll('textarea'));
  const allInputs    = Array.from(document.querySelectorAll('input[type="text"]:not([readonly]):not([disabled])'));

  const findByLabel = (elements, keywords) => {
    for (const el of elements) {
      const label = (el.id + ' ' + el.name + ' ' + (el.closest('tr, div, td')?.textContent || '')).toLowerCase();
      if (keywords.some(k => label.includes(k))) return el;
    }
    return null;
  };

  return {
    selectUnidade:   findByLabel(allSelects,   ['unidade', 'linguagem', 'eixo', 'tematica', 'temática']),
    selectBimestre:  findByLabel(allSelects,   ['bimestre']),
    inputHabilidades: findByLabel([...allTextareas, ...allInputs], ['habilidade']),
    inputObjetos:    findByLabel([...allTextareas, ...allInputs], ['objeto', 'conteudo', 'conteúdo', 'conhecimento']),
    textareaMetodologia: findByLabel(allTextareas, ['metodologia']),
    textareaAvaliacao:   findByLabel(allTextareas, ['avalia']),
    btnSalvar: Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
      .find(b => (b.value || b.textContent || '').toLowerCase().match(/salvar|enviar|gravar|confirmar/)),
  };
}

// ─── Preenchimento de uma Aula ────────────────────────────────────────────────

async function fillLessonForm(lessonData) {
  const fields = getFormFields();
  let filledCount = 0;

  await humanDelay();

  if (fields.selectUnidade && lessonData.thematicUnit) {
    const ok = fillSelect(fields.selectUnidade, lessonData.thematicUnit);
    if (!ok) {
      // Se não encontrou no select, tenta selecionar a primeira opção não-vazia
      const firstOpt = Array.from(fields.selectUnidade.options).find(o => o.value && o.value !== '0');
      if (firstOpt) { fields.selectUnidade.value = firstOpt.value; fields.selectUnidade.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    filledCount++;
    await sleep(300);
  }

  if (fields.selectBimestre && lessonData.bimestre) {
    fillSelect(fields.selectBimestre, lessonData.bimestre);
    filledCount++;
    await sleep(300);
  }

  if (fields.inputHabilidades && lessonData.skills) {
    fillField(fields.inputHabilidades, sanitizeForASP(lessonData.skills));
    filledCount++;
    await sleep(300);
  }

  if (fields.inputObjetos && lessonData.knowledgeObjects) {
    fillField(fields.inputObjetos, sanitizeForASP(lessonData.knowledgeObjects));
    filledCount++;
    await sleep(300);
  }

  if (fields.textareaMetodologia && lessonData.methodology) {
    fillField(fields.textareaMetodologia, sanitizeForASP(lessonData.methodology));
    filledCount++;
    await sleep(300);
  }

  if (fields.textareaAvaliacao && lessonData.evaluation) {
    fillField(fields.textareaAvaliacao, sanitizeForASP(lessonData.evaluation));
    filledCount++;
    await sleep(300);
  }

  return { filledCount, fields };
}

// ─── Widget Flutuante ─────────────────────────────────────────────────────────

function createFloatingWidget() {
  if (document.getElementById('gemul-prof-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'gemul-prof-widget';
  widget.innerHTML = `
    <div class="gemul-header">
      <span class="gemul-logo">🎓</span>
      <span class="gemul-title">GEMUL Professor</span>
      <button class="gemul-minimize" id="gemul-minimize-btn">−</button>
    </div>
    <div class="gemul-body" id="gemul-body">
      <div class="gemul-status" id="gemul-status">Pronto</div>
      <div class="gemul-info" id="gemul-lesson-info">Aguardando aula...</div>
      <div class="gemul-progress-wrap" id="gemul-progress-wrap" style="display:none">
        <div class="gemul-progress-bar">
          <div class="gemul-progress-fill" id="gemul-progress-fill"></div>
        </div>
        <span class="gemul-progress-text" id="gemul-progress-text">0/0</span>
      </div>
      <div class="gemul-buttons">
        <button class="gemul-btn gemul-btn-primary" id="gemul-fill-btn">⚡ Preencher Esta Aula</button>
        <button class="gemul-btn gemul-btn-success" id="gemul-auto-btn">🚀 Piloto Automático</button>
        <button class="gemul-btn gemul-btn-secondary" id="gemul-stop-btn" style="display:none">⏸ Pausar</button>
        <button class="gemul-btn gemul-btn-secondary" id="gemul-resume-btn" style="display:none">▶ Retomar</button>
        <label class="gemul-btn gemul-btn-import" for="gemul-import-file">📂 Importar JSON</label>
        <input type="file" id="gemul-import-file" accept=".json" style="display:none" />
      </div>
      <div class="gemul-footer">v1.0 • SEMED Anápolis</div>
    </div>
  `;

  document.body.appendChild(widget);

  // Draggable
  let isDragging = false, startX, startY, startLeft, startTop;
  const header = widget.querySelector('.gemul-header');
  header.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = widget.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
  });
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left = (startLeft + e.clientX - startX) + 'px';
    widget.style.top  = (startTop  + e.clientY - startY) + 'px';
  });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // Minimize
  const minimizeBtn = document.getElementById('gemul-minimize-btn');
  const body = document.getElementById('gemul-body');
  minimizeBtn.addEventListener('click', () => {
    if (body.style.display === 'none') {
      body.style.display = '';
      minimizeBtn.textContent = '−';
    } else {
      body.style.display = 'none';
      minimizeBtn.textContent = '+';
    }
  });

  // Import JSON
  document.getElementById('gemul-import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const lessons = data.lessons || data;
      if (!Array.isArray(lessons)) throw new Error('Formato inválido');
      await chrome.storage.local.set({ [STORAGE_KEY_LESSONS]: lessons });
      setStatus(`✅ ${lessons.length} aulas importadas!`, 'success');
    } catch (err) {
      setStatus('❌ Erro ao importar JSON. Verifique o arquivo.', 'error');
    }
  });

  return widget;
}

function setStatus(msg, type = 'default') {
  const el = document.getElementById('gemul-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'gemul-status gemul-status-' + type;
}

function setLessonInfo(msg) {
  const el = document.getElementById('gemul-lesson-info');
  if (el) el.textContent = msg;
}

function setProgress(current, total) {
  const wrap = document.getElementById('gemul-progress-wrap');
  const fill = document.getElementById('gemul-progress-fill');
  const text = document.getElementById('gemul-progress-text');
  if (!wrap) return;
  if (total === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  fill.style.width = `${Math.round((current / total) * 100)}%`;
  text.textContent = `${current}/${total}`;
}

// ─── Lógica da Página de Formulário (sca_planejamento_professor.asp) ──────────

async function initFormPage() {
  const widget = createFloatingWidget();
  const ctx = readLessonPageContext();

  setLessonInfo(
    ctx.discipline
      ? `${ctx.discipline} • Aula ${ctx.lessonNumber} • ${ctx.lessonDate}`
      : 'Lendo contexto...'
  );

  const lessons = await getLessonsFromStorage();
  const match = await findMatchingLesson(ctx.discipline, ctx.lessonNumber, ctx.lessonDate);

  if (match) {
    setStatus(`✅ Plano encontrado: ${match.status === 'reviewed' ? 'Revisado' : 'Gerado'}`, 'success');
  } else if (lessons.length === 0) {
    setStatus('⚠️ Nenhum JSON importado ainda. Importe o JSON do Dashboard.', 'warn');
  } else {
    setStatus('❓ Plano não encontrado para esta aula', 'warn');
  }

  // Botão: Preencher Esta Aula
  document.getElementById('gemul-fill-btn').addEventListener('click', async () => {
    const lesson = await findMatchingLesson(ctx.discipline, ctx.lessonNumber, ctx.lessonDate);
    if (!lesson) {
      setStatus('❌ Plano não encontrado. Verifique o JSON importado.', 'error');
      return;
    }
    setStatus('⏳ Preenchendo campos...', 'default');
    try {
      const { filledCount } = await fillLessonForm(lesson);
      setStatus(`✅ ${filledCount} campos preenchidos! Revise e salve.`, 'success');
    } catch (err) {
      setStatus('❌ Erro ao preencher: ' + err.message, 'error');
    }
  });

  // Oculta botão de piloto automático na página de formulário individual
  const autoBtn = document.getElementById('gemul-auto-btn');
  if (autoBtn) autoBtn.style.display = 'none';
}

// ─── Lógica da Página de Acompanhamento (sca_planejamento_acompanhamento_professor.asp) ──

let isAutoPilotRunning = false;
let shouldStopAutoPilot = false;

async function initAcompanhamentoPage() {
  createFloatingWidget();

  const lessons = await getLessonsFromStorage();
  const count = lessons ? lessons.length : 0;
  setStatus(count > 0 ? `📚 ${count} aulas prontas para injeção` : '⚠️ Importe o JSON do Dashboard', count > 0 ? 'success' : 'warn');
  setLessonInfo('Página de Acompanhamento detectada');

  // Oculta botão de preencher aula individual
  const fillBtn = document.getElementById('gemul-fill-btn');
  if (fillBtn) fillBtn.style.display = 'none';

  // Botão: Piloto Automático
  document.getElementById('gemul-auto-btn').addEventListener('click', async () => {
    if (isAutoPilotRunning) return;
    const lessons = await getLessonsFromStorage();
    if (!lessons || lessons.length === 0) {
      setStatus('❌ Nenhum JSON importado. Importe o JSON primeiro.', 'error');
      return;
    }
    await startAutoPilot(lessons);
  });

  // Botão: Pausar
  document.getElementById('gemul-stop-btn').addEventListener('click', () => {
    shouldStopAutoPilot = true;
    setStatus('⏸ Pausando... Aguarde.', 'warn');
  });

  // Botão: Retomar
  document.getElementById('gemul-resume-btn').addEventListener('click', async () => {
    const lessons = await getLessonsFromStorage();
    const progress = await getProgressFromStorage();
    await startAutoPilot(lessons, progress.lastInjectedIndex + 1);
  });
}

async function startAutoPilot(lessons, startIndex = 0) {
  isAutoPilotRunning = true;
  shouldStopAutoPilot = false;

  document.getElementById('gemul-auto-btn').style.display = 'none';
  document.getElementById('gemul-stop-btn').style.display = 'block';
  document.getElementById('gemul-resume-btn').style.display = 'none';

  // Coleta todas as células de aulas clicáveis na página de acompanhamento
  // As células são <td> ou <a> com número de aula e data
  const lessonCells = collectLessonCells();

  setProgress(startIndex, lessonCells.length);
  setStatus(`🚀 Iniciando Piloto Automático (${lessonCells.length} aulas)...`, 'default');

  let successCount = 0;
  let errorCount = 0;

  for (let i = startIndex; i < lessonCells.length; i++) {
    if (shouldStopAutoPilot) {
      await saveProgress({ lastInjectedIndex: i - 1, isRunning: false });
      setStatus(`⏸ Pausado em ${i}/${lessonCells.length}. Clique em Retomar.`, 'warn');
      document.getElementById('gemul-stop-btn').style.display = 'none';
      document.getElementById('gemul-resume-btn').style.display = 'block';
      document.getElementById('gemul-auto-btn').style.display = 'block';
      isAutoPilotRunning = false;
      return;
    }

    const cell = lessonCells[i];
    const { discipline, lessonNumber } = cell;

    setProgress(i + 1, lessonCells.length);
    setLessonInfo(`${discipline} • Aula ${lessonNumber} (${i + 1}/${lessonCells.length})`);
    setStatus('⏳ Abrindo aula...', 'default');

    try {
      // Simula clique na célula para abrir o formulário de edição
      // Em seguida, o content script será re-executado na nova página
      // e preencherá automaticamente se encontrar um plano com auto_fill=true

      // Marca no storage que a próxima página deve ser preenchida automaticamente
      await chrome.storage.local.set({
        gemul_auto_fill_next: {
          discipline,
          lessonNumber,
          timestamp: Date.now(),
          returnUrl: window.location.href,
          progressIndex: i,
          totalLessons: lessonCells.length,
        }
      });

      // Clica no link da aula
      if (cell.element) {
        cell.element.click();
        // Aguarda navegação (o background.js vai notificar quando a próxima página carregar)
        await sleep(3000);
      }

      successCount++;
    } catch (err) {
      console.error(`GEMUL Prof: Erro na aula ${lessonNumber} de ${discipline}:`, err);
      errorCount++;
      await saveProgress({ lastInjectedIndex: i, isRunning: true });
    }

    await humanDelay();
  }

  setStatus(`✅ Concluído! ${successCount} aulas preenchidas. ${errorCount > 0 ? errorCount + ' erros.' : ''}`, 'success');
  setProgress(lessonCells.length, lessonCells.length);
  document.getElementById('gemul-stop-btn').style.display = 'none';
  document.getElementById('gemul-auto-btn').style.display = 'block';
  isAutoPilotRunning = false;
  await saveProgress({ lastInjectedIndex: -1, isRunning: false });
}

/**
 * Coleta todas as células de aula clicáveis na página de acompanhamento.
 * Detecta o padrão de grid do GEMUL: seções por disciplina com blocos de aulas.
 */
function collectLessonCells() {
  const cells = [];

  // Detecta seções de disciplina pelo texto de cabeçalho (ex: "ARTE", "CIÊNCIAS")
  const headers = Array.from(document.querySelectorAll('h2, h3, h4, .disciplina-header, td.disciplina, span'))
    .filter(el => {
      const text = el.textContent.trim().toUpperCase();
      return ['ARTE','CIENCIAS','CIÊNCIAS','EDUCAÇÃO','EDUCACAO','ENSINO','GEOGRAFIA','HISTÓRIA','HISTORIA','LINGUA','LÍNGUA','MATEMATICA','MATEMÁTICA','PRODUCAO','PRODUÇÃO'].some(d => text === d || text.includes(d));
    });

  // Para cada disciplina encontrada, coleta as células de aula linkáveis
  for (const header of headers) {
    const discipline = header.textContent.trim();
    // Procura links/botões na mesma linha ou seção
    const container = header.closest('table, div, section') || header.parentElement;
    const links = Array.from(container?.querySelectorAll('a[href], td[onclick], div[onclick]') || [])
      .filter(el => {
        const text = el.textContent.trim();
        return /^\d+$/.test(text) || el.title?.includes('Aula') || el.href?.includes('planejamento');
      });

    for (const link of links) {
      const lessonNumber = parseInt(link.textContent.trim()) || 0;
      if (lessonNumber > 0) {
        cells.push({ discipline, lessonNumber, element: link });
      }
    }
  }

  // Fallback: coleta qualquer link que pareça ser uma aula
  if (cells.length === 0) {
    const allLinks = Array.from(document.querySelectorAll('a[href*="planejamento"], td[onclick*="planejamento"]'));
    for (const link of allLinks) {
      cells.push({ discipline: 'Desconhecida', lessonNumber: 0, element: link });
    }
  }

  return cells;
}

// ─── Auto-preenchimento automático ao abrir formulário de aula ─────────────────

async function checkAutoFillNext() {
  const result = await chrome.storage.local.get(['gemul_auto_fill_next']);
  const autoFill = result.gemul_auto_fill_next;

  if (!autoFill) return;

  // Verifica se o timestamp é recente (menos de 30 segundos)
  if (Date.now() - autoFill.timestamp > 30000) {
    await chrome.storage.local.remove('gemul_auto_fill_next');
    return;
  }

  // Limpa a flag
  await chrome.storage.local.remove('gemul_auto_fill_next');

  // Aguarda a página carregar completamente
  await sleep(1500);

  // Lê o contexto atual
  const ctx = readLessonPageContext();
  const lesson = await findMatchingLesson(
    autoFill.discipline || ctx.discipline,
    autoFill.lessonNumber || ctx.lessonNumber,
    ctx.lessonDate
  );

  if (lesson) {
    setStatus('⏳ Preenchendo automaticamente...', 'default');
    try {
      await fillLessonForm(lesson);
      setStatus('✅ Preenchido! Salvando...', 'success');

      // Clica no botão de salvar automaticamente
      await sleep(800);
      const saveBtn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
        .find(b => (b.value || b.textContent || '').toLowerCase().match(/salvar|enviar|gravar/));
      if (saveBtn) {
        saveBtn.click();
        await sleep(2000);
        // Volta para a página de acompanhamento
        window.history.back();
      }
    } catch (err) {
      setStatus('❌ Erro no preenchimento automático: ' + err.message, 'error');
    }
  } else {
    setStatus('⚠️ Plano não encontrado para esta aula. Preencha manualmente.', 'warn');
  }
}

// ─── Detecção de Sessão Expirada ──────────────────────────────────────────────

function detectSessionExpired() {
  const bodyText = document.body.textContent.toLowerCase();
  const urlLower = window.location.href.toLowerCase();
  return (
    bodyText.includes('sessão expirada') ||
    bodyText.includes('session expired') ||
    bodyText.includes('faça login') ||
    bodyText.includes('acesso negado') ||
    urlLower.includes('login') ||
    urlLower.includes('logon') ||
    urlLower.includes('sca_login')
  );
}

// ─── Inicialização ────────────────────────────────────────────────────────────

async function init() {
  const url = window.location.href.toLowerCase();

  // Detecta sessão expirada
  if (detectSessionExpired()) {
    const progress = await getProgressFromStorage();
    if (progress.isRunning) {
      // Notifica background para pausar o piloto automático
      chrome.runtime.sendMessage({ type: 'SESSION_EXPIRED', progress });
      // Cria widget de aviso
      createFloatingWidget();
      setStatus('🔐 Sessão expirada! Faça login e clique em Retomar.', 'error');
      document.getElementById('gemul-resume-btn').style.display = 'block';
      document.getElementById('gemul-auto-btn').style.display = 'none';
      document.getElementById('gemul-fill-btn').style.display = 'none';
    }
    return;
  }

  if (url.includes(PAGE_PLANEJAMENTO)) {
    // Verifica se veio do piloto automático
    await checkAutoFillNext();
    await initFormPage();
  } else if (url.includes(PAGE_ACOMPANHAMENTO)) {
    await initAcompanhamentoPage();
  } else if (url.includes('gemul-anapolis.com.br')) {
    // Outras páginas: apenas inicia o widget de importação
    createFloatingWidget();
    setStatus('Navegue para o Planejamento', 'default');
  }
}

// Aguarda DOM completamente pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
