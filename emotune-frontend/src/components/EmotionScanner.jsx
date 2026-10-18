import { useEffect, useState, useRef } from 'react';
import api from '../api';
import MoodIcon from './MoodIcon';
import MicIcon from './MicIcon';
import { moodLabel } from '../utils/moodFix';
import './EmotionScanner.scss';

// chon cam xuc bang tay (khong co camera / AI doan sai) -> goi /suggest thay cho /scan-and-suggest
const MOODS = [
    { emotion: "happy", label: "Happy" },
    { emotion: "sad", label: "Sad" },
    { emotion: "angry", label: "Angry" },
    { emotion: "surprise", label: "Explore" },
    { emotion: "neutral", label: "Neutral" },
]

// 1 luot quet = 5 tam chup lien nhau, cach 0.5s
const FRAMES = 5
const FRAME_GAP_MS = 500

// C11: paused = man quet dang giu 1 ket qua (cho nguoi dung noi xong / dang chon bai theo loi noi) -> thoi chup gui tiep
// (moi lan quet co bai la 1 dong mood_history); status = dong trang thai thay "Reading your mood...";
// listening / heard: micro an dang nghe + cam xuc vua nghe duoc -> cham micro duoi khung camera
const EmotionScanner = (props) => {
    const { onResult, notice, paused = false, status = null, listening = false, heard = null } = props;
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

    // luon goi ban onResult moi nhat ma khong phai khoi dong lai camera moi lan HomePage render
    const onResultRef = useRef(onResult);
    const pausedRef = useRef(paused);
    useEffect(() => {
        onResultRef.current = onResult;
        pausedRef.current = paused;
    });

    useEffect(() => {
        let stream;
        let cancelled = false
        // dang cho AI tra loi thi khong gui anh moi (AI cham hon 3s -> truoc day gui chong len nhau, ghi mood_history 2 lan)
        let waiting = false
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

        // chup 1 tam: cat o vuong o giua khung hinh (dung phan nguoi dung thay trong vong tron) thay vi ep ca
        // khung 4:3 / 16:9 thanh hinh vuong: ep lam mat bi bop ngang 25-44%, model train tren anh mat khong bi bop
        const grabFrame = () => {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (!canvas || !video) return null;
            const side = Math.min(video.videoWidth, video.videoHeight);
            if (!side) return null;
            canvas.width = 224;
            canvas.height = 224;
            const sx = (video.videoWidth - side) / 2;
            const sy = (video.videoHeight - side) / 2;
            canvas.getContext("2d").drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", 0.8);
        }

        const captureAndSend = async () => {
            // camera chua mo (hoac khong co) -> khong gui anh den
            if (waiting || pausedRef.current || !videoRef.current?.srcObject || !canvasRef.current) return;

            // moi luot quet chup FRAMES tam cach nhau FRAME_GAP_MS (~2s) roi gui 1 lan: AI doan tung tam va lay
            // trung binh -> 1 tam chup dung luc chop mat / dang noi khong lam sai ca luot (do tren nguoi la: +4-7 diem)
            waiting = true;
            const images = [];
            for (let i = 0; i < FRAMES && !cancelled; i++) {
                if (i > 0) await new Promise((resolve) => setTimeout(resolve, FRAME_GAP_MS));
                const frame = grabFrame();
                if (frame) images.push(frame);
            }
            if (cancelled || images.length === 0) {
                waiting = false;
                return;
            }

            api.post('/scan-and-suggest', { images })
                .then((response) => {
                    if (!cancelled) onResultRef.current(response.data);
                })
                .catch((err) => {
                    console.error("Loi goi API:", err);
                })
                .finally(() => {
                    waiting = false;
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
            {(isActive || status) && <div className="scanner-status">{status || "Reading your mood..."}</div>}
            {isActive && !notice && !status && <div className="scanner-hint">Look at the camera and keep your face in the frame</div>}
            {notice && !status && <div className="scanner-notice">{notice}</div>}
            {listening && (
                <div className={`scanner-mic ${heard ? "heard" : ""}`} role="status">
                    <span className="scanner-mic-icon"><MicIcon /></span>
                    {heard
                        ? <span>Heard you: <b>{moodLabel(heard)}</b></span>
                        : <span>Listening, you can also tell NYX how you feel</span>}
                </div>
            )}

            {/* dang giu ket qua / dang chon bai theo loi noi -> an nut chon tay (tranh ghi lich su 2 lan) */}
            {paused ? null : (cameraError || showPicker) ? (
                <div className="mood-picker">
                    <div className="mood-picker-title">How do you feel?</div>
                    <div className="mood-picker-list">
                        {MOODS.map((m) => (
                            <button key={m.emotion} className="mood-chip" disabled={picking} onClick={() => pickMood(m.emotion)} aria-label={m.label} title={m.label}>
                                <MoodIcon emotion={m.emotion} size={40} />
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
