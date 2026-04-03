import { useState, useCallback, useRef } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import JSZip from 'jszip';

export function ImportServerModal() {
  const {
    isImportServerModalOpen,
    closeImportServerModal,
    importServerFromManifest,
    importError,
    setImportError,
  } = useMcpStore();

  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setPreview(null);
    setIsDragging(false);
    setIsProcessing(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    closeImportServerModal();
  }, [closeImportServerModal, resetState]);

  const parseManifestFromZip = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);

      // Look for mcp-builder.manifest.json in the zip
      let manifestFile = null;
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (path.endsWith('mcp-builder.manifest.json') && !zipEntry.dir) {
          manifestFile = zipEntry;
          break;
        }
      }

      if (!manifestFile) {
        throw new Error('No mcp-builder.manifest.json found in ZIP file');
      }

      const content = await manifestFile.async('string');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse ZIP: ${error.message}`);
    }
  };

  const parseManifestFromJson = async (file) => {
    try {
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  };

  const processFile = async (file) => {
    setIsProcessing(true);
    setImportError(null);

    try {
      let manifest;

      if (file.name.endsWith('.zip')) {
        manifest = await parseManifestFromZip(file);
      } else if (file.name.endsWith('.json')) {
        manifest = await parseManifestFromJson(file);
      } else {
        throw new Error('Unsupported file type. Please use .zip or .json files.');
      }

      // Validate manifest
      if (!manifest.server) {
        throw new Error('Invalid manifest: missing server data');
      }

      setPreview({
        manifest,
        fileName: file.name,
      });
    } catch (error) {
      setImportError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (preview?.manifest) {
      const success = importServerFromManifest(preview.manifest);
      if (success) {
        handleClose();
      }
    }
  }, [preview, importServerFromManifest, handleClose]);

  if (!isImportServerModalOpen) return null;

  const server = preview?.manifest?.server;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-neutral-900">Import Server</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!preview ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-border hover:border-neutral-400 hover:bg-neutral-50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-8 w-8 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground mb-3">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm text-neutral-700 mb-1">
                      Drop a ZIP or manifest.json file here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </>
                )}
              </div>

              {importError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{importError}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-neutral-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-900 truncate">
                      {server?.name || 'Unknown Server'}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {preview.fileName}
                    </p>
                  </div>
                </div>

                {server?.description && (
                  <p className="mt-3 text-sm text-neutral-600 line-clamp-2">
                    {server.description}
                  </p>
                )}

                <div className="mt-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span className="text-neutral-600">
                      {server?.tools?.length || 0} tools
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-neutral-600">
                      {server?.resources?.length || 0} resources
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-neutral-600">
                      {server?.prompts?.length || 0} prompts
                    </span>
                  </div>
                </div>
              </div>

              {importError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{importError}</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setPreview(null);
                    setImportError(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-border rounded-md hover:bg-neutral-50 transition-colors"
                >
                  Choose Different File
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors"
                >
                  Import Server
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
