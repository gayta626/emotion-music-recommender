import { useState } from 'react';
import { AIAssistantContext } from './aiAssistantStore';

// Hook useAIAssistant() nằm ở ./aiAssistantStore.js
export const AIAssistantProvider = ({ children }) => {
    const [status, setStatus] = useState("idle");
    const [result, setResult] = useState(null);

    const value = { status, setStatus, result, setResult };

    return (
        <AIAssistantContext.Provider value={value}>
            {children}
        </AIAssistantContext.Provider>
    )
}
