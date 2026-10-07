import { useEffect, useState, useRef } from 'react';
import api from '../api';
import './EmotionScanner.scss';

// chon cam xuc bang tay (khong co camera / AI doan sai) -> goi /suggest thay cho /scan-and-suggest
const MOODS = [
    { emotion: "happy", emoji: "😊", label: "Happy" },
    { emotion: "sad", emoji: "😢", label: "Sad" },
    { emotion: "angry", emoji: "😠", label: "Angry" },
    { emotion: "surprise", emoji: "😲", label: "Surprised" },
    { emotion: "neutral", emoji: "😐", label: "Neutral" },
]

const EmotionScanner = (props) => {
    const { onResult, notice } = props;
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isActive, setIsActive] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [picking, setPicking] = useState(false);

    const pickMood = (emotion) => {
        setPicking(true);
        api.post('/suggest', { emotion })
            .then((response) => onResult(response.data))
            .catch((err) => {
                console.error("Loi goi API:", err);
                setPicking(false);
            });
    }

    useEffect(() => {
        let stream;
        let cancelled = false
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((mediaStream) => {
                if (cancelled) {
                    // camera ve tre, luc nay khong ai dung nua -> tat ngay
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }
                stream = mediaStream;
                videoRef.current.srcObject = mediaStream;
                setIsActive(true);
            })
            .catch((err) => {
                console.error("Loi :" + err)
                setCameraError(true);
            })

        const captureAndSend = () => {
            // camera chua mo (hoac khong co) -> khong gui anh den
            if (!videoRef.current?.srcObject || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = 224;
            canvas.height = 224;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const base64Image = canvas.toDataURL("image/jpeg", 0.8);

            api.post('/scan-and-suggest', {
                image: base64Image
            })
                .then((response) => {
                    onResult(response.data);

                })
                .catch((err) => {
                    console.error("Loi goi API:", err);
                });
        }

        const intervalId = setInterval(captureAndSend, 3000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            setIsActive(false);
        }
    }, [])

    return (
        <div className="scanner">
            <div className={`scanner-frame ${isActive ? "active" : ""}`}>
                <video ref={videoRef} autoPlay muted playsInline className="scanner-video" />
                {!isActive && !cameraError && <div className="scanner-placeholder">Starting camera...</div>}
                {cameraError && <div className="scanner-placeholder">No camera found. Pick your mood below.</div>}
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {isActive && <div className="scanner-status">Reading your mood...</div>}
            {isActive && !notice && <div className="scanner-hint">Look at the camera and keep your face in the frame</div>}
            {notice && <div className="scanner-notice">{notice}</div>}

            {(cameraError || showPicker) ? (
                <div className="mood-picker">
                    <div className="mood-picker-title">How do you feel?</div>
                    <div className="mood-picker-list">
                        {MOODS.map((m) => (
                            <button key={m.emotion} className="mood-chip" disabled={picking} onClick={() => pickMood(m.emotion)}>
                                <span className="mood-chip-emoji">{m.emoji}</span>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <button className="mood-picker-toggle" onClick={() => setShowPicker(true)}>
                    Pick my mood instead
                </button>
            )}
        </div>
    )
}

export default EmotionScanner
