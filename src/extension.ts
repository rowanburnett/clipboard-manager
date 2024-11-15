import * as vscode from 'vscode';
import { ClipboardManager } from './clipboardManager';
import { ClipboardStorageManager } from './clipboardStorageManager';
import { ClipboardWebviewProvider } from './clipboardWebviewProvider';

let clipboardManager: ClipboardManager;

export function activate(context: vscode.ExtensionContext) {
    const storageManager = new ClipboardStorageManager(context);
    clipboardManager = new ClipboardManager(storageManager);
    
    const provider = new ClipboardWebviewProvider(context.extensionUri, clipboardManager);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('clipboardManagerView', provider),
        vscode.commands.registerCommand('clipboardManager.showClipboard', () => {
            vscode.commands.executeCommand('workbench.view.extension.clipboardManagerView');
        }),
        vscode.workspace.onDidChangeTextDocument(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                clipboardManager.checkClipboard();
            }
        })
    );
}

export function deactivate() {}