import { useEffect, useEffectEvent, useState } from 'react';
import api from '../api';
import { isSpeechSupported, listen } from '../utils/speech';

// C11: micro AN chay song song luc quet mat - nguoi dung vua de camera doc mat vua noi duoc "hom nay minh met qua".
// CHI nghe cau noi ve cam xuc: moi cau nghe xong -> POST /voice-mood (luat cam xuc cua tro ly, khong hieu thi hoi Gemini)
// -> cam xuc hoac null (lenh / chuyen khac bi bo qua).
// Tra ve:
// - listening: micro dang mo (man quet hien cham micro de nguoi dung biet dang bi nghe)
// - busy: dang noi do / dang hieu cau vua noi -> man quet giu ket qua mat, cho noi xong
// - voiceMood: cam xuc cua cau gan nhat co cam xuc (null = chua noi gi ve cam xuc)
// onMood(emotion): goi ngay khi nghe ra 1 cam xuc (man quet tra loi luon neu dang hoi "chua chac" / khong thay mat)
// Web Speech dung sau moi cau (continuous = false) -> tu mo lai. Trinh duyet khong ho tro / chan micro / mat mang -> thoi nghe.

const RESTART_MS = 250;
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'start-failed'];

export const useMoodListener = (active, onMood) => {
    const [failed, setFailed] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [pending, setPending] = useState(0);
    const [voiceMood, setVoiceMood] = useState(null);
    const heard = useEffectEvent((emotion) => {
        setVoiceMood(emotion);
        onMood?.(emotion);
    });

    useEffect(() => {
        if (!active || failed || !isSpeechSupported()) return;
        let stopped = false;
        let stop = null;
        let timer = null;

        const start = () => {
            if (stopped) return;
            stop = listen({
                onInterim: (text) => setSpeaking(Boolean(text)),
                onFinal: (text) => {
                    setPending((n) => n + 1);
                    api.post('/voice-mood', { text })
                        .then((res) => {
                            if (!stopped && res.data?.emotion) heard(res.data.emotion);
                        })
                        .catch(() => { })
                        .finally(() => setPending((n) => n - 1));
                },
                onError: (code) => {
                    if (FATAL.includes(code)) {
                        stopped = true;
                        setFailed(true);
                    }
                },
                onEnd: () => {
                    setSpeaking(false);
                    if (!stopped) timer = setTimeout(start, RESTART_MS);
                },
            });
        };
        start();

        return () => {
            stopped = true;
            clearTimeout(timer);
            stop?.();
        };
    }, [active, failed]);

    const on = active && !failed && isSpeechSupported();
    return { listening: on, busy: on && (speaking || pending > 0), voiceMood };
};
