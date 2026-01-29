/**
 * Example TypeScript file to test Ollama Copilot autocomplete.
 * Try typing after the function signatures to see autocomplete in action.
 */

interface User {
    id: number;
    name: string;
    email: string;
}

class UserRepository {
    private users: User[] = [];

    addUser(user: User): void {
        // Start typing here to see autocomplete
        
    }

    findUserById(id: number): User | undefined {
        // Start typing here
        
    }

    updateUser(id: number, updates: Partial<User>): boolean {
        // Start typing here
        
    }

    deleteUser(id: number): boolean {
        // Start typing here
        
    }
}

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    // Start typing here to implement debounce
    
}

async function fetchUserData(userId: number): Promise<User> {
    // Start typing here to implement async fetch
    
}

// Ask in chat: "How do I test the UserRepository class?"
// Ask in chat: "What's the best way to handle errors in fetchUserData?"
// Ask in chat: "Explain the debounce function"
