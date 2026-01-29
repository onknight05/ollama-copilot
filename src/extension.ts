// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { OllamaClient } from './ollamaClient';
import { OllamaCompletionProvider } from './completionProvider';
import { ChatPanel } from './chat/chatPanel';

let ollamaClient: OllamaClient;
let statusBarItem: vscode.StatusBarItem;
let availableModels: string[] = [];

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('ollama-copilot');
    const isEnabled = config.get<boolean>('autocompleteEnabled') !== false;

    if (isEnabled) {
        statusBarItem.text = '🦙 Ollama';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = ' 🦙 Ollama';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
}

async function loadAndValidateModels() {
    try {
        availableModels = (await ollamaClient.listModels()).map(model => model.replace(":latest", ""));

        if (availableModels.length === 0) {
            vscode.window.showWarningMessage(
                'No Ollama models found. Please pull a model using "ollama pull <model>".'
            );
            return;
        }

        const config = vscode.workspace.getConfiguration('ollama-copilot');
        const completionModel = config.get<string>('model') || 'codellama';
        const chatModel = config.get<string>('chatModel') || 'codellama';

        // Validate completion model
        if (!availableModels.includes(completionModel)) {
            const selection = await vscode.window.showWarningMessage(
                `Completion model "${completionModel}" not found. Available: ${availableModels.slice(0, 3).join(', ')}${availableModels.length > 3 ? '...' : ''}`,
                'Select Model',
                'Ignore'
            );
            if (selection === 'Select Model') {
                const selected = await vscode.window.showQuickPick(availableModels, {
                    placeHolder: 'Select completion model'
                });
                if (selected) {
                    await config.update('model', selected, vscode.ConfigurationTarget.Global);
                }
            }
        }

        // Validate chat model
        if (!availableModels.includes(chatModel)) {
            const selection = await vscode.window.showWarningMessage(
                `Chat model "${chatModel}" not found. Available: ${availableModels.slice(0, 3).join(', ')}${availableModels.length > 3 ? '...' : ''}`,
                'Select Model',
                'Ignore'
            );
            if (selection === 'Select Model') {
                const selected = await vscode.window.showQuickPick(availableModels, {
                    placeHolder: 'Select chat model'
                });
                if (selected) {
                    await config.update('chatModel', selected, vscode.ConfigurationTarget.Global);
                }
            }
        }

        console.log(`Ollama models loaded: ${availableModels.join(', ')}`);
    } catch (error) {
        console.error('Failed to load Ollama models:', error);
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
    console.log('Ollama Copilot is now active');

    // Initialize Ollama client
    ollamaClient = new OllamaClient();
    context.subscriptions.push({
        dispose: () => ollamaClient.dispose()
    });

    // Load and validate models
    loadAndValidateModels();

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

    // registerCommand
    // The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

    // showInformationMessage
    // The code you place here will be executed every time your command is executed
	// Display a message box to the user

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.openChat', () => {
            ChatPanel.createOrShow(context.extensionUri, ollamaClient, context, availableModels);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.refreshModels', async () => {
            await loadAndValidateModels();
            vscode.window.showInformationMessage(`Found ${availableModels.length} models`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.toggleAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama-copilot');
            const currentValue = config.get<boolean>('autocompleteEnabled') !== false;
            await config.update('autocompleteEnabled', !currentValue, vscode.ConfigurationTarget.Global);
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.enableAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama-copilot');
            await config.update('autocompleteEnabled', true, vscode.ConfigurationTarget.Global);
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.disableAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama-copilot');
            await config.update('autocompleteEnabled', false, vscode.ConfigurationTarget.Global);
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.showMenu', async () => {
            const config = vscode.workspace.getConfiguration('ollama-copilot');
            const isEnabled = config.get<boolean>('autocompleteEnabled') !== false;

            interface MenuItem extends vscode.QuickPickItem {
                action?: string;
            }

            const items: MenuItem[] = [
                {
                    label: isEnabled ? '$(check) Completions are enabled' : '$(x) Completions are disabled',
                    action: 'toggle'
                },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                {
                    label: '$(comment-discussion) Open Chat',
                    action: 'chat'
                },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                {
                    label: '$(gear) Settings',
                    action: 'settings'
                }
            ];

            const quickPick = vscode.window.createQuickPick<MenuItem>();
            quickPick.items = items;
            quickPick.title = '🦙 Ollama Copilot';
            quickPick.placeholder = 'Select an action';

            quickPick.onDidAccept(() => {
                const selection = quickPick.selectedItems[0];
                quickPick.hide();

                if (selection?.action === 'toggle') {
                    vscode.commands.executeCommand('ollama.toggleAutocomplete');
                } else if (selection?.action === 'chat') {
                    vscode.commands.executeCommand('ollama.openChat');
                } else if (selection?.action === 'settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'ollama-copilot');
                }
            });

            quickPick.onDidHide(() => quickPick.dispose());
            quickPick.show();
        })
    );

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ollama.showMenu';
    statusBarItem.tooltip = 'Ollama Copilot - Click for options';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ollama-copilot.autocompleteEnabled')) {
                updateStatusBar();
            }
        })
    );

    // ping Ollama server to check availability
    ollamaClient.ping().then(() => {
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
    }).catch(err => {
        vscode.window.showErrorMessage(
            'Failed to connect to Ollama server. Please ensure Ollama is running on your system.',
            'Learn More'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://ollama.com/docs/getting-started/installation'));
            }
        });
        console.error('Ollama server is not reachable:', err);
    });
}

export function deactivate() {
    console.log('Ollama Copilot is now deactivated');
}
