import * as vscode from 'vscode';
import { ClipboardManager } from './clipboardManager';

export class ClipboardWebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private clipboardManager: ClipboardManager;

    constructor(
        private readonly extensionUri: vscode.Uri,
        clipboardManager: ClipboardManager
    ) {
        this.clipboardManager = clipboardManager;
        this.clipboardManager.onHistoryChange(() => this.updateView());
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'insert':
                    await this.clipboardManager.insertClipboardItem(data.value);
                    break;
                case 'togglePin':
                    this.clipboardManager.togglePin(data.id);
                    break;
                    case 'deleteAll':
                        this.clipboardManager.deleteAll();
                case 'deleteItem':
                    this.clipboardManager.deleteItem(data.id);
                    break;
                case 'ready':
                    this.updateView();
                    break;
            }
        });
        this.updateView();
    }

    private updateView() {
        if (this.view) {
            const history = this.clipboardManager.getHistory();
            this.view.webview.postMessage({
                type: 'updateHistory',
                history: history
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Clipboard Manager</title>
                <style>
                    body {
                        padding: 10px;
                    }
                    #searchInput {
                        width: 100%;
                        margin-bottom: 10px;
                        padding: 5px;
                    }
                    .clipboard-item {
                        padding: 5px;
                        margin-bottom: 5px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        position: relative;
                        padding-right: 50px;
                    }
                    .clipboard-content {
                        flex-grow: 1;
                        overflow: hidden;
                    }
                    .button-container {
                        position: absolute;
                        right: 5px;
                        top: 5px;
                        display: flex;
                        gap: 4px;
                    }
                    .action-button {
                        cursor: pointer;
                        padding: 2px 4px;
                        user-select: none;
                        width: 14px;
                        text-align: center;
                        display: inline-block;
                    }
                    .pin-button {
                        color: var(--vscode-textLink-foreground);
                    }
                    .pin-button.pinned {
                        color: var(--vscode-inputValidation-infoBackground);
                    }
                    mark {
                        background-color: var(--vscode-editor-findMatchHighlightBackground, #ffd700);
                        color: var(--vscode-editor-foreground);
                    }
                    .clipboard-preview {
                        white-space: normal;
                        line-height: 1.4;
                    }
                    .clipboard-full {
                        display: none;
                        white-space: pre-wrap;
                        word-break: break-all;
                    }
                    .clipboard-item.expanded .clipboard-preview {
                        display: none;
                    }
                    .clipboard-item.expanded .clipboard-full {
                        display: block;
                    }
/* At the beginning of your style section */
::-webkit-scrollbar {
    width: 10px; /* Consistent width */
}

::-webkit-scrollbar-track {
    background: var(--vscode-scrollbarSlider-background);
}

::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-hoverBackground);
}

/* Update the .clipboard-item style */
.clipboard-item {
    /* existing styles */
    border: 1px solid var(--vscode-input-border);
}

.clipboard-item.pinned {
    border: 1px solid var(--vscode-inputValidation-infoBackground);
    background-color: var(--vscode-inputValidation-infoBorder, rgba(100, 100, 255, 0.1));
}

/* Add at the top of the body */
.controls {
    display: flex;
    margin-bottom: 10px;
    gap: 10px;
}

#searchInput {
    flex-grow: 1;
}

.delete-all-button {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 5px 10px;
    cursor: pointer;
}

.delete-button {
    color: var(--vscode-errorForeground);
}

.clipboard-item {
    padding: 5px;
    margin-bottom: 5px;
    cursor: pointer;
    border: 1px solid var(--vscode-input-border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    padding-right: 65px; /* Increased from 50px to accommodate the delete button */
    min-height: 22px; /* Ensure minimum height for buttons */
}

.clipboard-content {
    flex-grow: 1;
    overflow: hidden;
    margin-right: 5px; /* Add some space between content and buttons */
    word-break: break-all; /* Break long words */
}

.button-container {
    position: absolute;
    right: 5px;
    top: 5px;
    display: flex;
    gap: 4px;
    background: var(--vscode-editor-background); /* Match the background */
    padding-left: 5px; /* Add some padding to separate from text */
}

/* Add styles for the delete all button */
#deleteAllButton {
    margin-bottom: 10px;
    padding: 5px 10px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    cursor: pointer;
    width: 100%;
}

#deleteAllButton:hover {
    background-color: var(--vscode-button-hoverBackground);
}

.confirmation-buttons {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
    gap: 8px;
}

.confirmation-button {
    padding: 4px 8px;
    cursor: pointer;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
}

.confirmation-button:hover {
    background-color: var(--vscode-button-hoverBackground);
}

.confirmation-button.cancel {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
}

.confirmation-button.cancel:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
}

.overlay {
    position: fixed; /* Change from absolute to fixed */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
    display: none;
}

.confirmation-dialog {
    position: fixed; /* Change from absolute to fixed */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - 40px); /* Responsive width */
    max-width: 300px; /* Maximum width */
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 15px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.overlay.show {
    display: block;
}

.confirmation-buttons {
    display: flex;
    justify-content: flex-end;
    margin-top: 15px;
    gap: 8px;
}

.confirmation-button {
    padding: 6px 12px;
    cursor: pointer;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 2px;
}

.confirmation-button:hover {
    background-color: var(--vscode-button-hoverBackground);
}

.confirmation-button.cancel {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
}

.confirmation-button.cancel:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
}
    
                </style>
            </head>
            <body>
                    <input type="text" id="searchInput" placeholder="Search clipboard history...">
                    <button id="deleteAllButton">Delete All</button>
                    <div id="overlay" class="overlay">
                        <div id="confirmationDialog" class="confirmation-dialog">
                            <div>Are you sure you want to delete all clipboard items?</div>
                            <div class="confirmation-buttons">
                                <button class="confirmation-button cancel" id="cancelDelete">Cancel</button>
                                <button class="confirmation-button" id="confirmDelete">Delete All</button>
                            </div>
                        </div>
                    </div>
                    <div id="clipboardList"></div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let clipboardHistory = [];
    
                    const previousState = vscode.getState();
                    if (previousState) {
                        clipboardHistory = previousState.history || [];
                        renderClipboardItems(clipboardHistory);
                    }
    
                    vscode.postMessage({ type: 'ready' });
    
                    document.getElementById('searchInput').addEventListener('input', (e) => {
                        filterItems(e.target.value);
                    });


function deleteAll() {
    vscode.postMessage({
        type: 'deleteAll'
    });
}

document.getElementById('deleteAllButton').addEventListener('click', () => {
    if (clipboardHistory.length > 0) {
        document.getElementById('overlay').classList.add('show');
    }
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('overlay').classList.remove('show');
});

document.getElementById('confirmDelete').addEventListener('click', () => {
    document.getElementById('overlay').classList.remove('show');
    vscode.postMessage({
        type: 'deleteAll'
    });
});

// Add this function to update the delete all button state
function updateDeleteAllButton() {
    const deleteAllButton = document.getElementById('deleteAllButton');
    if (clipboardHistory.length === 0) {
        deleteAllButton.disabled = true;
        deleteAllButton.style.opacity = '0.5';
    } else {
        deleteAllButton.disabled = false;
        deleteAllButton.style.opacity = '1';
    }
}



                    function escapeHtml(unsafe) {
                        return unsafe
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }
    
                    function highlightText(text, searchTerm) {
                        if (!searchTerm) return escapeHtml(text);
                        const escapedSearchTerm = searchTerm.replace(/[.*+?^$\{}()|[\\]\\\\]/g, '\\\\$&');
                        return escapeHtml(text).replace(new RegExp(escapedSearchTerm, 'gi'), match => \`<mark>\${match}</mark>\`);
                    }
    
                    function getContextSnippet(text, searchTerm, contextLength = 20) {
                        if (!searchTerm) return text.length > contextLength * 2 ? text.slice(0, contextLength * 2) + '...' : text;
    
                        const escapedSearchTerm = searchTerm.replace(/[.*+?^$\{}()|[\\]\\\\]/g, '\\\\$&');
                        const regex = new RegExp(escapedSearchTerm, 'gi');
                        const matches = Array.from(text.matchAll(regex));
                        
                        if (matches.length === 0) return text.length > contextLength * 2 ? text.slice(0, contextLength * 2) + '...' : text;
    
                        let snippets = matches.map(match => {
                            const start = Math.max(0, match.index - contextLength);
                            const end = Math.min(text.length, match.index + searchTerm.length + contextLength);
                            let snippet = text.slice(start, end);
                            
                            if (start > 0) snippet = '...' + snippet;
                            if (end < text.length) snippet = snippet + '...';
                            
                            return snippet;
                        });
    
                        snippets = snippets.reduce((acc, current) => {
                            if (acc.length === 0) return [current];
                            
                            const last = acc[acc.length - 1];
                            const lastWithoutEllipsis = last.replace(/\\.{3}/g, '');
                            const currentWithoutEllipsis = current.replace(/\\.{3}/g, '');
                            
                            if (last.includes(currentWithoutEllipsis) || current.includes(lastWithoutEllipsis)) {
                                return acc;
                            }
                            
                            return [...acc, current];
                        }, []);
    
                        return snippets.join(' | ');
                    }
    
                    function filterItems(searchText) {
                        const filteredHistory = clipboardHistory.filter(item =>
                            item.content.toLowerCase().includes(searchText.toLowerCase())
                        );
                        renderClipboardItems(filteredHistory, searchText);
                    }
    
                    function renderClipboardItems(items, searchText = '') {
                        const listElement = document.getElementById('clipboardList');
                        listElement.innerHTML = '';
                        
                        items.forEach(item => {
                            const itemElement = document.createElement('div');
                            // itemElement.className = 'clipboard-item';
                            itemElement.className = \`clipboard-item\${item.isPinned ? ' pinned' : ''}\`;

                            
                            const contentElement = document.createElement('div');
                            contentElement.className = 'clipboard-content';
                            
                            const previewElement = document.createElement('div');
                            previewElement.className = 'clipboard-preview';
                            const previewContent = getContextSnippet(item.content, searchText);
                            previewElement.innerHTML = highlightText(previewContent, searchText);
                            
                            const fullElement = document.createElement('div');
                            fullElement.className = 'clipboard-full';
                            fullElement.innerHTML = highlightText(item.content, searchText);
                            
                            contentElement.appendChild(previewElement);
                            contentElement.appendChild(fullElement);
                            
                            const buttonContainer = document.createElement('div');
                            buttonContainer.className = 'button-container';
    
                            const pinButton = document.createElement('span');
                            pinButton.className = 'action-button pin-button' + (item.isPinned ? ' pinned' : '');
                            pinButton.textContent = item.isPinned ? '📌' : '📍';
                            pinButton.title = 'Pin/Unpin';
                            pinButton.addEventListener('click', (e) => {
                                e.stopPropagation();
                                vscode.postMessage({
                                    type: 'togglePin',
                                    id: item.id
                                });
                            });
    
                            const expandButton = document.createElement('span');
                            expandButton.className = 'action-button expand-button';
                            expandButton.textContent = '+';
                            expandButton.title = 'Expand/Collapse';
                            expandButton.addEventListener('click', (e) => {
                                e.stopPropagation();
                                itemElement.classList.toggle('expanded');
                                expandButton.textContent = itemElement.classList.contains('expanded') ? '−' : '+';
                            });
                            
                            buttonContainer.appendChild(pinButton);
                            buttonContainer.appendChild(expandButton);
                            
                            itemElement.appendChild(contentElement);
                            itemElement.appendChild(buttonContainer);

                            const deleteButton = document.createElement('span');
                            deleteButton.className = 'action-button delete-button';
                            deleteButton.textContent = '🗑️';
                            deleteButton.title = 'Delete';
                            deleteButton.addEventListener('click', (e) => deleteItem(item.id, e));
                            
                            buttonContainer.appendChild(deleteButton);
                            
                            contentElement.addEventListener('click', () => {
                                vscode.postMessage({
                                    type: 'insert',
                                    value: item
                                });
                            });
                            
                            listElement.appendChild(itemElement);
                            
                        });
                        updateDeleteAllButton();
                    }
    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'updateHistory':
                                clipboardHistory = message.history;
                                vscode.setState({ history: clipboardHistory });
                                filterItems(document.getElementById('searchInput').value);
                                document.getElementById('overlay').classList.remove('show');
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}