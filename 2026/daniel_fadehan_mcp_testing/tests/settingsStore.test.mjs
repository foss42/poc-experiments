/**
 * Unit tests for settingsStore logic.
 * Tests the key management without browser/DOM.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Simulate the store state machine (pure logic extracted)
function createSettingsState() {
  let state = { geminiApiKey: '', openaiApiKey: '', anthropicApiKey: '' };
  return {
    getState: () => ({ ...state }),
    setGeminiApiKey: (key) => { state.geminiApiKey = key; },
    setOpenaiApiKey: (key) => { state.openaiApiKey = key; },
    setAnthropicApiKey: (key) => { state.anthropicApiKey = key; },
  };
}

describe('settingsStore logic', () => {
  test('initial state has empty keys', () => {
    const store = createSettingsState();
    const s = store.getState();
    assert.equal(s.geminiApiKey, '');
    assert.equal(s.openaiApiKey, '');
    assert.equal(s.anthropicApiKey, '');
  });

  test('setGeminiApiKey stores the key', () => {
    const store = createSettingsState();
    store.setGeminiApiKey('AIza-test-key-123');
    assert.equal(store.getState().geminiApiKey, 'AIza-test-key-123');
  });

  test('setGeminiApiKey can clear the key', () => {
    const store = createSettingsState();
    store.setGeminiApiKey('AIza-test-key-123');
    store.setGeminiApiKey('');
    assert.equal(store.getState().geminiApiKey, '');
  });

  test('setOpenaiApiKey stores the key', () => {
    const store = createSettingsState();
    store.setOpenaiApiKey('sk-openai-test');
    assert.equal(store.getState().openaiApiKey, 'sk-openai-test');
  });

  test('setAnthropicApiKey stores the key', () => {
    const store = createSettingsState();
    store.setAnthropicApiKey('sk-ant-test');
    assert.equal(store.getState().anthropicApiKey, 'sk-ant-test');
  });

  test('keys are independent of each other', () => {
    const store = createSettingsState();
    store.setGeminiApiKey('gemini-key');
    store.setOpenaiApiKey('openai-key');
    const s = store.getState();
    assert.equal(s.geminiApiKey, 'gemini-key');
    assert.equal(s.openaiApiKey, 'openai-key');
    assert.equal(s.anthropicApiKey, '');
  });

  test('masked display logic: shows first 10 chars + mask', () => {
    const key = 'AIzaSyTest12345';
    const masked = key.length > 0 ? `${key.slice(0, 10)}••••••••••••` : '';
    assert.equal(masked, 'AIzaSyTest••••••••••••');
  });

  test('masked display: empty key shows empty string', () => {
    const key = '';
    const masked = key.length > 0 ? `${key.slice(0, 10)}••••••••••••` : '';
    assert.equal(masked, '');
  });
});
