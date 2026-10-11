import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { usePlayback } from '../contexts/playbackContext';
import { useAIAssistant } from '../contexts/aiAssistantStore';
import { markScanned } from '../utils/moodSession';
import { isSpeechSupported, listen, speak, stopSpeaking } from '../utils/speech';
import VoiceOrb from './VoiceOrb';
import LogoIcon from '../assets/icons/assistant_logo.svg?react';
import MicIcon from '../assets/icons/assistant_mic.svg?react';
import './VoiceAssistant.scss';

// Tro ly giong noi (H6, Figma 284:120): mo -> nghe ngay; noi xong -> POST /assistant -> chuan bi lenh -> doc loi dan.
// Lenh da hieu (chuyen trang / phat / cam xuc / dieu khien): doc loi dan -> nghi 1 chut -> DONG man hinh -> roi moi lam lenh
// (nhac khong phat chen luc tro ly dang noi). Hoi lai / chua hieu / hoi dap (answer) -> giu man hinh, nghe tiep.
// Cau luat khong hieu -> backend hoi Gemini: goi y theo mo ta (queue), hoi dap (answer), nhieu lenh 1 cau (sequence).
const PAUSE_AFTER_SPEECH = 1000;   // doc xong loi dan, nghi 1s roi moi dong
const STEP_GAP = 800;              // chuoi lenh: moi buoc cach nhau 0.8s (doi bai xong moi mo MV cua bai moi)
const MAX_HISTORY = 6;             // nho 6 cau gan nhat trong lan mo tro ly nay -> hoi noi tiep duoc
const READ_TIME = 2500;            // khong doc to duoc (may khong co giong Viet) -> de chu hien 2.5s cho kip doc
const SUGGESTIONS = ["Phát nhạc Sơn Tùng", "Hôm nay mình hơi buồn", "Mở nhạc cho buổi tối mưa", "Nhỏ tiếng rồi mở MV"];
const NO_SONG = "Chưa có bài nào đang phát.";
const NO_PICK = "Mình chưa chọn được bài phù hợp, bạn thử lại nhé.";
const MOOD_LEADS = {
    happy: "Thấy bạn đang vui",
    sad: "Nghe bạn hơi buồn",
    angry: "Mình hiểu bạn đang bực",
    surprise: "Có vẻ bạn đang muốn khám phá",
    neutral: "Một ngày bình thường nhỉ",
};

// loi dan khi noi cam xuc: noi ro se phat bai nao (bai do backend da chon, CHUA phat)
const moodLine = (emotion, data) => {
    const by = data.song.artist ? ` của ${data.song.artist}` : "";
    const song = `bài “${data.song.title}”${by}`;
    if (data.isEncourage) return `Dạo này bạn hay buồn, mình đổi không khí bằng ${song} nhé.`;
    return `${MOOD_LEADS[emotion] || "Mình hiểu rồi"}, mình sẽ phát ${song}, hợp với tâm trạng của bạn nhé.`;
};
const UNSUPPORTED = "Trình duyệt này không nhận giọng nói, bạn gõ giúp mình nhé.";
const SPEECH_ERRORS = {
    "no-speech": "Mình không nghe thấy gì, bấm micro để nói lại nhé.",
    "audio-capture": "Không tìm thấy micro, bạn gõ giúp mình nhé.",
    "not-allowed": "Bạn chưa cho phép dùng micro, bạn gõ giúp mình nhé.",
    "service-not-allowed": "Bạn chưa cho phép dùng micro, bạn gõ giúp mình nhé.",
    network: "Nhận giọng nói cần Internet, bạn gõ giúp mình nhé.",
    "start-failed": "Không bật được micro, bạn gõ giúp mình nhé.",
};

const VoiceAssistant = () => {
    const { closeAssistant } = useAIAssistant();
    const { playSong, playQueue, playPlaylist, playScanResult, setLastMood, control, nowPlaying, lastMood } = usePlayback();
    const navigate = useNavigate();

    const [phase, setPhase] = useState("idle");   // idle | listening | thinking | replying
    const [heard, setHeard] = useState("");
    const [reply, setReply] = useState("");
    const [notice, setNotice] = useState(isSpeechSupported() ? "" : UNSUPPORTED);
    const [choices, setChoices] = useState(null);
    const [typed, setTyped] = useState("");
    // cau tra loi hien tai do Gemini dua ra (khong phai bo luat tu viet) -> hien dong "✦ Trả lời bởi Gemini"
    const [fromAi, setFromAi] = useState(false);

    const stopListenRef = useRef(null);
    const closeTimerRef = useRef(null);
    const aliveRef = useRef(true);
    // moi luot hoi tang 1: cau tra loi / doc to cua luot CU xong muon thi khong duoc dong overlay hay bat mic
    const turnRef = useRef(0);
    const pendingRef = useRef(null);              // { intent, candidates } khi dang hoi lai
    const deferredRef = useRef(null);             // lenh cho chay SAU khi overlay dong (phat nhac, chuyen trang...)
    const speechAtRef = useRef(-Infinity);        // luc Web Speech vua nghe ra chu -> song am nhay theo nguoi noi
    const nowPlayingRef = useRef(nowPlaying);
    // hoi thoai trong lan mo nay [{ role: "user" | "assistant", text }]; dong tro ly la quen
    const historyRef = useRef([]);

    const stopListening = () => {
        stopListenRef.current?.();
        stopListenRef.current = null;
    };

    const startListening = () => {
        if (!isSpeechSupported() || !aliveRef.current) return;
        stopListening();
        setNotice("");
        setHeard("");
        setPhase("listening");
        stopListenRef.current = listen({
            onInterim: (text) => {
                speechAtRef.current = performance.now();
                setHeard(text);
            },
            onFinal: (text) => send({ text }),
            onError: (code) => setNotice(SPEECH_ERRORS[code] || ""),
            onEnd: () => setPhase((p) => (p === "listening" ? "idle" : p)),
        });
    };

    // lam 1 buoc (goi SAU khi man hinh da dong): mo trang / phat / hang doi goi y / dieu khien
    const runStep = (step) => {
        if (step.type === "navigate") navigate(step.path);
        else if (step.type === "queue") playQueue(step.queue, 0);
        else if (step.type === "play") {
            if (step.kind === "song") playSong(step.song);
            else if (step.kind === "artist") playQueue(step.queue, 0);
            else playPlaylist(step.playlistId, 0);
        } else if (step.type === "control") {
            control(step.command);
            // mo MV -> sang man dang phat de xem lon
            if (step.command === "mv_on") navigate("/now-playing");
        }
    };
    // chuoi lenh: lan luot tung buoc, cach nhau STEP_GAP (buoc sau chay tren bai moi neu buoc truoc vua doi bai)
    const runSteps = (steps, i = 0) => {
        if (i >= steps.length) return;
        runStep(steps[i]);
        setTimeout(() => runSteps(steps, i + 1), STEP_GAP);
    };

    // CHUAN BI hanh dong backend tra ve, chua lam gi ca:
    // close = lenh hop le -> doc xong se dong man hinh; run = viec lam SAU khi man hinh da dong; reply = cau thay the
    const prepare = async (action) => {
        const playing = Boolean(nowPlayingRef.current);
        switch (action.type) {
            case "navigate":
                if ((action.path === "/now-playing" || action.path === "/lyrics") && !playing) {
                    return { close: false, reply: NO_SONG };
                }
                return { close: true, run: () => runStep(action) };
            case "play":
            case "queue":
                return { close: true, run: () => runStep(action) };
            case "sequence":
                return { close: true, run: () => runSteps(action.steps) };
            case "mood": {
                // cam xuc tu cau noi = kenh thu 2 ben canh khuon mat: chon bai truoc (chua phat) de loi dan noi duoc ten bai
                const res = await api.post('/suggest', { emotion: action.emotion }).catch(() => null);
                const data = res?.data;
                if (!data?.song) return { close: false, reply: NO_PICK };
                return {
                    close: true,
                    reply: moodLine(action.emotion, data),
                    run: () => {
                        markScanned();
                        setLastMood(data.detectedEmotion || data.emotion);
                        playScanResult(data);
                        navigate("/now-playing");
                    },
                };
            }
            case "control":
                if (!playing) return { close: false, reply: NO_SONG };
                return { close: true, run: () => runStep(action) };
            // hoi dap / tro chuyen: doc cau tra loi, man hinh van mo de hoi tiep
            case "answer":
            default:
                return { close: false };
        }
    };

    const respond = async (turn, { action, reply: text, source }) => {
        const stale = () => !aliveRef.current || turn !== turnRef.current;
        if (stale()) return;
        const isChoice = action.type === "choose";
        pendingRef.current = isChoice ? { intent: action.intent, candidates: action.candidates } : null;
        setChoices(isChoice ? action.candidates : null);

        const result = await prepare(action);
        if (stale()) return;
        const say = result.reply || text;
        historyRef.current = [...historyRef.current, { role: "assistant", text: say }].slice(-MAX_HISTORY);
        setFromAi(source === "llm" && !result.reply);
        setReply(say);
        setPhase("replying");
        const spoken = await speak(say);
        if (stale()) return;
        if (!result.close) {
            startListening();
            return;
        }
        // doc xong -> nghi 1 chut -> dong man hinh; lenh (phat nhac...) chay o cleanup khi overlay da go
        setPhase("idle");
        closeTimerRef.current = setTimeout(() => {
            deferredRef.current = result.run || null;
            closeAssistant();
        }, spoken ? PAUSE_AFTER_SPEECH : READ_TIME);
    };

    // body: { text } hoac { text: "", pick } (bam nut khi hoi lai)
    const send = (body) => {
        const turn = ++turnRef.current;
        stopListening();
        stopSpeaking();
        clearTimeout(closeTimerRef.current);
        setNotice("");
        if (body.text) setHeard(body.text);
        setPhase("thinking");
        // ngu canh cho Gemini: cac cau truoc, bai dang phat ("bai nay"), cam xuc quet gan nhat
        const history = historyRef.current;
        if (body.text) historyRef.current = [...history, { role: "user", text: body.text }].slice(-MAX_HISTORY);
        api.post('/assistant', {
            ...body,
            pending: pendingRef.current,
            history,
            nowPlayingId: nowPlayingRef.current?.songId ?? null,
            mood: lastMood?.emotion ?? null,
        })
            .then((res) => respond(turn, res.data))
            .catch(() => respond(turn, { action: { type: "unknown" }, reply: "Mình đang gặp lỗi, bạn thử lại sau nhé." }));
    };

    const toggleMic = () => {
        turnRef.current += 1;
        stopSpeaking();
        clearTimeout(closeTimerRef.current);
        if (phase === "listening") {
            stopListening();
            setPhase("idle");
        } else {
            startListening();
        }
    };

    const submitTyped = (e) => {
        e.preventDefault();
        const text = typed.trim();
        if (!text) return;
        setTyped("");
        send({ text });
    };

    const pickChoice = (i) => {
        setHeard(choices[i].name);
        send({ text: "", pick: i });
    };

    // ham moi nhat cho effect mo/dong (effect chi chay 1 lan)
    const startRef = useRef(startListening);
    useEffect(() => {
        startRef.current = startListening;
        nowPlayingRef.current = nowPlaying;
    });

    // mo overlay: giam nhac + nghe ngay; dong (go component): dung nghe, dung doc, tra am luong,
    // roi moi chay lenh da hen (deferredRef) -> man hinh AI tat truoc, nhac phat sau, am luong da ve binh thuong.
    // Dong bang Esc / ✕ luc dang doc loi dan -> deferredRef chua dat -> lenh bi huy.
    useEffect(() => {
        aliveRef.current = true;
        control("duck");
        // bat nghe o tick sau: StrictMode (dev) chay effect 2 lan -> timer lan 1 bi huy truoc khi chay,
        // chi 1 phien nhan dang giong noi duoc mo (tranh start-abort-start lien nhau bi Chrome bao "aborted")
        const startTimer = setTimeout(() => startRef.current(), 0);
        return () => {
            clearTimeout(startTimer);
            aliveRef.current = false;
            stopListenRef.current?.();
            stopSpeaking();
            clearTimeout(closeTimerRef.current);
            control("unduck");
            const run = deferredRef.current;
            deferredRef.current = null;
            // tick sau: de lan render go overlay xong (trinh phat da nhan "unduck") roi moi phat / chuyen trang
            if (run) setTimeout(run, 0);
        };
    }, [control]);

    useEffect(() => {
        // pha capture: chay truoc listener cua LyricsView (window, pha bubble) -> Esc chi dong tro ly, khong dong luon man loi bai hat
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                closeAssistant();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [closeAssistant]);

    const waveMode = phase === "listening" ? "mic" : phase === "replying" ? "speaking" : "idle";
    const showSuggestions = !heard && !reply && phase !== "thinking";

    return (
        <div className="voice-assistant" role="dialog" aria-modal="true" aria-label="Voice assistant">
            <button className="va-close" onClick={closeAssistant} aria-label="Close voice assistant">✕</button>
            <LogoIcon className="va-logo" aria-hidden="true" />

            <div className="va-main">
                {/* nut micro nam trong lo tron giua qua cau song */}
                <div className="va-orb">
                    <VoiceOrb mode={waveMode} activityRef={speechAtRef} />
                    <button
                        className={`va-mic ${phase === "listening" ? "is-listening" : ""}`}
                        onClick={toggleMic}
                        disabled={!isSpeechSupported()}
                        aria-label={phase === "listening" ? "Stop listening" : "Start listening"}
                    >
                        <MicIcon />
                    </button>
                </div>

                <div className="va-text" aria-live="polite">
                    {/* khong hien lai nguyen van cau nguoi dung noi: cau dan cua tro ly ("Mình sẽ phát bài …") da cho biet
                        tro ly hieu dung yeu cau chua; heard chi dung de an cac cau goi y khi da noi */}
                    <p className="va-heard">{phase === "listening" ? "Mình đang nghe…" : ""}</p>
                    {phase === "thinking" && <p className="va-reply is-thinking">Đang nghĩ…</p>}
                    {reply && phase !== "thinking" && <p className="va-reply">{reply}</p>}
                    {reply && phase !== "thinking" && fromAi && <p className="va-source">✦ Trả lời bởi Gemini</p>}
                    {notice && <p className="va-notice">{notice}</p>}
                    {choices && (
                        <div className="va-choices">
                            {choices.map((c, i) => (
                                <button key={`${c.kind}-${c.id}`} onClick={() => pickChoice(i)}>
                                    {c.name}<span>{c.detail}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {showSuggestions && (
                        <div className="va-suggestions">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} onClick={() => send({ text: s })}>“{s}”</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <form className="va-type" onSubmit={submitTyped}>
                <input
                    value={typed}
                    onChange={(e) => {
                        clearTimeout(closeTimerRef.current);   // go yeu cau moi -> huy viec dong + lenh dang cho
                        setTyped(e.target.value);
                    }}
                    placeholder="Hoặc gõ yêu cầu…"
                    aria-label="Type a request"
                    maxLength={300}
                />
                <button type="submit" disabled={!typed.trim()}>Gửi</button>
            </form>
        </div>
    );
};

export default VoiceAssistant;
