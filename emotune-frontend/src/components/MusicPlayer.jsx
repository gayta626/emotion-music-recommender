import { API_URL } from '../config'
import axios from 'axios'
import { useRef } from 'react'
import { useHardwareButtons } from '../hardware'

const MusicPlayer = (props) => {
    const { data, onFinish } = props;
    const audioRef = useRef(null);
    // het bai va bam Next co the xay ra cung luc -> chi gui report 1 lan
    const reportedRef = useRef(false);

    const finishAndSend = () => {
        if (reportedRef.current) return;
        reportedRef.current = true;

        const audio = audioRef.current;
        let listened = 0;
        for (let i = 0; i < audio.played.length; i++) {
            listened += audio.played.end(i) - audio.played.start(i);
        }
        console.log("Da nghe duoc :", listened, "giay")

        const finishPercent = audio.duration ? Math.min(listened / audio.duration, 1) : 0;
        axios.post(`${API_URL}/listen-report`,
            {
                emotion: data.emotion,
                songId: data.song.id,
                finishPercent: finishPercent
            }
        )
            .catch((err) => {
                console.log("Loi goi API :" + err)
            })
            // du gui thanh cong hay loi van chuyen bai, tranh bi ket
            .finally(() => {
                onFinish()
            })
    }

    // khong phat duoc file (sai ten / thieu mp3) -> bo qua bai, khong cham diem
    const handleError = () => {
        console.log("Khong phat duoc file:", data.song.file_path)
        reportedRef.current = true;
        onFinish()
    }

    // true khi nhac dang dung vi nguoi dung di khoi -> quay lai moi tu phat tiep
    // (tu bam dung thi khong tu phat lai)
    const pausedByAwayRef = useRef(false);

    // nut tren mach: nut 1 = bai tiep, nut 2 = tam dung / phat tiep
    // cam bien PIR: vang nguoi 30s -> tam dung, quay lai -> phat tiep
    useHardwareButtons({
        onNext: finishAndSend,
        onPause: () => {
            const audio = audioRef.current;
            pausedByAwayRef.current = false;
            if (audio.paused) audio.play(); else audio.pause();
        },
        onAway: () => {
            const audio = audioRef.current;
            if (audio.paused) return;
            pausedByAwayRef.current = true;
            audio.pause();
        },
        onBack: () => {
            if (!pausedByAwayRef.current) return;
            pausedByAwayRef.current = false;
            audioRef.current.play();
        }
    })

    return (
        <>
            <audio ref={audioRef}
                src={`${API_URL}/music/${data.song.file_path}`}
                onPlay={() => console.log("bat dau phat")}
                onEnded={finishAndSend}
                onError={handleError}
                autoPlay controls />
            <button onClick={finishAndSend}>⏭ Bài tiếp</button>
        </>
    )
}

export default MusicPlayer
