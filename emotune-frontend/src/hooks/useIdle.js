import { useCallback, useEffect, useRef } from "react";

// Nguoi dung "ranh" = khong dung chuot / ban phim / cham / cuon trong `ms` mili-giay.
// Tra ve ham isIdle() de hoi luc can (vd luc het bai) — chi doc ref, khong render lai moi lan chuot dong.
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"];

export const useIdle = (ms = 60000) => {
    const lastRef = useRef(0);

    useEffect(() => {
        lastRef.current = Date.now();
        const mark = () => { lastRef.current = Date.now(); };
        EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
        return () => EVENTS.forEach((e) => window.removeEventListener(e, mark));
    }, []);

    return useCallback(() => Date.now() - lastRef.current >= ms, [ms]);
};
