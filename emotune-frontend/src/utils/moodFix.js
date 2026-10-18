import api from '../api';
import { EMOTIONS } from './moodStats';

// C15: gui cam xuc nguoi dung chon / sua cho 1 lan quet -> bai moi theo cam xuc do (+ backend ghi "AI doan sai" de do,
// luu anh mat neu nguoi dung dong y o Settings).
// Lan quet het han (qua 30 phut / backend vua khoi dong lai -> 410) -> van chon bai theo cam xuc do bang /suggest.
// via = "voice" (C11): cam xuc nghe duoc tu cau noi luc quet; mac dinh "tap" = bam chon
export const sendMoodFix = (scanId, emotion, via = 'tap') => api.post('/scan-feedback', { scanId, emotion, via })
    .then((res) => res.data)
    .catch((err) => {
        if (err.response?.status === 410) return api.post('/suggest', { emotion, via }).then((res) => res.data);
        throw err;
    });

// C11: noi cam xuc ma camera khong thay mat (khong co lan quet nao) -> chon bai theo loi noi
export const sendVoiceMood = (emotion) => api.post('/suggest', { emotion, via: 'voice' }).then((res) => res.data);

// "surprise" hien la "Explore"
export const moodLabel = (emotion) => EMOTIONS.find((e) => e.key === emotion)?.label || emotion;
