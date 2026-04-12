import type { EvalResults } from '../lib/api';

interface Props {
  data: EvalResults;
}

export default function Results({ data }: Props) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Evaluation Complete 
        <span className="ml-auto text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{data.engine}</span>
      </h2>
      
      <div className="border border-gray-100 rounded-lg p-5 bg-gray-50 shadow-inner mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-blue-900 uppercase tracking-wide">{data.task} <span className="text-sm font-normal text-gray-500 lowercase tracking-normal">({data.modality})</span></h3>
          <span className="text-sm font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">{data.model}</span>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-600 border-b pb-2">Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data.metrics || {}).map(([metricName, value]) => {
              const numVal = typeof value === 'number' ? value : 0;
              // WER is a "lower is better" metric — invert the bar so a low WER
              // shows a nearly-full green bar, not a nearly-empty one.
              const isWer = metricName.toLowerCase() === 'wer';
              const maxVal = numVal > 1 ? 100 : 1;
              const rawPct = Math.min(100, Math.max(0, (numVal / maxVal) * 100));
              const percentage = isWer ? 100 - rawPct : rawPct;
              const barColor = isWer ? 'bg-amber-400' : 'bg-blue-500';

              return (
                <div key={metricName} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-end mb-2">
                    <span
                      className="text-xs font-semibold text-gray-500 uppercase tracking-wider break-words"
                      title={metricName}
                    >
                      {metricName}
                      {isWer && (
                        <span className="ml-1 normal-case font-normal text-amber-500">(lower is better)</span>
                      )}
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {numVal.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-2 border border-gray-200">
                    <div
                      className={`${barColor} h-2 rounded-full transition-all duration-1000`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {data.trajectory && data.trajectory.length > 0 && (
        <div className="border border-gray-100 rounded-lg p-5 bg-gray-50 shadow-inner">
          <h4 className="text-sm font-semibold text-gray-600 border-b pb-2 mb-4">Agent Trajectory</h4>
          <div className="space-y-4 pl-2 border-l-2 border-gray-200 ml-2">
            {data.trajectory.map((step, idx) => (
              <div key={idx} className="relative pl-6">
                <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                  step.role === 'user' ? 'bg-indigo-500' : 
                  step.role === 'assistant' ? 'bg-green-500' : 'bg-orange-500'
                }`}></span>
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm relative">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex justify-between">
                    <span>{step.role}</span>
                    <span className="text-[10px] bg-gray-100 px-1 rounded">{step.source}</span>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {step.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}