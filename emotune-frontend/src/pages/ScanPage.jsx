import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmotionScanner from '../components/EmotionScanner';
import MoodCheck from '../components/MoodCheck';
import { usePlayback } from '../contexts/playbackContext';
import { useAIAssistant } from '../contexts/aiAssistantStore';
import { useMoodListener } from '../hooks/useMoodListener';
import { markScanned } from '../utils/moodSession';
import { sendMoodFix, sendVoiceMood } from '../utils/moodFix';
import './HomePage.scss';

// Man quet cam xuc:
// - "/" lan dau trong phien (intro=true): man chao + nut Start (trinh duyet can 1 lan bam moi cho phat nhac)
// - "/scan" (icon quet tren header, hoac tu dong khi nguoi dung ranh luc het bai): quet ngay
// Co ket qua -> danh dau "phien da quet", luu cam xuc, phat bai, chuyen /now-playing.
// AI "chua chac" (C7, backend tra unsure) -> tat camera, hien MoodCheck hoi nguoi dung dang thay the nao (khong doan bua).
// C11: micro AN nghe song song (useMoodListener), chi nghe cau ke cam xuc:
// - noi cam xuc khac mat / AI chua chac -> bai theo LOI NOI (POST /scan-feedback via "voice"; mat >= 75% thi backend khong luu anh)
// - khong thay mat ma da noi -> bai theo loi noi (/suggest)
// - co ket qua mat ma nguoi dung dang noi do -> giu ket qua, cho noi xong (toi da HOLD_MS)

const HOLD_MS = 5000;

const ScanPage = ({ intro = false }) => {
    const [started, setStarted] = useState(!intro);
    const [notice, setNotice] = useState("");
    const [unsure, setUnsure] = useState(null);   // { scanId, emotion, confidence } khi AI chua chac
    const [held, setHeld] = useState(null);       // { data, at }: ket qua mat dang cho nguoi dung noi xong
    const [sending, setSending] = useState(false); // dang chon bai theo loi noi
    const handledRef = useRef(false);
    const { playScanResult, setLastMood, pickVersion } = usePlayback();
    const { isOpen: assistantOpen } = useAIAssistant();
    const navigate = useNavigate();

    // dang o man quet ma nguoi dung TU CHON 1 bai (o tim kiem, thu vien ben trai, chuong...) -> lenh cua nguoi dung thang:
    // thoi quet (ket qua mat toi sau bi bo qua), sang man dang phat bai vua chon
    const pickAtStart = useRef(pickVersion);
    useEffect(() => {
        if (pickVersion === pickAtStart.current) return;
        handledRef.current = true;
        navigate("/now-playing");
    }, [pickVersion, navigate]);

    const finish = (data) => {
        handledRef.current = true;
        markScanned();
        // detectedEmotion = cam xuc that (emotion co the da doi sang "happy" de dong vien)
        setLastMood(data.detectedEmotion || data.emotion);
        playScanResult(data);
        navigate("/now-playing");
    }

    // chon bai theo cam xuc nguoi dung noi; fallback = ket qua mat (dung lai neu goi API loi)
    const answerByVoice = (emotion, fallback) => {
        handledRef.current = true;
        setSending(true);
        const request = fallback?.scanId ? sendMoodFix(fallback.scanId, emotion, 'voice') : sendVoiceMood(emotion);
        request.then(finish).catch(() => {
            handledRef.current = false;
            setSending(false);
            if (fallback?.song) finish(fallback);
            else if (fallback?.unsure) setUnsure(fallback);
            else setNotice("Couldn't reach NYX. Try again.");
        });
    }

    // ket qua mat co bai / chua chac + cam xuc nguoi dung noi (null = khong noi) -> quyet dinh cuoi
    const decide = (data, spoken) => {
        if (handledRef.current) return;
        const face = data.unsure ? data.emotion : (data.detectedEmotion || data.emotion);
        // noi giong mat va AI da chac -> giu nguyen bai AI chon (khong phai sua)
        if (spoken && (data.unsure || spoken !== face)) return answerByVoice(spoken, data);
        if (data.unsure) return setUnsure(data);
        finish(data);
    }

    // noi cam xuc SAU khi da co ket qua: dang hoi "chua chac" hoac dang bao khong thay mat -> tra loi bang loi noi
    // (dang giu ket qua thi releaseHeld lo; con dang quet thi ket qua mat toi se dung cau noi nay)
    const onVoiceMood = (emotion) => {
        if (handledRef.current || held) return;
        if (unsure) answerByVoice(emotion, unsure);
        else if (notice) answerByVoice(emotion, null);
    }
    // mo tro ly giong noi thi micro an nhuong micro cho tro ly
    const { listening, busy, voiceMood } = useMoodListener(started && !assistantOpen && !sending, onVoiceMood);

    const handleResult = (data) => {
        // anh gui di truoc khi go scanner van co the tra ve tiep -> chi nhan ket qua dau tien
        if (handledRef.current || held) return;
        if (data.unsure || data.song) {
            if (busy) return setHeld({ data, at: Date.now() });
            return decide(data, voiceMood);
        }
        // khong thay mat: da noi cam xuc thi phat theo loi noi luon
        if (voiceMood) return answerByVoice(voiceMood, null);
        setNotice(data.message || "Couldn't read your face. Try again.");
    }

    // nguoi dung noi xong (hoac het HOLD_MS) -> quyet dinh voi cau noi moi nhat
    const releaseHeld = useEffectEvent(() => {
        const data = held.data;
        setHeld(null);
        decide(data, voiceMood);
    });
    useEffect(() => {
        if (!held) return;
        const wait = busy ? Math.max(0, held.at + HOLD_MS - Date.now()) : 0;
        const timer = setTimeout(releaseHeld, wait);
        return () => clearTimeout(timer);
    }, [held, busy]);

    if (!started) {
        return (
            <div className="home-page home-intro">
                <div className="intro-eyebrow">MOOD MUSIC BOX</div>
                <h1 className="intro-title">How are you feeling today?</h1>
                <p className="intro-subtitle">
                    NYX reads your expression through the camera and picks a song that fits your mood.
                </p>
                <button className="start-btn" onClick={() => setStarted(true)}>
                    ▶ Start
                </button>
            </div>
        )
    }

    const status = sending ? "Picking a song for how you feel…" : held ? "Got it, finish what you're saying…" : null;

    return (
        <div className="home-page">
            {unsure
                ? <MoodCheck scan={unsure} onResult={finish} listening={listening}
                    onRescan={() => { setUnsure(null); setNotice(""); }} />
                : <EmotionScanner onResult={handleResult} notice={notice} paused={Boolean(held) || sending}
                    status={status} listening={listening} heard={voiceMood} />}
        </div>
    )
}

export default ScanPage
