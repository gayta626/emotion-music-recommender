import { useEffect, useRef, useState } from 'react';
import './KaraokeScoreCard.scss';

const COUNT_MS = 1200;

// The diem hien len man loi khi hat xong 1 bai (mau A nguoi dung chon): so dem tu 0 len, 1 cau nhan xet,
// 2 thanh On time / On key. Bai ke CHO toi khi bam Sing again (hat lai tu dau) hoac Next song.
const KaraokeScoreCard = ({ result, onAgain, onNext }) => {
    const [shown, setShown] = useState(0);
    const againRef = useRef(null);

    useEffect(() => {
        againRef.current?.focus();
        if (!result.enough) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let frameId;
        const start = performance.now();
        const tick = (now) => {
            // cham dan ve cuoi (ease-out) cho giong may karaoke
            const p = reduce ? 1 : Math.min(1, (now - start) / COUNT_MS);
            setShown(Math.round(result.score * (1 - (1 - p) ** 3)));
            if (p < 1) frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [result]);

    return (
        <div className="karaoke-score" role="dialog" aria-modal="true" aria-labelledby="karaoke-score-title">
            <div className="ks-card">
                <p className="ks-label" id="karaoke-score-title">Your karaoke score</p>
                {result.enough ? (
                    <>
                        <p className="ks-number" aria-label={`${result.score} out of 100`}>{shown}</p>
                        <p className="ks-comment">{result.comment}</p>
                        <ScoreBar label="On time" value={result.onTime} hint="Sang while the singer sings" />
                        <ScoreBar label="On key" value={result.onKey} hint="Hit the singer's notes (any octave)" />
                    </>
                ) : (
                    <p className="ks-comment ks-empty">{result.comment}</p>
                )}
                <div className="ks-buttons">
                    <button ref={againRef} className="ks-btn primary" onClick={onAgain}>Sing again</button>
                    <button className="ks-btn" onClick={onNext}>Next song</button>
                </div>
            </div>
        </div>
    );
};

const ScoreBar = ({ label, value, hint }) => (
    <div className="ks-bar" title={hint}>
        <span className="ks-bar-label">{label}</span>
        <span className="ks-track" aria-hidden="true"><span className="ks-fill" style={{ width: `${value}%` }} /></span>
        <span className="ks-bar-value">{value}</span>
    </div>
);

export default KaraokeScoreCard;
