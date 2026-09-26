import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
const EmotionScanner = (props) => {
    const { onResult } = props;
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isActive, setIsActive] = useState(false);

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
            })

        const captureAndSend = () => {
            if (!videoRef.current || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = 224;
            canvas.height = 224;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const base64Image = canvas.toDataURL("image/jpeg", 0.8);

            axios.post(`${API_URL}/scan-and-suggest`, {
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
        <>
            {isActive && <span>Đang quét cảm xúc</span>}
            <video ref={videoRef} autoPlay style={{ display: "none" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
        </>
    )
}

export default EmotionScanner