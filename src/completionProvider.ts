import * as vscode from 'vscode';
import { OllamaClient } from './ollamaClient';

export class OllamaCompletionProvider implements vscode.InlineCompletionItemProvider {
    private ollamaClient: OllamaClient;
    private lastRequestTime = 0;
    private debounceMs = 300;
    private abortController?: AbortController;
    private disposable?: vscode.Disposable;

    constructor(ollamaClient: OllamaClient) {
        this.ollamaClient = ollamaClient;
        this.updateDebounce();

        this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('ollama-copilot.debounceMs')) {
                this.updateDebounce();
            }
        });
    }

    public dispose() {
        this.disposable?.dispose();
    }

    private updateDebounce() {
        const config = vscode.workspace.getConfiguration('ollama-copilot');
        this.debounceMs = config.get<number>('debounceMs') || 300;
    }

    private isAutocompleteEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('ollama-copilot');
        return config.get<boolean>('autocompleteEnabled') !== false;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
        // Check if autocomplete is enabled
        if (!this.isAutocompleteEnabled()) {
            return undefined;
        }

        // Skip if triggered by undo/redo or other non-typing events
        if (context.triggerKind !== vscode.InlineCompletionTriggerKind.Automatic) {
            return undefined;
        }

        // Debounce: wait a bit before making a request
        const now = Date.now();
        if (now - this.lastRequestTime < this.debounceMs) {
            return undefined;
        }
        this.lastRequestTime = now;

        // Cancel any pending request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {
            // Get the text before the cursor
            const textBeforeCursor = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
            );

            // Get configuration
            const config = vscode.workspace.getConfiguration('ollama-copilot');
            const model = config.get<string>('model') || 'codellama';
            const maxTokens = config.get<number>('maxTokens') || 10000;
            const temperature = config.get<number>('temperature') || 0.2;

            // console.log(`[${model}] Before: `, textBeforeCursor);
            // Create the prompt
            const prompt = this.createPrompt(document, textBeforeCursor);

            // Call Ollama API
            const completion = await this.ollamaClient.complete(
                {
                    model,
                    prompt,
                    options: {
                        temperature,
                        num_predict: maxTokens,
                        stop: ['\n\n', '```'],
                    },
                },
                this.abortController.signal
            );

            if (token.isCancellationRequested) {
                return undefined;
            }

            // Clean up the completion
            const cleanedCompletion = this.cleanCompletion(completion);

            if (!cleanedCompletion) {
                return undefined;
            }

            return [
                new vscode.InlineCompletionItem(
                    cleanedCompletion,
                    new vscode.Range(position, position)
                ),
            ];
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Request was cancelled, ignore
                return undefined;
            }
            console.error('Ollama completion error:', error);
            return undefined;
        }
    }

    private createPrompt(document: vscode.TextDocument, textBeforeCursor: string): string {
        const languageId = document.languageId;

        // Create a context-aware prompt
        return `Complete the following ${languageId} code. Only provide the continuation, do not repeat the existing code:\n\n${textBeforeCursor}`;
    }

    private cleanCompletion(completion: string): string {
        // Remove any leading/trailing whitespace
        let cleaned = completion.trim();

        // Remove any markdown code fences
        cleaned = cleaned.replace(/^```[\w]*\n/, '');
        cleaned = cleaned.replace(/\n```$/, '');

        // If the completion is too short or looks like an error, ignore it
        if (cleaned.length < 2) {
            return '';
        }

        return cleaned;
    }
}
