# Ollama Copilot Examples

This directory contains example code to demonstrate the capabilities of Ollama Copilot.

## Autocomplete Examples

### Example 1: Function Implementation

Start typing:
```python
def fibonacci(n):
    # Calculate fibonacci number
```

The extension will suggest the implementation.

### Example 2: Code Completion

Start typing:
```javascript
function sortArray(arr) {
    // Sort an array of numbers
```

The autocomplete will suggest appropriate code.

### Example 3: Class Methods

Start typing:
```typescript
class UserManager {
    private users: User[] = [];
    
    addUser(user: User) {
        // Add user to the list
```

## Chat Examples

### Example 1: Explain Code
Ask in chat: "Explain what this function does" and paste code.

### Example 2: Fix Bugs
Ask in chat: "What's wrong with this code?" and paste problematic code.

### Example 3: Generate Tests
Ask in chat: "Generate unit tests for this function" and paste your function.

### Example 4: Refactoring Suggestions
Ask in chat: "How can I improve this code?" and paste your code.

## Tips

1. **Be Specific**: The more context you provide, the better the suggestions
2. **Use Comments**: Adding comments helps guide the autocomplete
3. **Choose Right Model**: Different models excel at different tasks
   - `codellama`: Great for general coding
   - `deepseek-coder`: Excellent for code understanding
   - `starcoder2`: Good for multiple languages

4. **Adjust Temperature**: Lower values (0.1-0.3) for more focused, deterministic code
5. **Tune Debounce**: Increase debounce if suggestions appear too quickly
