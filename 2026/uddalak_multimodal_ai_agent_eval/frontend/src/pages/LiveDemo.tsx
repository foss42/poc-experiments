import React, { useState, useRef } from 'react';
import { useEval, PROVIDER_MODELS } from '../context/EvalContext';
import { Button } from '../components/ui/Button';
import { Play, UploadCloud, Cpu, AlertCircle, Loader2 } from 'lucide-react';
import type { ProviderConfig } from '../types/eval';

// ── Inline styles for reuse ──────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface-container)',
  padding: '28px 32px',
  borderRadius: '2px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  letterSpacing: '1.5px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: '20px',
  display: 'block',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--surface-dim)',
  border: '1px solid var(--surface-container-high)',
  borderRadius: '2px',
  color: 'var(--primary)',
  padding: '14px 16px',
  fontSize: '15px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: '40px',
};

const textAreaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '120px',
  backgroundColor: 'var(--surface-dim)',
  border: '1px solid var(--surface-container-high)',
  borderRadius: '2px',
  color: 'var(--primary)',
  padding: '16px',
  fontSize: '15px',
  outline: 'none',
  resize: 'vertical',
  lineHeight: '1.5',
};

export const LiveDemo: React.FC = () => {
  const { startEval, isLoading, isPolling, pollingProgress, activeJob, error } = useEval();

  const [prompt, setPrompt] = useState('What can you tell me about this image?');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderConfig>({ name: 'gemini', model: 'gemini-2.0-flash' });
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract just the base64 part, dropping "data:image/jpeg;base64,"
      const b64Str = result.split(',')[1];
      setImageBase64(b64Str);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRun = async () => {
    if (!prompt.trim()) return alert('Please enter a prompt.');
    if (!imageBase64) return alert('Please upload an image for multimodal evaluation.');
    if (isPolling || !provider.name) return;

    try {
      setJobId(null);
      const id = await startEval({
        modality: 'multimodal',
        providers: [provider], // Only one provider to make result parsing straightforward
        dataset: [{
          prompt: prompt,
          images: [imageBase64],
        }],
      });
      setJobId(id);
    } catch (e) {
      console.error('Failed to run live demo:', e);
    }
  };

  const updateProvider = (updates: Partial<ProviderConfig>) => {
    const merged = { ...provider, ...updates };
    if (updates.name && updates.name !== provider.name) {
      merged.model = PROVIDER_MODELS[updates.name]?.[0] ?? '';
    }
    setProvider(merged as ProviderConfig);
  };

  const isBusy = isLoading || isPolling;
  
  // Safely extract the prediction text from activeJob
  let resultText = '';
  let latency = 0;
  if (!isBusy && jobId && activeJob?.status === 'complete' && activeJob.per_sample_results) {
    const sr = activeJob.per_sample_results[0] as any;
    resultText = sr?.prediction || '';
    latency = sr?.latency_ms || 0;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: '36px', marginBottom: '8px', letterSpacing: '1px' }}>LIVE DEMO</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Evaluate multimodal models instantly with ad-hoc image and text prompt inputs.
        </p>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 68, 68, 0.08)',
          border: '1px solid #ff4444',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <AlertCircle size={16} color="#ff4444" />
          <span style={{ fontSize: '14px', color: '#ff4444' }}>{error}</span>
        </div>
      )}

      {/* ── Main layout: 3/2 grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px', alignItems: 'start' }}>

        {/* ═══════════════ LEFT COLUMN (INPUT) ═══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Output / Results (Moved here dynamically if complete, or we can keep it strictly left/right) */}
          <div style={cardStyle}>
             <span style={labelStyle}>Image Input</span>
             <div style={{ 
               border: '2px dashed var(--surface-container-high)', 
               borderRadius: '4px',
               padding: imageBase64 ? '16px' : '40px 20px', 
               textAlign: 'center',
               cursor: imageBase64 ? 'default' : 'pointer',
               backgroundColor: 'var(--surface-dim)',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '12px',
               position: 'relative'
             }}
             onClick={() => !imageBase64 && fileInputRef.current?.click()}
             >
                {imageBase64 ? (
                  <div style={{ width: '100%', position: 'relative' }}>
                    <img 
                      src={`data:image/jpeg;base64,${imageBase64}`} 
                      alt="Uploaded preview" 
                      style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); clearImage(); }}
                      style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                        border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Clear Image
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} color="var(--text-muted)" />
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click to upload an image for multimodal evaluation</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
             </div>
          </div>

          <div style={cardStyle}>
            <span style={labelStyle}>Text Prompt</span>
            <textarea 
              style={textAreaStyle} 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What can you describe about the provided image?"
            />
          </div>

          <div style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Cpu size={14} color="var(--accent)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '1px', color: 'var(--accent)' }}>
                AI PROVIDER CONFIGURATION
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                  PROVIDER
                </label>
                <select
                  value={provider.name}
                  onChange={(e) => updateProvider({ name: e.target.value as ProviderConfig['name'] })}
                  style={selectStyle}
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  {/* Groq text-only usually, but maybe they add vision later */}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                  MODEL
                </label>
                <select
                  value={provider.model}
                  onChange={(e) => updateProvider({ model: e.target.value })}
                  style={selectStyle}
                >
                  {(PROVIDER_MODELS[provider.name] ?? []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ RIGHT COLUMN (OUTPUT) ═══════════════ */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <Button
            variant="accent"
            onClick={handleRun}
            disabled={isBusy || !imageBase64 || !prompt.trim()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px',
              fontSize: '14px',
              letterSpacing: '1px',
              opacity: (isBusy || !imageBase64 || !prompt.trim()) ? 0.6 : 1,
              cursor: (isBusy || !imageBase64 || !prompt.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {isBusy ? (
               <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> PROCESSING…</>
            ) : (
               <><Play size={15} /> RUN LIVE EVAL</>
            )}
          </Button>

          {/* Polling Indicator */}
          {isPolling && (
            <div style={{ ...cardStyle, border: '1px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>STATUS</span>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{pollingProgress}%</span>
              </div>
              <div style={{ height: '3px', backgroundColor: 'var(--surface-container-high)', borderRadius: '2px' }}>
                <div style={{
                  height: '100%',
                  width: `${pollingProgress}%`,
                  backgroundColor: 'var(--accent)',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Waiting for <strong>{provider.name}</strong> to process the multimodal inference...
              </div>
            </div>
          )}

          {/* Results Output */}
          {!isBusy && jobId && resultText && (
            <div style={{ ...cardStyle, backgroundColor: 'rgba(232,255,0,0.04)', border: '1px solid var(--accent)' }}>
              <span style={{ ...labelStyle, color: 'var(--accent)' }}>AI RESPONSE</span>
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--primary)', 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                overflowY: 'auto',
                marginBottom: '16px'
              }}>
                {resultText}
              </div>
              <div style={{ 
                paddingTop: '16px', 
                borderTop: '1px solid var(--surface-container-high)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LATENCY</span>
                <span style={{ fontSize: '12px', color: 'white', fontFamily: 'var(--font-mono)' }}>{latency} ms</span>
              </div>
            </div>
          )}

        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
