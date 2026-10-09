import { useCallback, useMemo, useState } from 'react';
import { AIAssistantContext } from './aiAssistantStore';

// Hook useAIAssistant() nằm ở ./aiAssistantStore.js
// Trợ lý giọng nói (H6): bấm logo AI trên header -> mở lớp phủ VoiceAssistant (MainLayout vẽ khi isOpen)
export const AIAssistantProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const openAssistant = useCallback(() => setIsOpen(true), []);
    const closeAssistant = useCallback(() => setIsOpen(false), []);

    const value = useMemo(() => ({ isOpen, openAssistant, closeAssistant }), [isOpen, openAssistant, closeAssistant]);

    return (
        <AIAssistantContext.Provider value={value}>
            {children}
        </AIAssistantContext.Provider>
    )
}
