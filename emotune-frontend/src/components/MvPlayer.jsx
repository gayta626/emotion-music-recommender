import { useEffect, useRef } from 'react';
import { loadYouTubeApi } from '../utils/youtube';

// Khung MV (H16): nhung trinh phat YouTube chinh thuc vao o MV nho (MusicPlayer .mv-mini).
// MusicPlayer dieu khien qua doi tuong player (onReady) va nghe trang thai (onStateChange); loi -> onError(ma loi):
// 101 / 150 = chu video cam nhung, 'offline' / 'timeout' = khong tai duoc YouTube.
const MvPlayer = ({ videoId, title, onReady, onStateChange, onError }) => {
    const hostRef = useRef(null);
    // giu ham moi nhat -> khong tao lai trinh phat moi lan MusicPlayer render (4 lan/giay)
    const callbacks = useRef({});
    useEffect(() => { callbacks.current = { onReady, onStateChange, onError }; });

    useEffect(() => {
        let alive = true;
        let player = null;
        loadYouTubeApi()
            .then((YT) => {
                if (!alive) return;
                // YouTube THAY the duoc truyen vao bang <iframe> -> tao the con rieng, React khong quan ly
                const el = document.createElement('div');
                hostRef.current.appendChild(el);
                player = new YT.Player(el, {
                    videoId,
                    width: '100%',
                    height: '100%',
                    title,
                    // khong co nut / phim tat / toan man hinh cua YouTube: dieu khien bang thanh phat cua web
                    // cc_load_policy 0: khong tu bat phu de (MV co phu de mac dinh se de chu len hinh)
                    playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0 },
                    events: {
                        onReady: (e) => callbacks.current.onReady?.(e.target),
                        onStateChange: (e) => callbacks.current.onStateChange?.(e.data),
                        onError: (e) => callbacks.current.onError?.(e.data),
                    },
                });
            })
            .catch((err) => { if (alive) callbacks.current.onError?.(err.message); });
        return () => {
            alive = false;
            try { player?.destroy(); } catch { /* trinh phat chua tao xong */ }
        };
    }, [videoId, title]);

    return <div className="mv-host" ref={hostRef} />;
};

export default MvPlayer;
