import { createContext, useContext, useState } from 'react';

const AIAssistantContext = createContext();

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

export const useAIAssistant = () => {
    return useContext(AIAssistantContext);
}