import React, { useState } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { useSettingsStore } from '../../stores/settingsStore';

// Icons
const GeneralIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const KeyIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>;

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { geminiApiKey, openaiApiKey, anthropicApiKey, setGeminiApiKey, setOpenaiApiKey, setAnthropicApiKey } = useSettingsStore();
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showOpenaiModal, setShowOpenaiModal] = useState(false);
  const [showAnthropicModal, setShowAnthropicModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const openModal = (setter) => {
    setKeyInput('');
    setter(true);
  };

  const saveKey = (setter, saveFn) => {
    if (keyInput.trim()) saveFn(keyInput.trim());
    setter(false);
    setKeyInput('');
  };

  return (
    <>
    <div className="flex-1 flex bg-white overflow-hidden">
      <div className="w-64 border-r border-border bg-neutral-50/50 p-4 flex flex-col">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 px-2">Settings</h2>
        
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-white shadow-sm border border-border text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'}`}
          >
            <GeneralIcon /> General
          </button>
          <button 
            onClick={() => setActiveTab('api-keys')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'api-keys' ? 'bg-white shadow-sm border border-border text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'}`}
          >
            <KeyIcon /> API Keys
          </button>
        </nav>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-1">General Settings</h3>
                <p className="text-sm text-neutral-500 mb-6">Manage your workspace configuration and preferences.</p>
                
                <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900 block">Workspace Name</label>
                    <input type="text" defaultValue="Forge default" className="w-full max-w-md bg-white border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900 block">Default Export Directory</label>
                    <div className="flex gap-2 max-w-md">
                      <input type="text" defaultValue="~/forge-exports" className="flex-1 bg-neutral-50 border border-border rounded-lg px-4 py-2 text-sm text-neutral-500 focus:outline-none cursor-not-allowed" readOnly />
                      <button className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-sm font-medium rounded-lg transition-colors border border-border">Change</button>
                    </div>
                  </div>
                  
                  <hr className="border-border" />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-neutral-900">Advanced Features</h4>
                    
                    <label className="flex items-center justify-between p-4 bg-neutral-50 border border-border rounded-xl cursor-pointer hover:bg-neutral-100/50 transition-colors">
                      <div>
                        <span className="text-sm font-medium text-neutral-900 block mb-1">Developer Mode</span>
                        <span className="text-xs text-neutral-500">Enable advanced debugging tools and experimental features.</span>
                      </div>
                      <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-neutral-900">
                        <span className="inline-block h-3.5 w-3.5 translate-x-4 rounded-full bg-white transition" />
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-neutral-50 border border-border rounded-xl cursor-pointer hover:bg-neutral-100/50 transition-colors">
                      <div>
                        <span className="text-sm font-medium text-neutral-900 block mb-1">Auto-save Servers</span>
                        <span className="text-xs text-neutral-500">Automatically save your work every minute.</span>
                      </div>
                      <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-neutral-900">
                        <span className="inline-block h-3.5 w-3.5 translate-x-4 rounded-full bg-white transition" />
                      </div>
                    </label>
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <button className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">Save Changes</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-1">API Keys</h3>
                <p className="text-sm text-neutral-500 mb-6">Manage API keys for external services used in your nodes.</p>
                
                <div className="space-y-6">
                  <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-border bg-neutral-50 flex justify-between items-center">
                      <span className="text-sm font-semibold text-neutral-900">Stored Keys</span>
                      <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add Key
                      </button>
                    </div>
                    <div className="divide-y divide-border">
                      {/* Google Gemini */}
                      <div className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                        <div>
                          <div className="text-sm font-medium text-neutral-900 mb-1">Google Gemini API Key</div>
                          <div className="text-xs text-neutral-500 font-mono">
                            {geminiApiKey ? `${geminiApiKey.slice(0, 10)}••••••••••••` : <span className="italic text-neutral-400">Not configured</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {geminiApiKey && <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">Active</span>}
                          <button onClick={() => openModal(setShowGeminiModal)} className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium rounded-xl transition-colors border border-border shadow-sm">
                            {geminiApiKey ? 'Update' : 'Configure'}
                          </button>
                          {geminiApiKey && (
                            <button onClick={() => setGeminiApiKey('')} className="p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* OpenAI */}
                      <div className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                        <div>
                          <div className="text-sm font-medium text-neutral-900 mb-1">OpenAI API Key</div>
                          <div className="text-xs text-neutral-500 font-mono">
                            {openaiApiKey ? `${openaiApiKey.slice(0, 10)}••••••••••••` : <span className="italic text-neutral-400">Not configured</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {openaiApiKey && <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">Active</span>}
                          <button onClick={() => openModal(setShowOpenaiModal)} className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium rounded-xl transition-colors border border-border shadow-sm">
                            {openaiApiKey ? 'Update' : 'Configure'}
                          </button>
                          {openaiApiKey && (
                            <button onClick={() => setOpenaiApiKey('')} className="p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Anthropic */}
                      <div className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                        <div>
                          <div className="text-sm font-medium text-neutral-900 mb-1">Anthropic API Key</div>
                          <div className="text-xs text-neutral-500 font-mono">
                            {anthropicApiKey ? `${anthropicApiKey.slice(0, 10)}••••••••••••` : <span className="italic text-neutral-400">Not configured</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {anthropicApiKey && <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">Active</span>}
                          <button onClick={() => openModal(setShowAnthropicModal)} className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium rounded-xl transition-colors border border-border shadow-sm">
                            {anthropicApiKey ? 'Update' : 'Configure'}
                          </button>
                          {anthropicApiKey && (
                            <button onClick={() => setAnthropicApiKey('')} className="p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
                    <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <p className="text-sm">Keys are stored locally in your browser and only used for executing your node workflows from the Canvas or Test Workbench. They are never sent to our servers.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* API Key Modals */}

    {[
      { show: showGeminiModal, setShow: setShowGeminiModal, label: 'Google Gemini API Key', saveFn: setGeminiApiKey },
      { show: showOpenaiModal, setShow: setShowOpenaiModal, label: 'OpenAI API Key', saveFn: setOpenaiApiKey },
      { show: showAnthropicModal, setShow: setShowAnthropicModal, label: 'Anthropic API Key', saveFn: setAnthropicApiKey },
    ].map(({ show, setShow, label, saveFn }) =>
      show ? (
        <div key={label} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">{label}</h3>
            <p className="text-sm text-neutral-500 mb-4">Your key is stored locally and never sent to our servers.</p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveKey(setShow, saveFn)}
              placeholder="Paste your API key here..."
              autoFocus
              className="w-full border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900/20 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Cancel</button>
              <button onClick={() => saveKey(setShow, saveFn)} className="px-5 py-2 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors shadow-sm">Save</button>
            </div>
          </div>
        </div>
      ) : null
    )}
    </>
  );
}
