import { useEffect, useState } from 'react';
import { dominantColor } from '../utils/coverColor';

const SAMPLE = 40;   // thu nho anh con 40x40 roi dem mau: du chinh xac, rat nhanh

// Mau chu dao cua 1 anh ({ h, s, l }); chua tai xong / loi -> null.
// Anh o backend (cong 8080, khac trang web) -> can crossOrigin + CORS thi canvas moi doc duoc diem anh.
export const useCoverColor = (src) => {
    const [result, setResult] = useState({ src: null, color: null });

    useEffect(() => {
        if (!src) return;
        let alive = true;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            let color = null;
            try {
                const canvas = document.createElement("canvas");
                canvas.width = SAMPLE;
                canvas.height = SAMPLE;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
                color = dominantColor(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data);
            } catch (err) {
                // canvas bi chan (thieu CORS) -> dung mau du phong theo ten bai
                console.log("Khong doc duoc mau anh bia:", err.message);
            }
            if (alive) setResult({ src, color });
        };
        img.onerror = () => { if (alive) setResult({ src, color: null }); };
        img.src = src;
        return () => { alive = false; };
    }, [src]);

    return result.src === src ? result.color : null;
};
