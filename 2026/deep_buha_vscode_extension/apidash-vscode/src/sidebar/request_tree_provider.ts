// Sidebar TreeView - Shows saved requests in the Activity Bar
// Replaces: API Dash's sidebar request list (Riverpod provider -> VS Code TreeView)

import * as vscode from 'vscode';
import { RequestModel, HTTPVerb } from '../models/request_model';

export class RequestTreeProvider implements vscode.TreeDataProvider<RequestTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<RequestTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private requests: RequestModel[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    setRequests(requests: RequestModel[]): void {
        this.requests = requests;
        this.refresh();
    }

    addRequest(request: RequestModel): void {
        this.requests.push(request);
        this.refresh();
    }

    removeRequest(id: string): void {
        this.requests = this.requests.filter(r => r.id !== id);
        this.refresh();
    }

    getRequests(): RequestModel[] {
        return this.requests;
    }

    getTreeItem(element: RequestTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): RequestTreeItem[] {
        return this.requests.map(req => new RequestTreeItem(req));
    }
}

class RequestTreeItem extends vscode.TreeItem {
    constructor(public readonly request: RequestModel) {
        const label = request.name || request.url || 'Untitled Request';
        super(label, vscode.TreeItemCollapsibleState.None);

        this.description = request.url ? `${request.method} ${request.url}` : '';
        this.tooltip = `${request.method} ${request.url}`;
        this.iconPath = new vscode.ThemeIcon(getMethodIcon(request.method));

        this.command = {
            command: 'apidash.openRequest',
            title: 'Open Request',
            arguments: [request.id],
        };
    }
}

function getMethodIcon(method: HTTPVerb): string {
    switch (method) {
        case 'GET': return 'arrow-down';
        case 'POST': return 'arrow-up';
        case 'PUT': return 'edit';
        case 'DELETE': return 'trash';
        case 'PATCH': return 'replace';
        default: return 'symbol-method';
    }
}
