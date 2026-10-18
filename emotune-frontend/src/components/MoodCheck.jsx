import { useState } from 'react';
import MoodIcon from './MoodIcon';
import { moodLabel, sendMoodFix } from '../utils/moodFix';
import './MoodCheck.scss';

// C7 + C15: nguoi dung chon lai cam xuc cho 1 lan quet camera.
// - MoodCheck: AI "chua chac" (tin cay < 60%) -> man quet hien the nay thay vi doan bua; chon 1 cam xuc (ke ca dung cai AI doan = xac nhan)
// - MoodFix: o man dang phat, AI da chon bai nhung nguoi dung thay doc sai -> "Not right?" -> chon cam xuc khac
// Ca 2 goi POST /scan-feedback (utils/moodFix) -> bai moi theo cam xuc nguoi dung chon.

// thu tu giong nut chon cam xuc o man quet
const ORDER = ['happy', 'sad', 'angry', 'surprise', 'neutral'];

// hang 5 nut cam xuc; guess = cam xuc AI doan (danh dau), exclude = an (dang la cam xuc nay roi)
const MoodChoices = ({ guess, exclude, busy, onPick, compact = false }) => (
    <div className={`mood-choices ${compact ? 'compact' : ''}`}>
        {ORDER.filter((e) => e !== exclude).map((emotion) => (
            <button
                key={emotion}
                className={`mood-choice ${emotion === guess ? 'guess' : ''}`}
                onClick={() => onPick(emotion)}
                disabled={busy}
            >
                {/* ten cam xuc da co o chu ben duoi -> an icon voi trinh doc man hinh (khong doc 2 lan) */}
                <span className="mood-choice-icon" aria-hidden="true"><MoodIcon emotion={emotion} size={compact ? 28 : 44} /></span>
                <span>{moodLabel(emotion)}</span>
                {emotion === guess && !compact && <em>NYX's guess</em>}
            </button>
        ))}
    </div>
);

// goi API + trang thai dang gui / loi dung chung cho 2 the
const useMoodFix = (scanId, onResult) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pick = (emotion) => {
        setBusy(true);
        setError('');
        sendMoodFix(scanId, emotion)
            .then(onResult)
            .catch(() => {
                setError("Couldn't reach NYX. Try again.");
                setBusy(false);
            });
    };
    return { busy, error, pick };
};

// listening (C11): micro an dang nghe -> nhac nguoi dung noi luon cung duoc
const MoodCheck = ({ scan, onResult, onRescan, listening = false }) => {
    const { busy, error, pick } = useMoodFix(scan.scanId, onResult);
    const sure = Math.round((scan.confidence || 0) * 100);
    return (
        <section className="mood-check" aria-labelledby="mood-check-title">
            <div className="mood-check-icon" aria-hidden="true">
                <MoodIcon emotion={scan.emotion} size={72} />
            </div>
            <h2 id="mood-check-title">Not quite sure…</h2>
            <p>
                NYX thinks you look <b>{moodLabel(scan.emotion)}</b>, but it's only {sure}% sure.
                Rather than guess, it'd like to ask: how do you feel?
                {listening && " You can just say it, too."}
            </p>
            <MoodChoices guess={scan.emotion} busy={busy} onPick={pick} />
            {error && <p className="mood-check-error" role="alert">{error}</p>}
            <div className="mood-check-foot">
                <button className="mood-check-link" onClick={onRescan} disabled={busy}>Scan again</button>
                <span>Your answer helps NYX read faces better.</span>
            </div>
        </section>
    );
};

export const MoodFix = ({ scanId, detected, onResult }) => {
    const [open, setOpen] = useState(false);
    const { busy, error, pick } = useMoodFix(scanId, onResult);
    if (!open) {
        return (
            <button className="mood-fix-toggle" onClick={() => setOpen(true)}>
                <span aria-hidden="true"><MoodIcon emotion={detected} size={18} /></span>
                NYX read you as <b>{moodLabel(detected)}</b> · Not right?
            </button>
        );
    }
    return (
        <div className="mood-fix" role="group" aria-label="How do you feel?">
            <span className="mood-fix-title">How do you feel?</span>
            <MoodChoices exclude={detected} busy={busy} onPick={pick} compact />
            <button className="mood-fix-close" onClick={() => setOpen(false)} aria-label="Cancel" disabled={busy}>✕</button>
            {error && <span className="mood-fix-error" role="alert">{error}</span>}
        </div>
    );
};

export default MoodCheck;
