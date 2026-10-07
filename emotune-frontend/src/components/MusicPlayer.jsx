// API_URL van can cho the <audio> (trinh duyet tu tai file nhac, khong qua axios)
import { API_URL } from '../config'
import api from '../api'
import { useRef, useState } from 'react'
import { useHardwareButtons } from '../hardware'
import './MusicPlayer.scss'

const EMOTIONS = {
    happy: { emoji: "😊", label: "Happy" },
    sad: { emoji: "😢", label: "Sad" },
    angry: { emoji: "😠", label: "Angry" },
    surprise: { emoji: "😲", label: "Surprised" },
    neutral: { emoji: "😐", label: "Neutral" },
}

const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

const MusicPlayer = (props) => {
    const { data, onFinish } = props;
    const audioRef = useRef(null);
    // het bai va bam Next co the xay ra cung luc -> chi gui report 1 lan
    const reportedRef = useRef(false);

    // giao dien: <audio> khong con hien controls, tu ve nut + thanh thoi gian theo cac su kien cua audio
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const emotion = EMOTIONS[data.emotion] || EMOTIONS.neutral;

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
        api.post('/listen-report',
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

    const togglePlay = () => {
        const audio = audioRef.current;
        if (audio.paused) audio.play(); else audio.pause();
    }

    // keo thanh thoi gian de tua bai
    const handleSeek = (e) => {
        audioRef.current.currentTime = Number(e.target.value);
    }

    // true khi nhac dang dung vi nguoi dung di khoi -> quay lai moi tu phat tiep
    // (tu bam dung thi khong tu phat lai)
    const pausedByAwayRef = useRef(false);

    // nut tren mach: nut 1 = bai tiep, nut 2 = tam dung / phat tiep
    // cam bien PIR: vang nguoi 30s -> tam dung, quay lai -> phat tiep
    useHardwareButtons({
        onNext: finishAndSend,
        onPause: () => {
            pausedByAwayRef.current = false;
            togglePlay();
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

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="player" data-emotion={data.emotion}>
            <audio ref={audioRef}
                src={`${API_URL}/music/${data.song.file_path}`}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={finishAndSend}
                onError={handleError}
                autoPlay />

            <div className="player-emotion">
                <span className="emotion-emoji">{emotion.emoji}</span>
                <span className="emotion-label">{emotion.label}</span>
            </div>

            {data.message && <p className="player-message">{data.message}</p>}
            {data.isEncourage && <div className="player-encourage">💛 This song is to cheer you up</div>}

            <div className="player-card">
                <div className={`player-disc ${isPlaying ? "spinning" : ""}`}>♪</div>
                <div className="player-title">{data.song.title}</div>
                <div className="player-artist">{data.song.artist || "Unknown artist"}</div>

                <div className="player-progress">
                    <span className="time">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        className="seek"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        style={{ "--progress": `${progress}%` }}
                        aria-label="Seek"
                    />
                    <span className="time">{formatTime(duration)}</span>
                </div>

                <div className="player-controls">
                    <button className="ctrl-btn play" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? "❚❚" : "▶"}
                    </button>
                    <button className="ctrl-btn next" onClick={finishAndSend} aria-label="Next song">
                        ⏭
                    </button>
                </div>
            </div>
        </div>
    )
}

export default MusicPlayer
