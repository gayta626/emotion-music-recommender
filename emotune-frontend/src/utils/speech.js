// Nhan giong noi + doc to cho tro ly (H6).
// Nhan giong: Web Speech API cua Chrome/Edge (gui am thanh len may chu Google -> can Internet).
// Tach rieng file nay: sau nay tren Pi (Chromium khong co Web Speech) chi can thay bang ban goi Whisper/PhoWhisper.
const Recognition = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export const isSpeechSupported = () => Boolean(Recognition);

// Nghe 1 cau tieng Viet. onInterim: chu tam (hien dan khi dang noi); onFinal: cau hoan chinh;
// onError(code): "no-speech" | "not-allowed" | "network" | ...; onEnd: ket thuc (ke ca loi).
// Tra ve ham huy (dong overlay / bam micro lan nua) - huy thi KHONG goi onFinal/onEnd.
export const listen = ({ onInterim, onFinal, onError, onEnd }) => {
    const rec = new Recognition();
    rec.lang = "vi-VN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let cancelled = false;

    rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript;
            else interim += r[0].transcript;
        }
        onInterim?.((finalText + interim).trim());
    };
    rec.onerror = (e) => {
        if (!cancelled) onError?.(e.error);
    };
    rec.onend = () => {
        if (cancelled) return;
        if (finalText.trim()) onFinal?.(finalText.trim());
        onEnd?.();
    };

    try {
        rec.start();
    } catch {
        onError?.("start-failed");
        onEnd?.();
    }
    return () => {
        cancelled = true;
        rec.abort();
    };
};

// giong tieng Viet co san cua trinh duyet (Chrome tai danh sach giong cham -> nghe "voiceschanged")
let viVoice = null;
const pickVoice = () => {
    const voices = window.speechSynthesis?.getVoices() || [];
    viVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("vi")) || null;
};
if (typeof window !== "undefined" && window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
}

// Doc to; Promise xong khi doc het (true) hoac khong doc duoc (false: khong co giong Viet / bi huy)
export const speak = (text) => new Promise((resolve) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth || !text) return resolve(false);
    if (!viVoice) pickVoice();
    if (!viVoice) return resolve(false);

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "vi-VN";
    utter.voice = viVoice;
    utter.rate = 1.05;
    // Chrome doi khi khong ban "end" -> tu xong sau khoang thoi gian uoc luong
    const timer = setTimeout(() => resolve(true), 2000 + text.length * 120);
    const done = (ok) => () => {
        clearTimeout(timer);
        resolve(ok);
    };
    utter.onend = done(true);
    utter.onerror = done(false);
    synth.speak(utter);
});

export const stopSpeaking = () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
};
