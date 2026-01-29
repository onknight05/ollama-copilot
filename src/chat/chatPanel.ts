import * as vscode from 'vscode';
import { OllamaClient, OllamaChatMessage } from '../ollamaClient';

interface Conversation {
    id: string;
    title: string;
    messages: OllamaChatMessage[];
    createdAt: number;
    updatedAt: number;
}

interface ConversationStorage {
    conversations: Conversation[];
    currentConversationId: string | null;
}

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    public static readonly viewType = 'ollama-chat-panel';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private ollamaClient: OllamaClient;
    private context: vscode.ExtensionContext;
    private chatHistory: OllamaChatMessage[] = [];
    private currentConversationId: string | null = null;
    private conversations: Map<string, Conversation> = new Map();

    public static createOrShow(
        extensionUri: vscode.Uri,
        ollamaClient: OllamaClient,
        context: vscode.ExtensionContext
    ) {
        const column = vscode.ViewColumn.Beside;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            `Ollama Chat`,
            {
                viewColumn: column,
                preserveFocus: true
            },
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        // Set panel icon
        panel.iconPath = vscode.Uri.joinPath(extensionUri, 'resources', 'icon.svg');

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, ollamaClient, context);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        ollamaClient: OllamaClient,
        context: vscode.ExtensionContext
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.ollamaClient = ollamaClient;
        this.context = context;

        this.loadConversationsFromStorage();
        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (data) => {
                switch (data.type) {
                    case 'sendMessage':
                        await this.handleUserMessage(data.message);
                        break;
                    case 'clearChat':
                        this.clearChat();
                        break;
                    case 'newConversation':
                        this.handleNewConversation();
                        break;
                    case 'switchConversation':
                        this.handleSwitchConversation(data.id);
                        break;
                    case 'deleteConversation':
                        this.handleDeleteConversation(data.id);
                        break;
                    case 'getConversations':
                        this.sendConversationsList();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    private loadConversationsFromStorage(): void {
        const storage = this.context.globalState.get<ConversationStorage>('ollama-conversations');
        if (storage) {
            storage.conversations.forEach(conv => {
                this.conversations.set(conv.id, conv);
            });
        }
    }

    private saveConversationsToStorage(): void {
        const storage: ConversationStorage = {
            conversations: Array.from(this.conversations.values()),
            currentConversationId: this.currentConversationId
        };
        this.context.globalState.update('ollama-conversations', storage);
    }

    private createNewConversation(): Conversation {
        const conversation: Conversation = {
            id: this.generateId(),
            title: 'New Conversation',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.conversations.set(conversation.id, conversation);
        this.currentConversationId = conversation.id;
        this.chatHistory = conversation.messages;
        this.saveConversationsToStorage();
        return conversation;
    }

    private switchToConversation(id: string): void {
        if (this.conversations.has(id)) {
            this.currentConversationId = id;
            this.chatHistory = this.conversations.get(id)!.messages;
            this.saveConversationsToStorage();
        }
    }

    private deleteConversation(id: string): void {
        this.conversations.delete(id);
        if (this.currentConversationId === id) {
            this.currentConversationId = null;
            this.chatHistory = [];
        }
        this.saveConversationsToStorage();
    }

    private updateConversationTitle(message: string): void {
        if (this.currentConversationId && this.conversations.has(this.currentConversationId)) {
            const conv = this.conversations.get(this.currentConversationId)!;
            if (conv.title === 'New Conversation') {
                conv.title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
                this.saveConversationsToStorage();
            }
        }
    }

    private getConversationsList(): Conversation[] {
        return Array.from(this.conversations.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    private handleNewConversation(): void {
        const conversation = this.createNewConversation();
        this.sendConversationsList();
        this._panel.webview.postMessage({
            type: 'conversationChanged',
            conversationId: conversation.id,
            messages: []
        });
    }

    private handleSwitchConversation(id: string): void {
        this.switchToConversation(id);
        this.sendCurrentMessages();
        this.sendConversationsList();
    }

    private handleDeleteConversation(id: string): void {
        this.deleteConversation(id);
        this.sendConversationsList();
        this._panel.webview.postMessage({
            type: 'conversationChanged',
            conversationId: this.currentConversationId,
            messages: this.chatHistory.map(m => ({ role: m.role, content: m.content }))
        });
    }

    private sendConversationsList(): void {
        this._panel.webview.postMessage({
            type: 'conversationsList',
            conversations: this.getConversationsList(),
            currentId: this.currentConversationId
        });
    }

    private sendCurrentMessages(): void {
        this._panel.webview.postMessage({
            type: 'conversationChanged',
            conversationId: this.currentConversationId,
            messages: this.chatHistory.map(m => ({ role: m.role, content: m.content }))
        });
    }

    private async handleUserMessage(message: string) {
        if (!this.currentConversationId) {
            this.createNewConversation();
            this.sendConversationsList();
        }

        const userMessage: OllamaChatMessage = {
            role: 'user',
            content: message,
        };
        this.chatHistory.push(userMessage);

        this.updateConversationTitle(message);

        if (this.currentConversationId && this.conversations.has(this.currentConversationId)) {
            this.conversations.get(this.currentConversationId)!.updatedAt = Date.now();
            this.saveConversationsToStorage();
        }

        this._panel.webview.postMessage({
            type: 'userMessage',
            message: message,
        });

        this._panel.webview.postMessage({
            type: 'loading',
            isLoading: true,
        });

        try {
            const config = vscode.workspace.getConfiguration('ollama-copilot');
            const chatModel = config.get<string>('chatModel') || 'codellama';
            const temperature = config.get<number>('temperature') || 0.2;

            const response = await this.ollamaClient.chat({
                model: chatModel,
                messages: this.chatHistory,
                options: {
                    temperature,
                },
            });

            this.chatHistory.push(response);
            this.saveConversationsToStorage();

            this._panel.webview.postMessage({
                type: 'assistantMessage',
                message: response.content,
            });

            this.sendConversationsList();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            this._panel.webview.postMessage({
                type: 'error',
                message: errorMessage,
            });
        } finally {
            this._panel.webview.postMessage({
                type: 'loading',
                isLoading: false,
            });
        }
    }

    public clearChat() {
        this.chatHistory = [];
        if (this.currentConversationId && this.conversations.has(this.currentConversationId)) {
            const conv = this.conversations.get(this.currentConversationId)!;
            conv.messages = [];
            conv.title = 'New Conversation';
            this.saveConversationsToStorage();
        }
        this._panel.webview.postMessage({
            type: 'clearMessages',
        });
        this.sendConversationsList();
    }

    public newConversation() {
        this.handleNewConversation();
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();

        // Send initial data after a brief delay to ensure webview is ready
        setTimeout(() => {
            this.sendConversationsList();
            this.sendCurrentMessages();
        }, 100);
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _getHtmlForWebview(): string {
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Ollama Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        .header-title {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: var(--vscode-foreground);
            text-transform: uppercase;
        }

        /* Conversations dropdown */
        .conversations-bar {
            height: 37px;
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--vscode-sideBar-background);
        }
        .conversations-dropdown {
            position: relative;
            flex: 1;
        }
        .dropdown-trigger {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background: transparent;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 13px;
            border-radius: 4px;
        }
        .dropdown-trigger:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .dropdown-arrow {
            font-size: 10px;
            transition: transform 0.2s;
        }
        .dropdown-arrow.open {
            transform: rotate(180deg);
        }
        .dropdown-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100;
            max-height: 300px;
            overflow-y: auto;
            margin-top: 4px;
        }
        .dropdown-menu.open {
            display: block;
        }
        .dropdown-item {
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
        }
        .dropdown-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .dropdown-item.active {
            background: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }
        .dropdown-item-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .dropdown-item-delete {
            opacity: 0;
            padding: 2px 6px;
            background: transparent;
            border: none;
            color: var(--vscode-errorForeground);
            cursor: pointer;
            font-size: 14px;
            border-radius: 3px;
        }
        .dropdown-item:hover .dropdown-item-delete {
            opacity: 1;
        }
        .dropdown-item-delete:hover {
            background: var(--vscode-inputValidation-errorBackground);
        }
        .new-chat-btn {
            padding: 6px 10px;
            background: transparent;
            border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent));
            color: var(--vscode-foreground);
            cursor: pointer;
            border-radius: 4px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .new-chat-btn:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .no-conversations {
            padding: 12px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }

        /* Main content */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--vscode-sideBar-background);
        }

        /* Empty state */
        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
        }
        .empty-state.hidden {
            display: none;
        }
        .logo-container {
            margin-bottom: 16px;
        }
        .logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #e07a5f 0%, #f4a261 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .brand-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }
        .brand-subtitle {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            max-width: 280px;
            line-height: 1.5;
        }

        /* Chat container */
        #chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        #chat-container.hidden {
            display: none;
        }
        .message {
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 85%;
            word-wrap: break-word;
            line-height: 1.5;
        }
        .user-message {
            align-self: flex-end;
            background: linear-gradient(135deg, #e07a5f 0%, #f4a261 100%);
            color: white;
        }
        .assistant-message {
            align-self: flex-start;
            background: var(--vscode-editor-inactiveSelectionBackground);
            color: var(--vscode-foreground);
        }
        .error-message {
            align-self: center;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }

        /* Loading */
        #loading {
            display: none;
            padding: 12px 16px;
            color: var(--vscode-descriptionForeground);
            align-self: flex-start;
        }
        #loading.active {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .loading-dots {
            display: flex;
            gap: 4px;
        }
        .loading-dots span {
            width: 6px;
            height: 6px;
            background: var(--vscode-descriptionForeground);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        /* Input area */
        .input-wrapper {
            padding: 12px 12px 15px 12px;
            background: var(--vscode-sideBar-background);
        }
        .input-hint {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .input-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: var(--vscode-input-background);
            border: 0.5px solid #5e5e5eff;
            border-radius: 8px;
            padding: 8px 12px;
        }
        .input-container:focus-within {
            border-color: #cc7000ff;
        }
        #message-input {
            width: 100%;
            background: transparent;
            border: none;
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: 13px;
            resize: none;
            min-height: 20px;
            max-height: 120px;
            line-height: 1.4;
        }
        #message-input:focus {
            outline: none;
        }
        #message-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        .input-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 6px;
            margin-left: -12px;
            margin-right: -12px;
            padding-left: 8px;
            padding-right: 8px;
            border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
        }
        .action-btn {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background: transparent;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: color 0.2s;
        }
        .action-btn:hover {
            color: var(--vscode-foreground);
        }
        .action-btn svg {
            width: 14px;
            height: 14px;
        }
        #send-btn {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background: linear-gradient(135deg, #e07a5f 0%, #f4a261 100%);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: opacity 0.2s, transform 0.1s;
        }
        #send-btn:hover {
            opacity: 0.9;
            transform: scale(1.05);
        }
        #send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        #send-btn svg {
            width: 12px;
            height: 12px;
        }

        /* Code blocks */
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 8px 0;
            font-size: 12px;
        }
        code {
            font-family: var(--vscode-editor-font-family);
        }
        :not(pre) > code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="conversations-bar">
        <div class="conversations-dropdown">
            <button class="dropdown-trigger" id="dropdown-trigger">
                <span id="current-conversation-title">Past Conversations</span>
                <span class="dropdown-arrow" id="dropdown-arrow">&#9662;</span>
            </button>
            <div class="dropdown-menu" id="dropdown-menu">
                <div class="no-conversations" id="no-conversations">No conversations yet</div>
            </div>
        </div>
        <button class="new-chat-btn" id="new-chat-btn" title="New Conversation">+</button>
    </div>

    <div class="main-content">
        <div class="empty-state" id="empty-state">
            <div class="logo-container">
                <div class="logo">&#129433;</div>
            </div>
            <div class="brand-title">Ollama Chat</div>
            <div class="brand-subtitle">Start a conversation with your local AI assistant powered by Ollama</div>
        </div>

        <div id="chat-container" class="hidden"></div>
        <div id="loading">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span>Thinking...</span>
        </div>
    </div>

    <div class="input-wrapper">
        <div class="input-container">
            <textarea id="message-input" placeholder="Ask anything..." rows="1"></textarea>
            <div class="input-actions">
                <button id="attach-btn" class="action-btn" title="Attach file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                </button>
                <button id="send-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chat-container');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('empty-state');
        const dropdownTrigger = document.getElementById('dropdown-trigger');
        const dropdownMenu = document.getElementById('dropdown-menu');
        const dropdownArrow = document.getElementById('dropdown-arrow');
        const currentConversationTitle = document.getElementById('current-conversation-title');
        const newChatBtn = document.getElementById('new-chat-btn');
        const noConversations = document.getElementById('no-conversations');

        let conversations = [];
        let currentConversationId = null;

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function renderMarkdown(text) {
            let html = escapeHtml(text);
            html = html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
            html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            html = html.replace(/\\n/g, '<br>');
            return html;
        }

        function addMessage(message, type) {
            emptyState.classList.add('hidden');
            chatContainer.classList.remove('hidden');

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type + '-message';
            messageDiv.innerHTML = renderMarkdown(message);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function updateEmptyState() {
            if (chatContainer.children.length === 0) {
                emptyState.classList.remove('hidden');
                chatContainer.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                chatContainer.classList.remove('hidden');
            }
        }

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            messageInput.value = '';
            messageInput.style.height = 'auto';
            messageInput.focus();
        }

        function updateConversationsList(convs, currentId) {
            conversations = convs;
            currentConversationId = currentId;

            const current = convs.find(c => c.id === currentId);
            currentConversationTitle.textContent = current ? current.title : 'Past Conversations';

            if (convs.length === 0) {
                noConversations.style.display = 'block';
                dropdownMenu.querySelectorAll('.dropdown-item').forEach(el => el.remove());
            } else {
                noConversations.style.display = 'none';
                dropdownMenu.querySelectorAll('.dropdown-item').forEach(el => el.remove());

                convs.forEach(conv => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item' + (conv.id === currentId ? ' active' : '');
                    item.innerHTML = \`
                        <span class="dropdown-item-title">\${escapeHtml(conv.title)}</span>
                        <button class="dropdown-item-delete" title="Delete">&times;</button>
                    \`;

                    item.querySelector('.dropdown-item-title').addEventListener('click', () => {
                        vscode.postMessage({ type: 'switchConversation', id: conv.id });
                        dropdownMenu.classList.remove('open');
                        dropdownArrow.classList.remove('open');
                    });

                    item.querySelector('.dropdown-item-delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        vscode.postMessage({ type: 'deleteConversation', id: conv.id });
                    });

                    dropdownMenu.appendChild(item);
                });
            }
        }

        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        });

        sendBtn.addEventListener('click', sendMessage);

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        dropdownTrigger.addEventListener('click', () => {
            dropdownMenu.classList.toggle('open');
            dropdownArrow.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.conversations-dropdown')) {
                dropdownMenu.classList.remove('open');
                dropdownArrow.classList.remove('open');
            }
        });

        newChatBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'newConversation' });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;

            switch (message.type) {
                case 'userMessage':
                    addMessage(message.message, 'user');
                    break;
                case 'assistantMessage':
                    addMessage(message.message, 'assistant');
                    break;
                case 'error':
                    addMessage(message.message, 'error');
                    break;
                case 'loading':
                    loading.className = message.isLoading ? 'active' : '';
                    sendBtn.disabled = message.isLoading;
                    messageInput.disabled = message.isLoading;
                    break;
                case 'clearMessages':
                    chatContainer.innerHTML = '';
                    updateEmptyState();
                    break;
                case 'conversationsList':
                    updateConversationsList(message.conversations, message.currentId);
                    break;
                case 'conversationChanged':
                    chatContainer.innerHTML = '';
                    if (message.messages && message.messages.length > 0) {
                        message.messages.forEach(m => {
                            addMessage(m.content, m.role === 'user' ? 'user' : 'assistant');
                        });
                    }
                    updateEmptyState();
                    break;
            }
        });

        vscode.postMessage({ type: 'getConversations' });

        messageInput.focus();
    </script>
</body>
</html>`;
    }
}
