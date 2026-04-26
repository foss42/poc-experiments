import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { generateServerProject, previewServerCode } from '../../utils/codeGenerator';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function ExportServerModal({ isOpen, onClose, server }) {
  const [activeTab, setActiveTab] = useState('preview');
  const [previewCode, setPreviewCode] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && server) {
      setPreviewCode(previewServerCode(server));
    }
  }, [isOpen, server]);

  const handleDownloadZip = async () => {
    if (!server) return;

    setIsExporting(true);
    try {
      const files = generateServerProject(server);
      const zip = new JSZip();

      // Add all files to the zip
      Object.entries(files).forEach(([path, content]) => {
        zip.file(path, content);
      });

      // Generate and download the zip
      const blob = await zip.generateAsync({ type: 'blob' });
      const projectName = server.name.toLowerCase().replace(/\s+/g, '-');
      saveAs(blob, `${projectName}.zip`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(previewCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  if (!server) return null;

  const toolCount = server.tools?.length || 0;
  const resourceCount = server.resources?.length || 0;
  const promptCount = server.prompts?.length || 0;
  const totalPrimitives = toolCount + resourceCount + promptCount;

  // Validation warnings
  const warnings = [];
  if (totalPrimitives === 0) {
    warnings.push('Server has no tools, resources, or prompts defined.');
  }
  server.tools?.forEach(tool => {
    if (!tool.nodes || tool.nodes.length < 2) {
      warnings.push(`Tool "${tool.name}" has an incomplete workflow.`);
    }
  });
  server.prompts?.forEach(prompt => {
    if (!prompt.messages || prompt.messages.length === 0) {
      warnings.push(`Prompt "${prompt.name}" has no messages defined.`);
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Server">
      <div className="space-y-4">
        {/* Server Summary */}
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium text-neutral-900 mb-2">{server.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {server.description || 'No description'}
          </p>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-neutral-600">{toolCount} Tool{toolCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-neutral-600">{resourceCount} Resource{resourceCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-neutral-600">{promptCount} Prompt{promptCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Validation Warnings */}
        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 mt-0.5 flex-shrink-0">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">Warnings</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Preview Code
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Project Files
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'preview' ? (
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-border rounded-md hover:bg-muted transition-colors"
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-xs overflow-auto max-h-64 scrollbar-thin">
              <code>{previewCode}</code>
            </pre>
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-neutral-600 space-y-2">
              <p className="font-medium text-neutral-900 mb-3">Generated project structure:</p>
              <div className="font-mono text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">📁</span>
                  <span>{server.name.toLowerCase().replace(/\s+/g, '-')}/</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-blue-500">📁</span>
                  <span>src/</span>
                </div>
                <div className="flex items-center gap-2 pl-8">
                  <span className="text-green-500">📄</span>
                  <span>index.ts</span>
                  <span className="text-muted-foreground">- Main server code</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-yellow-500">📄</span>
                  <span>package.json</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-yellow-500">📄</span>
                  <span>tsconfig.json</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-neutral-500">📄</span>
                  <span>README.md</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-neutral-500">📄</span>
                  <span>.gitignore</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download ZIP
            </>
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          After downloading, run <code className="bg-muted px-1 py-0.5 rounded">npm install && npm run build</code> to build your server.
        </p>
      </div>
    </Modal>
  );
}
