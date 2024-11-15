import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ClipboardItem {
    id: string;
    content: string;
    isPinned: boolean;
    timestamp: number;
}

export class ClipboardStorageManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private getStorageFilePath(): string | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }
        return path.join(workspaceFolder.uri.fsPath, '.vscode', 'clipboard-history.json');
    }

    public async saveHistory(history: ClipboardItem[]): Promise<void> {
        const filePath = this.getStorageFilePath();
        if (!filePath) {
            return;
        }

        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(history), 'utf8');
    }

    public async loadHistory(): Promise<ClipboardItem[]> {
        const filePath = this.getStorageFilePath();
        if (!filePath || !fs.existsSync(filePath)) {
            return [];
        }

        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }
}