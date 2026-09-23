import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const EmotionScanner = (props) => {
    const { onResult } = props;
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let stream;

        navigator.mediaDevices.getUserMedia({ video: true })
            .then((mediaStream) => {
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

            axios.post('http://localhost:8080/scan-and-suggest', {
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
            clearInterval(intervalId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            setIsActive(false);
        }
    }, [])

    return (
        <>
            {isActive && <span>hehe</span>}
            <video ref={videoRef} autoPlay style={{ display: "none" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
        </>
    )
}

export default EmotionScanner