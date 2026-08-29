/**
 * GEMUL Professor — Background Service Worker (Manifest V3)
 * Monitora navegação e detecta sessão expirada durante o Piloto Automático.
 */

'use strict';

const STORAGE_KEY_PROGRESS = 'gemul_professor_progress';

// Monitora mensagens do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SESSION_EXPIRED') {
    // Pausa o piloto automático
    chrome.storage.local.set({
      [STORAGE_KEY_PROGRESS]: { ...message.progress, isRunning: false }
    });
    // Badge de aviso na extensão
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    sendResponse({ ok: true });
  }

  if (message.type === 'AUTOPILOT_COMPLETE') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_PROGRESS') {
    chrome.storage.local.get([STORAGE_KEY_PROGRESS], result => {
      sendResponse(result[STORAGE_KEY_PROGRESS] || { lastInjectedIndex: -1, isRunning: false });
    });
    return true; // async response
  }
});

// Limpa badge ao instalar/atualizar
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
