import * as vscode from 'vscode';
import { ClipboardStorageManager } from './clipboardStorageManager';

interface ClipboardItem {
    id: string;
    content: string;
    isPinned: boolean;
    timestamp: number;
}

export class ClipboardManager {
    private history: ClipboardItem[] = [];
    private lastClipboardContent: string = '';
    private storageManager: ClipboardStorageManager;
    private onHistoryChangeCallbacks: ((history: ClipboardItem[]) => void)[] = [];

    constructor(storageManager: ClipboardStorageManager) {
        this.storageManager = storageManager;
        this.loadHistory();
        this.startClipboardMonitoring();
    }

    private async loadHistory() {
        const config = vscode.workspace.getConfiguration('clipboardManager');
        if (config.get('persistHistory')) {
            this.history = await this.storageManager.loadHistory();
        }
    }

    private startClipboardMonitoring() {
        setInterval(() => this.checkClipboard(), 1000);
    }

    public async checkClipboard() {
        const clipboardContent = await vscode.env.clipboard.readText();
        if (clipboardContent !== this.lastClipboardContent && clipboardContent.trim() !== '') {
            this.addToHistory(clipboardContent);
            this.lastClipboardContent = clipboardContent;
        }
    }

    private addToHistory(content: string) {
        const config = vscode.workspace.getConfiguration('clipboardManager');
        const maxItems = config.get('maxHistoryItems') as number;

        const newItem: ClipboardItem = {
            id: Date.now().toString(),
            content,
            isPinned: false,
            timestamp: Date.now()
        };

        const existingIndex = this.history.findIndex(item => item.content === content);
        if (existingIndex !== -1) {
            this.history.splice(existingIndex, 1);
        }

        const pinnedItems = this.history.filter(item => item.isPinned);
        const unpinnedItems = this.history.filter(item => !item.isPinned);

        this.history = [
            ...pinnedItems,
            newItem,
            ...unpinnedItems
        ].slice(0, maxItems);
        
        this.notifyHistoryChange();
        
        if (config.get('persistHistory')) {
            this.storageManager.saveHistory(this.history);
        }
    }

    public togglePin(id: string) {
        const item = this.history.find(item => item.id === id);
        if (item) {
            item.isPinned = !item.isPinned;
            
            // Reorder items to keep pinned items at the top
            const pinnedItems = this.history.filter(item => item.isPinned)
                .sort((a, b) => b.timestamp - a.timestamp);
            const unpinnedItems = this.history.filter(item => !item.isPinned)
                .sort((a, b) => b.timestamp - a.timestamp);
            
            this.history = [...pinnedItems, ...unpinnedItems];
            
            this.notifyHistoryChange();
            this.storageManager.saveHistory(this.history);
        }
    }

    public getHistory(): ClipboardItem[] {
        return this.history;
    }

    public onHistoryChange(callback: (history: ClipboardItem[]) => void) {
        this.onHistoryChangeCallbacks.push(callback);
    }

    private notifyHistoryChange() {
        this.onHistoryChangeCallbacks.forEach(callback => callback(this.history));
    }

    public deleteAll() {
        const config = vscode.workspace.getConfiguration('clipboardManager');
        this.history = [];
        this.notifyHistoryChange();
        if (config.get('persistHistory')) {
            this.storageManager.saveHistory(this.history);
        }
    }

    public deleteItem(id: string) {
        this.history = this.history.filter(item => item.id !== id);
        this.notifyHistoryChange();
        if (vscode.workspace.getConfiguration('clipboardManager').get('persistHistory')) {
            this.storageManager.saveHistory(this.history);
        }
    }

    public async insertClipboardItem(item: ClipboardItem) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await editor.edit(editBuilder => {
                editor.selections.forEach(selection => {
                    editBuilder.replace(selection, item.content);
                });
            });
        }
    }
}