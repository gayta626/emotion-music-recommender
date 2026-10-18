import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// I6: doi trang -> noi dung giua hien dan + truot len nhe (~0.26s), khong thay cai rup.
// Dung Web Animations API tren cac phan tu dang co (khong boc them the, khong ve lai trang -> giu nguyen state).
// - useLayoutEffect: chay truoc khi ve -> khung hinh dau tien da la opacity 0, khong nhay.
// - PlayerHost (.now-playing) chua THANH PHAT co dinh duoi man hinh -> khong lam mo ca khoi (thanh phat se nhap nhay),
//   chi lam mo khung phat lon (.player-stage) va chi opacity (transform lam position: fixed ben trong lech cho).
// - "Giam chuyen dong" -> bo hieu ung.
const ENTER = [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }];
const FADE = [{ opacity: 0 }, { opacity: 1 }];
const TIMING = { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' };

const usePageTransition = (mainRef) => {
    const { pathname } = useLocation();
    const firstRef = useRef(true);

    useLayoutEffect(() => {
        // lan dau mo web: khong can hieu ung
        if (firstRef.current) {
            firstRef.current = false;
            return;
        }
        const main = mainRef.current;
        if (!main || typeof main.animate !== 'function') return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        for (const el of main.children) {
            if (el.classList.contains('now-playing')) {
                const stage = el.classList.contains('is-hidden') ? null : el.querySelector('.player-stage');
                stage?.animate(FADE, TIMING);
            } else {
                el.animate(ENTER, TIMING);
            }
        }
    }, [pathname, mainRef]);
};

export default usePageTransition;
