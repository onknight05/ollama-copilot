import * as vscode from 'vscode';
import { OllamaClient } from './ollamaClient';
import { OllamaCompletionProvider } from './completionProvider';
import { ChatViewProvider } from './chat/chatViewProvider';

let ollamaClient: OllamaClient;
let chatViewProvider: ChatViewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Ollama Copilot is now active');

    // Initialize Ollama client
    ollamaClient = new OllamaClient();
    context.subscriptions.push({
        dispose: () => ollamaClient.dispose()
    });

    // Register inline completion provider
    const completionProvider = new OllamaCompletionProvider(ollamaClient);
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            completionProvider
        )
    );
    context.subscriptions.push({
        dispose: () => completionProvider.dispose()
    });

    // Register chat view provider
    chatViewProvider = new ChatViewProvider(context.extensionUri, ollamaClient);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatViewProvider
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.openChat', () => {
            vscode.commands.executeCommand('workbench.view.extension.ollama-sidebar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.clearChat', () => {
            chatViewProvider.clearChat();
            vscode.window.showInformationMessage('Chat history cleared');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.toggleAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama');
            const currentValue = config.get<boolean>('autocompleteEnabled') !== false;
            await config.update('autocompleteEnabled', !currentValue, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `Ollama autocomplete ${!currentValue ? 'enabled' : 'disabled'}`
            );
        })
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        'Ollama Copilot activated! Make sure Ollama is running on your system.',
        'Open Chat',
        'Settings'
    ).then(selection => {
        if (selection === 'Open Chat') {
            vscode.commands.executeCommand('ollama.openChat');
        } else if (selection === 'Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
        }
    });
}

export function deactivate() {
    console.log('Ollama Copilot is now deactivated');
}
