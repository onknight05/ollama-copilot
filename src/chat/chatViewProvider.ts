import * as vscode from 'vscode';
import { OllamaClient, OllamaChatMessage } from '../ollamaClient';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ollama-chat-view';

    private _view?: vscode.WebviewView;
    private ollamaClient: OllamaClient;
    private chatHistory: OllamaChatMessage[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        ollamaClient: OllamaClient
    ) {
        this.ollamaClient = ollamaClient;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleUserMessage(data.message);
                    break;
                case 'clearChat':
                    this.clearChat();
                    break;
            }
        });
    }

    private async handleUserMessage(message: string) {
        if (!this._view) {
            return;
        }

        // Add user message to history
        const userMessage: OllamaChatMessage = {
            role: 'user',
            content: message,
        };
        this.chatHistory.push(userMessage);

        // Display user message
        this._view.webview.postMessage({
            type: 'userMessage',
            message: message,
        });

        // Show loading indicator
        this._view.webview.postMessage({
            type: 'loading',
            isLoading: true,
        });

        try {
            // Get configuration
            const config = vscode.workspace.getConfiguration('ollama');
            const chatModel = config.get<string>('chatModel') || 'codellama';
            const temperature = config.get<number>('temperature') || 0.2;

            // Call Ollama API
            const response = await this.ollamaClient.chat({
                model: chatModel,
                messages: this.chatHistory,
                options: {
                    temperature,
                },
            });

            // Add assistant response to history
            this.chatHistory.push(response);

            // Display assistant message
            this._view.webview.postMessage({
                type: 'assistantMessage',
                message: response.content,
            });
        } catch (error) {
            // Display error message
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            this._view.webview.postMessage({
                type: 'error',
                message: errorMessage,
            });
        } finally {
            // Hide loading indicator
            this._view.webview.postMessage({
                type: 'loading',
                isLoading: false,
            });
        }
    }

    public clearChat() {
        this.chatHistory = [];
        if (this._view) {
            this._view.webview.postMessage({
                type: 'clearMessages',
            });
        }
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Generate a nonce for CSP
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
        #chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .message {
            padding: 10px;
            border-radius: 5px;
            max-width: 90%;
            word-wrap: break-word;
        }
        .user-message {
            align-self: flex-end;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .assistant-message {
            align-self: flex-start;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            color: var(--vscode-foreground);
        }
        .error-message {
            align-self: center;
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        #input-container {
            display: flex;
            gap: 5px;
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        #message-input {
            flex: 1;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            border-radius: 3px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        #message-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #loading {
            display: none;
            text-align: center;
            padding: 10px;
            color: var(--vscode-descriptionForeground);
        }
        #loading.active {
            display: block;
        }
        .header {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h3 {
            font-size: 14px;
            font-weight: 600;
        }
        .clear-btn {
            padding: 4px 8px;
            font-size: 12px;
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 3px;
            overflow-x: auto;
            margin: 5px 0;
        }
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>Ollama Chat</h3>
        <button class="clear-btn" id="clear-btn">Clear</button>
    </div>
    <div id="chat-container"></div>
    <div id="loading">Thinking...</div>
    <div id="input-container">
        <input type="text" id="message-input" placeholder="Ask anything...">
        <button id="send-btn">Send</button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chat-container');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-btn');
        const loading = document.getElementById('loading');

        // Simple text sanitization
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Safe markdown-like rendering
        function renderMarkdown(text) {
            let html = escapeHtml(text);
            
            // Render code blocks (triple backticks)
            html = html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
            
            // Render inline code (single backticks)
            html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            
            // Render line breaks
            html = html.replace(/\\n/g, '<br>');
            
            return html;
        }

        function addMessage(message, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type + '-message';
            messageDiv.innerHTML = renderMarkdown(message);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            messageInput.value = '';
            messageInput.focus();
        }

        sendBtn.addEventListener('click', sendMessage);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
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
                    break;
            }
        });

        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>`;
    }
}
