import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmotionScanner from '../components/EmotionScanner';
import { usePlayback } from '../contexts/playbackContext';
import { setLed, useHardwareButtons } from '../hardware';
import { markScanned } from '../utils/moodSession';
import './HomePage.scss';

// Man quet cam xuc:
// - "/" lan dau trong phien (intro=true): man chao + nut Start (trinh duyet can 1 lan bam moi cho phat nhac)
// - "/scan" (icon quet tren header, hoac tu dong khi nguoi dung ranh luc het bai): quet ngay
// Co ket qua -> danh dau "phien da quet", luu cam xuc, phat bai, chuyen /now-playing.
const ScanPage = ({ intro = false }) => {
    const [started, setStarted] = useState(!intro);
    const [notice, setNotice] = useState("");
    const handledRef = useRef(false);
    const { playScanResult, setLastMood } = usePlayback();
    const navigate = useNavigate();

    // nut 1 tren mach (Pi) thay cho nut Start
    useHardwareButtons({ onNext: () => setStarted(true) })

    useEffect(() => {
        if (started) setLed('scanning');
    }, [started])

    const handleResult = (data) => {
        // anh gui di truoc khi go scanner van co the tra ve tiep -> chi nhan ket qua dau tien
        if (handledRef.current) return;
        if (data.error || !data.song) {
            setNotice(data.message || "Couldn't read your face. Try again.");
            return;
        }
        handledRef.current = true;
        markScanned();
        // detectedEmotion = cam xuc that (emotion co the da doi sang "happy" de dong vien)
        setLastMood(data.detectedEmotion || data.emotion);
        playScanResult(data);
        navigate("/now-playing");
    }

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

    return (
        <div className="home-page">
            <EmotionScanner onResult={handleResult} notice={notice} />
        </div>
    )
}

export default ScanPage
