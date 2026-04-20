// Webview Panel Manager - Creates and manages the request editor UI
// This connects the HTML/CSS/JS Webview to the Extension Host via postMessage

import * as vscode from 'vscode';
import { sendHttpRequest } from '../http_client';
import { generateCode, CodegenLanguage } from '../codegen/codegen';
import { RequestModel, ResponseModel, createEmptyRequest } from '../models/request_model';

export class RequestPanel {
  public static currentPanel: RequestPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _currentRequest: RequestModel;
  private _disposables: vscode.Disposable[] = [];

  // Callback when request changes (for updating sidebar)
  public onRequestChanged?: (request: RequestModel) => void;

  public static createOrShow(context: vscode.ExtensionContext, existingRequest?: RequestModel): RequestPanel {
    const column = vscode.ViewColumn.One;

    if (RequestPanel.currentPanel) {
      RequestPanel.currentPanel._panel.reveal(column);
      if (existingRequest) {
        RequestPanel.currentPanel._currentRequest = existingRequest;
        RequestPanel.currentPanel._sendRequestToWebview();
      }
      return RequestPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'apidashRequest',
      'API Dash',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    RequestPanel.currentPanel = new RequestPanel(panel, context.extensionUri, existingRequest);
    return RequestPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, existingRequest?: RequestModel) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._currentRequest = existingRequest || createEmptyRequest();

    this._panel.webview.html = this._getHtmlContent();

    // Handle messages from the Webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendRequest':
            await this._handleSendRequest(message.request);
            break;
          case 'generateCode':
            this._handleGenerateCode(message.request, message.language);
            break;
          case 'requestUpdated':
            this._currentRequest = { ...this._currentRequest, ...message.request };
            if (this.onRequestChanged) {
              this.onRequestChanged(this._currentRequest);
            }
            break;
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async _handleSendRequest(requestData: Partial<RequestModel>): Promise<void> {
    this._currentRequest = { ...this._currentRequest, ...requestData };

    // Tell webview we're loading
    this._panel.webview.postMessage({ command: 'loading' });

    try {
      const response = await sendHttpRequest(this._currentRequest);
      this._panel.webview.postMessage({
        command: 'response',
        response,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'response',
        response: {
          statusCode: 0,
          body: `Error: ${String(error)}`,
          headers: {},
          time: 0,
          size: 0,
          contentType: 'text/plain',
        } as ResponseModel,
      });
    }

    if (this.onRequestChanged) {
      this.onRequestChanged(this._currentRequest);
    }
  }

  private _handleGenerateCode(requestData: Partial<RequestModel>, language: CodegenLanguage): void {
    this._currentRequest = { ...this._currentRequest, ...requestData };
    const code = generateCode(this._currentRequest, language);
    this._panel.webview.postMessage({
      command: 'generatedCode',
      code,
      language,
    });
  }

  private _sendRequestToWebview(): void {
    this._panel.webview.postMessage({
      command: 'loadRequest',
      request: this._currentRequest,
    });
  }

  public getCurrentRequest(): RequestModel {
    return this._currentRequest;
  }

  public dispose(): void {
    RequestPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }

  private _getHtmlContent(): string {
    const cssUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'request_editor.css')
    );
    const jsUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'request_editor.js')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${cssUri}" rel="stylesheet">
  <title>API Dash</title>
</head>
<body>
  <div class="app">
    <!-- Request Bar -->
    <div class="request-bar">
      <select id="method-select">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
        <option value="PATCH">PATCH</option>
        <option value="HEAD">HEAD</option>
        <option value="OPTIONS">OPTIONS</option>
      </select>
      <input type="text" id="url-input" placeholder="Enter URL (e.g., https://api.github.com/users)" spellcheck="false">
      <button id="send-btn">Send</button>
    </div>

    <!-- Request Tabs -->
    <div class="tabs">
      <button class="tab active" data-tab="params">Params</button>
      <button class="tab" data-tab="headers">Headers</button>
      <button class="tab" data-tab="body">Body</button>
    </div>

    <!-- Params Tab -->
    <div class="tab-content active" id="params-tab">
      <div class="kv-table" id="params-table">
        <div class="kv-row kv-header">
          <span class="kv-check"></span>
          <span class="kv-name">Name</span>
          <span class="kv-value">Value</span>
          <span class="kv-action"></span>
        </div>
      </div>
      <button class="add-row-btn" data-table="params-table">+ Add Parameter</button>
    </div>

    <!-- Headers Tab -->
    <div class="tab-content" id="headers-tab">
      <div class="kv-table" id="headers-table">
        <div class="kv-row kv-header">
          <span class="kv-check"></span>
          <span class="kv-name">Name</span>
          <span class="kv-value">Value</span>
          <span class="kv-action"></span>
        </div>
      </div>
      <button class="add-row-btn" data-table="headers-table">+ Add Header</button>
    </div>

    <!-- Body Tab -->
    <div class="tab-content" id="body-tab">
      <div class="body-controls">
        <select id="body-type">
          <option value="none">None</option>
          <option value="json">JSON</option>
          <option value="text">Text</option>
        </select>
      </div>
      <textarea id="body-editor" placeholder="Enter request body..." spellcheck="false" disabled></textarea>
    </div>

    <!-- Response Section -->
    <div class="response-section" id="response-section" style="display: none;">
      <div class="response-header">
        <h3>Response</h3>
        <div class="response-meta">
          <span class="status-badge" id="status-badge"></span>
          <span class="meta-item" id="response-time"></span>
          <span class="meta-item" id="response-size"></span>
        </div>
      </div>
      <div class="response-tabs">
        <button class="tab active" data-restab="body">Body</button>
        <button class="tab" data-restab="headers">Headers</button>
        <button class="tab" data-restab="codegen">Generate Code</button>
      </div>
      <div class="response-tab-content active" id="res-body-tab">
        <pre id="response-body"></pre>
      </div>
      <div class="response-tab-content" id="res-headers-tab">
        <pre id="response-headers"></pre>
      </div>
      <div class="response-tab-content" id="res-codegen-tab">
        <div class="codegen-controls">
          <select id="codegen-language">
            <option value="python">Python (requests)</option>
            <option value="javascript">JavaScript (fetch)</option>
            <option value="curl">cURL</option>
          </select>
          <button id="codegen-btn">Generate</button>
          <button id="copy-btn" style="display: none;">Copy</button>
        </div>
        <pre id="codegen-output"></pre>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div class="loading" id="loading" style="display: none;">
      <div class="spinner"></div>
      <span>Sending request...</span>
    </div>
  </div>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
