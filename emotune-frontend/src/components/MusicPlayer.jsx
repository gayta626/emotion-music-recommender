// API_URL van can cho the <audio> (trinh duyet tu tai file, khong qua axios)
import { API_URL } from '../config'
import { songImageUrl } from '../utils/images'
import api from '../api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useHardwareButtons } from '../hardware'
import ShuffleIcon from '../assets/icons/bar_shuffle.svg?react'
import PrevIcon from '../assets/icons/bar_prev.svg?react'
import PlayIcon from '../assets/icons/bar_play.svg?react'
import PauseIcon from '../assets/icons/bar_pause.svg?react'
import NextIcon from '../assets/icons/bar_next.svg?react'
import RepeatIcon from '../assets/icons/bar_repeat.svg?react'
import LyricsIcon from '../assets/icons/bar_lyrics.svg?react'
import QueueIcon from '../assets/icons/bar_queue.svg?react'
import DevicesIcon from '../assets/icons/bar_devices.svg?react'
import VolumeIcon from '../assets/icons/bar_volume.svg?react'
import DislikeIcon from '../assets/icons/bar_heart_off.svg?react'
import AudioVisualizer from './AudioVisualizer'
import LyricsView from './LyricsView'
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
    // showLyrics: dang o /lyrics -> phu man loi bai hat len tren (thanh phat van o duoi)
    const { data, onFinish, playlist, onJump, onRequest, showLyrics, controlRef, duckRef } = props;
    const audioRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    // het bai va bam Next co the xay ra cung luc -> chi gui report 1 lan
    const reportedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [queueOpen, setQueueOpen] = useState(false);
    // khong tai duoc file nhac (thieu mp3 / sai ten) -> bao tren thanh phat, khong tu nhay bai
    const [loadError, setLoadError] = useState(false);
    // giu nguyen ham giua cac lan render (trinh phat render lai ~4 lan/giay theo thoi gian bai)
    const closeMenu = useCallback(() => setMenuOpen(false), []);

    // mau nen theo "vibe" cua bai (songs.emotion), khong theo cam xuc AI doan
    const vibe = VIBES.includes(data.song.emotion) ? data.song.emotion
        : VIBES.includes(data.emotion) ? data.emotion : "neutral";
    const coverSrc = songImageUrl(data.song);
    const artist = data.song.artist || "Unknown artist";

    const finishAndSend = () => {
        if (reportedRef.current) return;
        reportedRef.current = true;

        // bai khong phat duoc -> sang bai khac, khong cham diem (nghe 0% khong phai do nguoi dung khong thich)
        if (loadError) {
            onFinish();
            return;
        }

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

    // khong phat duoc file (sai ten / thieu mp3): truoc day tu nhay bai ngay -> thanh phat hien roi bien mat,
    // nguoi dung khong biet vi sao (va de lap lai lien tuc). Gio dung lai, bao loi; bam Next de sang bai khac.
    const handleError = () => {
        console.log("Khong phat duoc file:", data.song.file_path)
        setLoadError(true);
        setIsPlaying(false);
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

    // bam 1 dong loi -> tua toi dong do
    const seekTo = (seconds) => {
        audioRef.current.currentTime = seconds;
    }

    // dong man loi: quay lai trang truoc (mo tu trang nao thi ve trang do)
    const closeLyrics = () => {
        if (location.key !== "default") navigate(-1);
        else navigate("/");
    }
    const toggleLyrics = () => (showLyrics ? closeLyrics() : navigate("/lyrics"));

    const toggleMute = () => {
        const next = !muted;
        audioRef.current.muted = next;
        setMuted(next);
    }

    // tro ly dang nghe / dang noi -> nhac nho con 20% ("duck"), xong tra lai ("unduck").
    // Co duck do PlayerHost giu (duckRef), khong giu o day: doi bai thi MusicPlayer duoc tao lai
    const changeVolume = (value) => {
        const audio = audioRef.current;
        audio.volume = duckRef?.current ? value * 0.2 : value;
        audio.muted = false;
        setVolume(value);
        setMuted(false);
    }

    // lenh tu tro ly giong noi (PlayerHost chuyen toi qua controlRef)
    const runControl = (command) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (command === "pause") audio.pause();
        else if (command === "resume") { if (!loadError) audio.play().catch(() => {}); }
        else if (command === "next") finishAndSend();
        // playlist khong cham diem -> chi bo qua bai, khong gui feed-back
        else if (command === "not_for_me") { if (playlist) finishAndSend(); else dislike(); }
        else if (command === "volume_up") changeVolume(Math.min(1, volume + 0.2));
        else if (command === "volume_down") changeVolume(Math.max(0.1, volume - 0.2));
        else if (command === "mute") { audio.muted = true; setMuted(true); }
        else if (command === "duck") audio.volume = volume * 0.2;
        else if (command === "unduck") audio.volume = volume;
    }
    // luon de ban moi nhat (dung state volume moi)
    useEffect(() => {
        if (controlRef) controlRef.current = runControl;
    });
    // bai moi duoc tao khi dang duck (tro ly dang noi) -> ha am luong ngay tu dau
    useEffect(() => {
        if (duckRef?.current && audioRef.current) audioRef.current.volume = 0.2;
    }, [duckRef]);

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
        <div className={`player ${showLyrics ? "lyrics-open" : ""}`} data-vibe={vibe}>
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

            {showLyrics && (
                <LyricsView
                    song={data.song}
                    coverSrc={coverSrc}
                    currentTime={currentTime}
                    onSeek={seekTo}
                    onClose={closeLyrics}
                    actions={!playlist && (
                        <button className="lyrics-action" onClick={dislike} title="Not for me (skip and remember)" aria-label="Not for me">
                            <DislikeIcon />
                        </button>
                    )}
                />
            )}

            {/* thanh phat nhac co dinh duoi cung man hinh */}
            <footer className="player-bar">
                <div className="bar-song">
                    {/* bam anh / ten bai -> mo khung phat lon */}
                    <button className="bar-open" onClick={() => navigate('/now-playing')} aria-label="Open now playing" title="Open now playing">
                        <Cover className="bar-cover" src={coverSrc} />
                        <span className="bar-text">
                            <span className="bar-title">{data.song.title}</span>
                            <span className="bar-artist">{artist}</span>
                        </span>
                    </button>
                    {/* che do playlist khong cham diem -> khong co nut nay */}
                    {!playlist && (
                        <button className="icon-btn dislike" onClick={dislike} title="Not for me (skip and remember)" aria-label="Not for me">
                            <DislikeIcon />
                        </button>
                    )}
                </div>

                <div className="bar-center">
                    <div className="bar-controls">
                        <button className="icon-btn" disabled title="Coming soon" aria-label="Shuffle"><ShuffleIcon /></button>
                        <button className="icon-btn" disabled title="Coming soon" aria-label="Previous song"><PrevIcon /></button>
                        <button className="play-btn" onClick={togglePlay} disabled={loadError} aria-label={isPlaying ? "Pause" : "Play"}>
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button className="icon-btn" onClick={finishAndSend} aria-label="Next song"><NextIcon /></button>
                        <button className="icon-btn" disabled title="Coming soon" aria-label="Repeat"><RepeatIcon /></button>
                    </div>

                    {loadError ? (
                        <p className="bar-error" role="alert">
                            Can't play this song: the music file is missing on the server. Press next to skip.
                        </p>
                    ) : (
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
                    )}
                </div>

                <div className="bar-extra">
                    <button
                        className={`icon-btn lyrics-btn ${showLyrics ? "active" : ""}`}
                        onClick={toggleLyrics}
                        aria-pressed={!!showLyrics}
                        aria-label="Lyrics"
                        title={showLyrics ? "Hide lyrics" : "Lyrics"}
                    >
                        <LyricsIcon />
                    </button>
                    <div className="queue-anchor">
                        <button
                            className={`icon-btn ${menuOpen || queueOpen ? "active" : ""}`}
                            // chan mousedown de "bam ra ngoai thi dong menu" khong dong roi mo lai ngay
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label="Playlist options"
                            title="Queue and playlist"
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
                    <button className="icon-btn" disabled title="Devices: coming soon" aria-label="Devices"><DevicesIcon /></button>
                    <div className="bar-volume">
                        <button className="icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>
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
                </div>
            </footer>
        </div>
    )
}

export default MusicPlayer
