/**
 * GEMUL Professor — Popup Script
 */

'use strict';

const STORAGE_KEY_LESSONS  = 'gemul_professor_lessons';
const STORAGE_KEY_PROGRESS = 'gemul_professor_progress';

async function loadStats() {
  chrome.storage.local.get([STORAGE_KEY_LESSONS, STORAGE_KEY_PROGRESS], result => {
    const lessons  = result[STORAGE_KEY_LESSONS]  || [];
    const progress = result[STORAGE_KEY_PROGRESS] || { lastInjectedIndex: -1, isRunning: false };

    const total     = lessons.length;
    const generated = lessons.filter(l => l.status && l.status !== 'pending').length;
    const injected  = lessons.filter(l => l.status === 'injected').length;

    document.getElementById('stat-total').textContent     = total;
    document.getElementById('stat-generated').textContent = generated;
    document.getElementById('stat-injected').textContent  = injected;

    // Status pill
    const pill = document.getElementById('status-pill');
    const text = document.getElementById('status-text');
    if (total === 0) {
      pill.className = 'status-pill status-warn';
      text.textContent = 'Nenhum dado importado';
    } else if (progress.isRunning) {
      pill.className = 'status-pill status-ok';
      text.textContent = 'Piloto Automático Ativo';
    } else {
      pill.className = 'status-pill status-ok';
      text.textContent = `${total} aulas prontas`;
    }

    // Sync time
    const syncEl = document.getElementById('sync-time');
    if (total > 0) {
      syncEl.textContent = `Última importação: ${new Date().toLocaleDateString('pt-BR')}`;
    }

    // Progress
    if (progress.isRunning && progress.lastInjectedIndex >= 0) {
      document.getElementById('progress-wrap').style.display = 'block';
      const pct = Math.round(((progress.lastInjectedIndex + 1) / total) * 100);
      document.getElementById('popup-progress-fill').style.width = pct + '%';
      document.getElementById('popup-progress-text').textContent = `${progress.lastInjectedIndex + 1}/${total}`;
    }
  });
}

// Import JSON
document.getElementById('import-json-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const lessons = data.lessons || data;
    if (!Array.isArray(lessons)) throw new Error('Formato inválido');
    chrome.storage.local.set({ [STORAGE_KEY_LESSONS]: lessons }, () => {
      loadStats();
      alert(`✅ ${lessons.length} aulas importadas com sucesso!\n\nAgora abra o GEMUL e use o widget flutuante para preencher.`);
    });
  } catch (err) {
    alert('❌ Erro ao importar JSON: ' + err.message);
  }
});

// Open GEMUL
document.getElementById('open-gemul-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://gemul-anapolis.com.br/app/sca_planejamento_acompanhamento_professor.asp' });
});

// Clear data
document.getElementById('clear-data-btn').addEventListener('click', () => {
  if (confirm('Isso vai apagar todos os dados locais (aulas importadas e progresso). Confirmar?')) {
    chrome.storage.local.clear(() => {
      loadStats();
      alert('Dados limpos.');
    });
  }
});

// Init
loadStats();
