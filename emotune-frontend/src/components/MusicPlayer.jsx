// API_URL van can cho the <audio> va <img> (trinh duyet tu tai file, khong qua axios)
import { API_URL } from '../config'
import api from '../api'
import { useCallback, useRef, useState } from 'react'
import { useHardwareButtons } from '../hardware'
import ShuffleIcon from '../assets/icons/player_shuffle.svg?react'
import PrevIcon from '../assets/icons/player_prev.svg?react'
import PlayIcon from '../assets/icons/player_play.svg?react'
import PauseIcon from '../assets/icons/player_pause.svg?react'
import NextIcon from '../assets/icons/player_next.svg?react'
import RepeatIcon from '../assets/icons/player_repeat.svg?react'
import MicIcon from '../assets/icons/player_mic.svg?react'
import QueueIcon from '../assets/icons/player_queue.svg?react'
import VolumeIcon from '../assets/icons/player_volume.svg?react'
import DislikeIcon from '../assets/icons/dislike_icon.svg?react'
import AudioVisualizer from './AudioVisualizer'
import { Cover, QueueMenu, QueuePanel, UpNextCard } from './PlayerOverlays'
import './MusicPlayer.scss'

// moi vibe co 1 bo mau nen rieng trong MusicPlayer.scss ([data-vibe])
const VIBES = ["happy", "sad", "angry", "surprise", "neutral"];

const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

const MusicPlayer = (props) => {
    // playlist: { name, songs, index } khi dang phat playlist, null o che do cam xuc
    const { data, onFinish, playlist, onJump, onRequest } = props;
    const audioRef = useRef(null);
    // het bai va bam Next co the xay ra cung luc -> chi gui report 1 lan
    const reportedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [queueOpen, setQueueOpen] = useState(false);
    // giu nguyen ham giua cac lan render (trinh phat render lai ~4 lan/giay theo thoi gian bai)
    const closeMenu = useCallback(() => setMenuOpen(false), []);

    // mau nen theo "vibe" cua bai (songs.emotion), khong theo cam xuc AI doan
    const vibe = VIBES.includes(data.song.emotion) ? data.song.emotion
        : VIBES.includes(data.emotion) ? data.emotion : "neutral";
    const coverSrc = data.song.artist_avatar ? `${API_URL}/avatars/${data.song.artist_avatar}` : null;
    const artist = data.song.artist || "Unknown artist";

    const finishAndSend = () => {
        if (reportedRef.current) return;
        reportedRef.current = true;

        // che do playlist khong cham diem: diem so thich gan voi cam xuc, playlist khong co cam xuc
        if (playlist) {
            onFinish();
            return;
        }

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

    // 👎 "Not for me": tru 1 diem bai nay voi cam xuc hien tai (POST /feed-back) roi chuyen bai.
    // Khong gui /listen-report nua (da cham diem bang tay roi)
    const dislike = () => {
        if (reportedRef.current) return;
        reportedRef.current = true;
        api.post('/feed-back', { emotion: data.emotion, songId: data.song.id, action: "declined" })
            .catch((err) => console.log("Loi goi API feed-back:", err))
            .finally(() => onFinish());
    }

    // xin bai tu menu ☰: bai cu bo qua (khong cham diem), HomePage phat bai vua xin
    const handleRequest = (result) => {
        reportedRef.current = true;
        setMenuOpen(false);
        onRequest(result);
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

    const handleVolume = (e) => {
        const value = Number(e.target.value);
        audioRef.current.volume = value;
        audioRef.current.muted = value === 0;
        setVolume(value);
        setMuted(value === 0);
    }

    const toggleMute = () => {
        const next = !muted;
        audioRef.current.muted = next;
        setMuted(next);
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
    const nextSong = playlist ? playlist.songs[playlist.index + 1] : null;
    const volumeLevel = muted ? 0 : volume * 100;

    return (
        <div className="player" data-vibe={vibe}>
            {/* crossOrigin: nhac o cong 8080 khac trang web -> can CORS de song am doc duoc du lieu (thieu thi mat tieng) */}
            <audio ref={audioRef}
                crossOrigin="anonymous"
                src={`${API_URL}/music/${data.song.file_path}`}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={finishAndSend}
                onError={handleError}
                autoPlay />

            {/* khung lon: nen gradient doi mau theo vibe cua bai */}
            <section className="player-stage">
                <div className="stage-head">
                    <h2 className="stage-title">{data.song.title}</h2>
                    {playlist
                        ? <span className="stage-source">♪ Playing from {playlist.name} · {playlist.index + 1}/{playlist.songs.length}</span>
                        : data.message && <p className="stage-message">{data.message}</p>}
                </div>
                {/* song am nhap nho theo nhac (anh ca si chi con o thanh phat duoi) */}
                <div className="stage-visual">
                    <AudioVisualizer audioRef={audioRef} />
                </div>

                {playlist && (
                    <UpNextCard
                        remaining={duration - currentTime}
                        duration={duration}
                        nextSong={nextSong}
                        onPlayNow={finishAndSend}
                    />
                )}
                {playlist && queueOpen && (
                    <QueuePanel playlist={playlist} onJump={onJump} onClose={() => setQueueOpen(false)} />
                )}
            </section>

            {/* thanh phat nhac co dinh duoi cung man hinh */}
            <footer className="player-bar">
                <div className="bar-song">
                    <Cover className="bar-cover" src={coverSrc} />
                    <div className="bar-text">
                        <div className="bar-title">{data.song.title}</div>
                        <div className="bar-artist">{artist}</div>
                    </div>
                    {/* che do playlist khong cham diem -> khong co nut nay */}
                    {!playlist && (
                        <button className="icon-btn small dislike" onClick={dislike} title="Not for me (skip and remember)" aria-label="Not for me">
                            <DislikeIcon />
                        </button>
                    )}
                </div>

                <div className="bar-center">
                    <div className="bar-controls">
                        <button className="icon-btn" disabled title="Coming soon" aria-label="Shuffle"><ShuffleIcon /></button>
                        <button className="icon-btn" disabled title="Coming soon" aria-label="Previous song"><PrevIcon /></button>
                        <button className="play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button className="icon-btn next" onClick={finishAndSend} aria-label="Next song"><NextIcon /></button>
                        <button className="icon-btn" disabled title="Coming soon" aria-label="Repeat"><RepeatIcon /></button>
                    </div>

                    <div className="bar-progress">
                        <span className="time">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            className="slider seek"
                            min="0"
                            max={duration || 0}
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            style={{ "--fill": `${progress}%` }}
                            aria-label="Seek"
                        />
                        <span className="time">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="bar-extra">
                    <button className="icon-btn small" disabled title="Coming soon" aria-label="Voice"><MicIcon /></button>
                    <div className="queue-anchor">
                        <button
                            className={`icon-btn small ${menuOpen || queueOpen ? "active" : ""}`}
                            // chan mousedown de "bam ra ngoai thi dong menu" khong dong roi mo lai ngay
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label="Playlist options"
                        >
                            <QueueIcon />
                        </button>
                        {menuOpen && (
                            <QueueMenu
                                inPlaylist={!!playlist}
                                songId={data.song.id}
                                emotion={data.emotion}
                                onRequest={handleRequest}
                                onViewPlaylist={() => { setMenuOpen(false); setQueueOpen(true); }}
                                onClose={closeMenu}
                            />
                        )}
                    </div>
                    <button className="icon-btn small" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                        <VolumeIcon />
                    </button>
                    <input
                        type="range"
                        className="slider volume"
                        min="0"
                        max="1"
                        step="0.01"
                        value={muted ? 0 : volume}
                        onChange={handleVolume}
                        style={{ "--fill": `${volumeLevel}%` }}
                        aria-label="Volume"
                    />
                </div>
            </footer>
        </div>
    )
}

export default MusicPlayer
