import { createContext, useContext } from 'react';

// Tách khỏi AIAssistantContext.jsx (file .jsx chỉ export component -> react-refresh không cảnh báo)
export const AIAssistantContext = createContext();

export const useAIAssistant = () => {
    return useContext(AIAssistantContext);
}
