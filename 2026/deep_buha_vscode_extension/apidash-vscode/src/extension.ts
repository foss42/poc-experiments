// Extension Entry Point - The brain of the extension
// Registers commands, sets up sidebar, handles lifecycle

import * as vscode from 'vscode';
import { RequestPanel } from './webview/request_panel';
import { RequestTreeProvider } from './sidebar/request_tree_provider';
import { createEmptyRequest, RequestModel } from './models/request_model';

// Storage key for persisting requests
const STORAGE_KEY = 'apidash.savedRequests';

export function activate(context: vscode.ExtensionContext) {
    console.log('API Dash extension activated');

    // Load saved requests from globalState
    const savedRequests: RequestModel[] = context.globalState.get(STORAGE_KEY, []);

    // Set up sidebar TreeView
    const treeProvider = new RequestTreeProvider();
    treeProvider.setRequests(savedRequests);
    vscode.window.registerTreeDataProvider('apidash.requests', treeProvider);

    // Save helper
    function saveRequests() {
        context.globalState.update(STORAGE_KEY, treeProvider.getRequests());
    }

    // Command: New Request
    const newRequestCmd = vscode.commands.registerCommand('apidash.newRequest', () => {
        const request = createEmptyRequest();
        treeProvider.addRequest(request);
        saveRequests();

        const panel = RequestPanel.createOrShow(context, request);
        panel.onRequestChanged = (updated) => {
            // Update the request in the tree
            const requests = treeProvider.getRequests();
            const idx = requests.findIndex(r => r.id === updated.id);
            if (idx >= 0) {
                requests[idx] = updated;
                treeProvider.setRequests(requests);
                saveRequests();
            }
        };
    });

    // Command: Open existing request from sidebar
    const openRequestCmd = vscode.commands.registerCommand('apidash.openRequest', (requestId: string) => {
        const requests = treeProvider.getRequests();
        const request = requests.find(r => r.id === requestId);
        if (request) {
            const panel = RequestPanel.createOrShow(context, request);
            panel.onRequestChanged = (updated) => {
                const idx = requests.findIndex(r => r.id === updated.id);
                if (idx >= 0) {
                    requests[idx] = updated;
                    treeProvider.setRequests(requests);
                    saveRequests();
                }
            };
        }
    });

    // Command: Delete request
    const deleteRequestCmd = vscode.commands.registerCommand('apidash.deleteRequest', (item: any) => {
        if (item && item.request) {
            treeProvider.removeRequest(item.request.id);
            saveRequests();
        }
    });

    context.subscriptions.push(newRequestCmd, openRequestCmd, deleteRequestCmd);
}

export function deactivate() {
    console.log('API Dash extension deactivated');
}
