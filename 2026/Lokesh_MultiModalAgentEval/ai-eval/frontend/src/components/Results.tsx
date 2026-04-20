import type { EvalResults } from '../lib/api';
import { useEffect, useMemo, useState } from 'react';

interface Props {
  data: EvalResults;
}

export default function Results({ data }: Props) {
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [selectedVisionIndex, setSelectedVisionIndex] = useState<number | null>(null);
  const visionSamples = data.vision_samples ?? [];
  const hasFallbackPreview = data.modality === 'vision' && !!data.input_preview;
  const failedCount = visionSamples.filter(sample => sample.is_correct === false).length;
  const visibleVisionSamples = useMemo(() => {
    if (!showFailedOnly) return visionSamples;
    return visionSamples.filter(sample => sample.is_correct === false);
  }, [showFailedOnly, visionSamples]);
  const totalVisible = visibleVisionSamples.length;
  const selectedVisionSample = selectedVisionIndex !== null ? visibleVisionSamples[selectedVisionIndex] : null;
  const metricEntries = useMemo(
    () =>
      Object.entries(data.metrics || {}).filter(
        ([, value]) => typeof value === 'number' && Number.isFinite(value)
      ),
    [data.metrics]
  );

  const primaryMetricKeys = useMemo(() => {
    if (data.modality === 'audio') return ['wer', 'accuracy'];
    if (data.modality === 'text') return ['exact_match', 'accuracy', 'f1'];
    if (data.modality === 'agent') return ['success', 'accuracy', 'score'];
    return ['accuracy', 'f1', 'score'];
  }, [data.modality]);

  const primaryMetrics = useMemo(
    () =>
      metricEntries.filter(([name]) =>
        primaryMetricKeys.some((key) => name.toLowerCase().includes(key))
      ),
    [metricEntries, primaryMetricKeys]
  );

  const insightText = useMemo(() => {
    if (data.modality === 'audio') {
      return 'Audio runs are easiest to compare with WER (lower is better) and accuracy.';
    }
    if (data.modality === 'text') {
      return 'Text runs are best interpreted with exact-match/accuracy style metrics.';
    }
    if (data.modality === 'agent') {
      return 'Agent runs should be read with both metrics and trajectory quality together.';
    }
    return 'Vision runs are easiest to debug by combining metrics with failed-image inspection.';
  }, [data.modality]);

  const formatMetricName = (metricName: string) =>
    metricName
      .replace(/,none$/i, '')
      .replace(/^pope_/i, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  useEffect(() => {
    if (selectedVisionIndex !== null && selectedVisionIndex >= visibleVisionSamples.length) {
      setSelectedVisionIndex(null);
    }
  }, [selectedVisionIndex, visibleVisionSamples.length]);

  return (
    <div className="p-6 border border-slate-700 rounded-xl bg-slate-900 shadow-sm mt-6 text-slate-100">
      <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Evaluation Complete 
        <span className="ml-auto text-sm font-normal text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{data.engine}</span>
      </h2>
      
      <div className="border border-slate-700 rounded-lg p-5 bg-slate-800/60 shadow-inner mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sky-300 uppercase tracking-wide">{data.task} <span className="text-sm font-normal text-slate-400 lowercase tracking-normal">({data.modality})</span></h3>
          <span className="text-sm font-medium text-violet-200 bg-violet-900/40 px-2 py-1 rounded border border-violet-700">{data.model}</span>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">Metrics</h4>
          <p className="text-xs text-slate-400">{insightText}</p>
          {primaryMetrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {primaryMetrics.slice(0, 3).map(([metricName, value]) => {
                const numVal = value as number;
                const isWer = metricName.toLowerCase().includes('wer');
                return (
                  <div key={`primary-${metricName}`} className="bg-slate-900 p-3 rounded-md border border-slate-700">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                      {formatMetricName(metricName)}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-100">{numVal.toFixed(4)}</div>
                    <div className={`text-[11px] mt-1 ${isWer ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isWer ? 'Lower is better' : 'Higher is better'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metricEntries.map(([metricName, value]) => {
              const numVal = value as number;
              // WER is a "lower is better" metric — invert the bar so a low WER
              // shows a nearly-full green bar, not a nearly-empty one.
              const isWer = metricName.toLowerCase().includes('wer');
              const maxVal = numVal > 1 ? 100 : 1;
              const rawPct = Math.min(100, Math.max(0, (numVal / maxVal) * 100));
              const percentage = isWer ? 100 - rawPct : rawPct;
              const barColor = isWer ? 'bg-amber-400' : 'bg-blue-500';

              return (
                <div key={metricName} className="bg-slate-900 p-4 rounded-md border border-slate-700 shadow-sm">
                  <div className="flex justify-between items-end mb-2">
                    <span
                      className="text-xs font-semibold text-slate-400 uppercase tracking-wider break-words"
                      title={metricName}
                    >
                      {formatMetricName(metricName)}
                      {isWer && (
                        <span className="ml-1 normal-case font-normal text-amber-500">(lower is better)</span>
                      )}
                    </span>
                    <span className="text-xl font-bold text-slate-100">
                      {numVal.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-2 border border-slate-700">
                    <div
                      className={`${barColor} h-2 rounded-full transition-all duration-1000`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          {metricEntries.length === 0 && (
            <p className="text-sm text-slate-400">No numeric metrics were returned for this run.</p>
          )}
        </div>
      </div>

      {data.trajectory && data.trajectory.length > 0 && (
        <div className="border border-slate-700 rounded-lg p-5 bg-slate-800/60 shadow-inner">
          <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-4">Agent Trajectory</h4>
          <div className="space-y-4 pl-2 border-l-2 border-slate-600 ml-2">
            {data.trajectory.map((step, idx) => (
              <div key={idx} className="relative pl-6">
                <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                  step.role === 'user' ? 'bg-indigo-500' : 
                  step.role === 'assistant' ? 'bg-green-500' : 'bg-orange-500'
                }`}></span>
                <div className="bg-slate-900 p-3 rounded border border-slate-700 shadow-sm relative">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                    <span>{step.role}</span>
                    <span className="text-[10px] bg-gray-100 px-1 rounded">{step.source}</span>
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
                    {step.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.modality === 'vision' && (visionSamples.length > 0 || hasFallbackPreview) && (
        <div className="border border-slate-700 rounded-lg p-5 bg-slate-800/60 shadow-inner mt-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h4 className="text-sm font-semibold text-slate-300">Evaluated Images</h4>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">
                Showing {totalVisible} / {visionSamples.length}
              </span>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showFailedOnly}
                  onChange={(e) => setShowFailedOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Failed only ({failedCount})
              </label>
            </div>
          </div>

          {showFailedOnly && visibleVisionSamples.length === 0 && (
            <p className="text-sm text-slate-400">No failed samples found in this run.</p>
          )}

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleVisionSamples.map((sample, idx) => (
              <div key={`${sample.id}-${idx}`} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">Sample #{String(sample.id)}</span>
                  {typeof sample.is_correct === 'boolean' && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      sample.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sample.is_correct ? 'Correct' : 'Failed'}
                    </span>
                  )}
                </div>
                {sample.question && (
                  <div className="mb-2 text-xs text-gray-700 line-clamp-2" title={sample.question}>
                    <span className="font-semibold text-gray-600">Question:</span> {sample.question}
                  </div>
                )}
                <img
                  src={`data:${sample.image_mime_type || 'image/jpeg'};base64,${sample.image_base64}`}
                  alt={`Vision sample ${idx + 1}`}
                  className="w-full h-40 object-contain rounded border bg-gray-50 cursor-zoom-in"
                  onClick={() => setSelectedVisionIndex(idx)}
                />
                <div className="mt-2 text-xs text-gray-700 space-y-1">
                  {sample.target && (
                    <div>
                      <span className="font-semibold">Target:</span>{' '}
                      <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded">{sample.target}</span>
                    </div>
                  )}
                  {sample.prediction && (
                    <div>
                      <span className="font-semibold">Prediction:</span>{' '}
                      <span className="inline-block bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{sample.prediction}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {visionSamples.length === 0 && data.input_preview && (
              <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                <img
                  src={`data:image/jpeg;base64,${data.input_preview}`}
                  alt="Evaluated vision input"
                  className="w-full h-40 object-contain rounded border bg-gray-50"
                />
                <div className="mt-2 text-xs text-gray-500">
                  Preview fallback from result payload (`input_preview`).
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {selectedVisionSample && (
        <div
          className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center"
          onClick={() => setSelectedVisionIndex(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Sample #{String(selectedVisionSample.id)}
                </h3>
                {typeof selectedVisionSample.is_correct === 'boolean' && (
                  <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full ${
                    selectedVisionSample.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedVisionSample.is_correct ? 'Correct' : 'Failed'}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedVisionIndex(null)}
                className="text-slate-300 hover:text-white text-sm border border-slate-600 rounded-md px-2 py-1"
              >
                Close
              </button>
            </div>

            <img
              src={`data:${selectedVisionSample.image_mime_type || 'image/jpeg'};base64,${selectedVisionSample.image_base64}`}
              alt={`Vision sample ${String(selectedVisionSample.id)}`}
              className="w-full max-h-[55vh] object-contain rounded border border-slate-700 bg-slate-950"
            />

            <div className="mt-4 space-y-2 text-sm text-slate-200">
              {selectedVisionSample.question && (
                <div>
                  <span className="font-semibold text-slate-300">Full question:</span>
                  <p className="mt-1 whitespace-pre-wrap text-slate-100">{selectedVisionSample.question}</p>
                </div>
              )}
              {selectedVisionSample.target && (
                <div><span className="font-semibold text-slate-300">Target:</span> {selectedVisionSample.target}</div>
              )}
              {selectedVisionSample.prediction && (
                <div><span className="font-semibold text-slate-300">Prediction:</span> {selectedVisionSample.prediction}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}