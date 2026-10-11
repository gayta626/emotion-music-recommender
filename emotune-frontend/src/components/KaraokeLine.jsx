import { useEffect, useRef } from 'react';
import { karaokeWords, wordFill } from '../utils/lyrics';

// Dong dang hat o che do karaoke: chu duoc to mau dan tu trai sang phai theo nhac.
// Doc thoi gian bai bang requestAnimationFrame (60 lan/giay) va ghi thang bien CSS --p vao tung chu
// -> muot, khong render lai React (su kien timeupdate cua <audio> chi ~4 lan/giay, to theo do se bi giat).
const KaraokeLine = ({ text, start, span, getTime }) => {
    const words = karaokeWords(text);
    const refs = useRef([]);

    useEffect(() => {
        let frameId;
        const tick = () => {
            frameId = requestAnimationFrame(tick);
            const progress = Math.min(1, Math.max(0, (getTime() - start) / span));
            refs.current.forEach((el, i) => {
                if (el) el.style.setProperty('--p', wordFill(progress, i, words.length).toFixed(3));
            });
        };
        tick();
        return () => cancelAnimationFrame(frameId);
    }, [start, span, getTime, words.length]);

    return (
        <span className="karaoke-line">
            {words.map((word, i) => (
                <span key={i}>
                    <span className="karaoke-word" ref={(el) => { refs.current[i] = el; }}>{word}</span>
                    {i < words.length - 1 && " "}
                </span>
            ))}
        </span>
    );
};

export default KaraokeLine;
