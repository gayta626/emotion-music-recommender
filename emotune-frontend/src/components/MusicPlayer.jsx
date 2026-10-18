// API_URL van can cho the <audio> (trinh duyet tu tai file, khong qua axios)
import { API_URL } from '../config'
import { songImageUrl } from '../utils/images'
import api from '../api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ShuffleIcon from '../assets/icons/bar_shuffle.svg?react'
import PrevIcon from '../assets/icons/bar_prev.svg?react'
import PlayIcon from '../assets/icons/bar_play.svg?react'
import PauseIcon from '../assets/icons/bar_pause.svg?react'
import NextIcon from '../assets/icons/bar_next.svg?react'
import RepeatIcon from '../assets/icons/bar_repeat.svg?react'
import LyricsIcon from '../assets/icons/bar_lyrics.svg?react'
import QueueIcon from '../assets/icons/bar_queue.svg?react'
import VolumeIcon from '../assets/icons/bar_volume.svg?react'
import DislikeIcon from '../assets/icons/bar_heart_off.svg?react'
import HeartIcon from './HeartIcon'
import { usePlayback } from '../contexts/playbackContext'
import AudioVisualizer from './AudioVisualizer'
import LyricsView from './LyricsView'
import MicIcon from './MicIcon'
import MvPlayer from './MvPlayer'
import NowPlayingPanel, { NowPlayingStrip } from './NowPlayingPanel'
import { usePanelSlot } from '../contexts/panelSlotContext'
import { createPortal } from 'react-dom'
import { YT_BUFFERING, YT_ENDED, YT_PLAYING } from '../utils/youtube'
import { setVocalCut } from '../utils/audioGraph'
import { useLyrics } from '../hooks/useLyrics'
import { useKaraokeTrack } from '../hooks/useKaraokeTrack'
import { useSingScore } from '../hooks/useSingScore'
import KaraokeScoreCard from './KaraokeScoreCard'
import { Cover, QueueMenu, QueuePanel, UpNextCard } from './PlayerOverlays'
import { MoodFix } from './MoodCheck'
import { moodLabel } from '../utils/moodFix'
import './MusicPlayer.scss'

// moi vibe co 1 bo mau nen rieng trong MusicPlayer.scss ([data-vibe])
const VIBES = ["happy", "sad", "angry", "surprise", "neutral"];
// the loai -> kieu nen + kieu song am (data-genre): rap / pop = cot, ballad / chill = song cong mem
const GENRE_STYLE = { rap: "rap", pop: "pop", ballad: "ballad", "thư giãn": "chill" };

const MvIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.5" y="5" width="19" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 9.2v5.6l4.8-2.8L10 9.2z" fill="currentColor" />
    </svg>
);

const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

const MusicPlayer = (props) => {
    // playlist: { name, songs, index, journey } khi dang phat playlist, null o che do cam xuc.
    // journey = true: hanh trinh cam xuc I4 (hang doi do AI chon) -> VAN cham diem, co 👎, khong tron bai
    // showLyrics: dang o /lyrics -> phu man loi bai hat len tren (thanh phat van o duoi)
    // karaoke: che do karaoke (PlayerHost giu, sang bai moi thi tat), onKaraoke(bat/tat); scoreOn / onScoreOn: cham diem hat (PlayerHost giu)
    // mvWanted / onMvWanted: che do xem MV (PlayerHost giu, doi bai van con); panelCollapsed / onPanelCollapse: cot phai MV thu gon
    // onPrev / canPrev: quay lai bai truoc; shuffle / onShuffle, repeat ("off" | "all" | "one") / onRepeat: PlayerHost giu
    // savedVolume / onVolumeChange: am luong + tat tieng PlayerHost giu qua cac bai
    // onPlayingChange(dang phat?): bao len PlayerHost (mp3 hoac MV) -> icon song nhay o cac trang dung yen khi tam dung
    const { onPlayingChange, data, onFinish, playlist, onJump, onRequest, showLyrics, controlRef, duckRef, savedVolume, onVolumeChange, karaoke, onKaraoke, scoreOn, onScoreOn,
        mvWanted, onMvWanted, panelCollapsed, onPanelCollapse, onPrev, canPrev, shuffle, onShuffle, repeat, onRepeat } = props;
    const audioRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    // het bai va bam Next co the xay ra cung luc -> chi gui report 1 lan
    const reportedRef = useRef(false);
    // co cham diem nghe khong: che do cam xuc + hanh trinh cam xuc co; playlist / bai cua ca si thi khong
    const scored = !playlist || playlist.journey;
    // Repeat one: da cham diem luot nghe dau roi -> cac vong lap sau + luc chuyen bai khong cham lai (khong cong diem ao)
    const scoredRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(savedVolume?.volume ?? 1);
    const [muted, setMuted] = useState(savedVolume?.muted ?? false);
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
    const genre = GENRE_STYLE[data.song.genre] || "pop";
    const artist = data.song.artist || "Unknown artist";

    // ♥ thich bai: luu vao Liked Songs + AI cong diem bai nay khi chon bai theo cam xuc (LIKE_BONUS o backend)
    const { likedIds, toggleLike, playScanResult, setLastMood } = usePlayback();
    const liked = likedIds.has(data.song.id);
    const likeButton = (className) => (
        <button
            className={`${className} like-btn ${liked ? "liked" : ""}`}
            onClick={() => toggleLike(data.song)}
            aria-pressed={liked}
            aria-label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
            title={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
        >
            <HeartIcon filled={liked} />
        </button>
    );

    // C15: nguoi dung sua cam xuc AI doc sai -> phat bai moi theo cam xuc ho chon (bai dang nghe duoc cham diem nhu khi bam Next)
    const fixMood = (result) => {
        setLastMood(result.detectedEmotion || result.emotion);
        playScanResult(result);
    };

    // loi bai: cho man /lyrics + biet bai co loi chay theo nhac khong (khong co -> an nut Karaoke, khong bo giong)
    const { loading: lyricsLoading, lyrics } = useLyrics(data.song);
    const canKaraoke = !!lyrics?.synced;
    const karaokeOn = !!karaoke && canKaraoke;
    // ban da tach giong bang AI (npm run make-karaoke): co -> karaoke phat nhac dem sach + cham diem duoc;
    // chua co (bai moi them, file nhac dem loi) -> bo giong ngay tren do thi Web Audio cua the <audio> (L − R, utils/audioGraph)
    const karaokeAi = useKaraokeTrack(data.song);
    const [beatFailed, setBeatFailed] = useState(false);
    const aiBeat = karaokeOn && !!karaokeAi && !beatFailed;
    useEffect(() => {
        setVocalCut(audioRef.current, karaokeOn && !aiBeat);
    }, [karaokeOn, aiBeat]);

    // doi nguon cua CUNG the <audio> giua mp3 goc va nhac dem AI, nhac noi tiep dung giay dang toi
    // (2 file dai bang nhau, Demucs giu nguyen do dai). Khong tao the <audio> moi: do thi Web Audio (song am) gan voi the nay.
    const swappingRef = useRef(false);
    // so giay da nghe o nguon truoc (doi nguon thi audio.played bi xoa) -> cham diem nghe van dung
    const playedBeforeRef = useRef(0);
    // nguoi dung muon dang phat: mp3 moi chua kip tu phat (autoPlay) thi audio.paused van la true.
    // Bai mo dau o che do MV thi mp3 khong tu phat
    const wantPlayRef = useRef(!(mvWanted && data.song.youtube_id && !showLyrics));
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const url = aiBeat ? karaokeAi.beatUrl : `${API_URL}/music/${data.song.file_path}`;
        if (audio.src === url) return;
        const t = audio.currentTime;
        const resume = wantPlayRef.current;
        for (let i = 0; i < audio.played.length; i++) playedBeforeRef.current += audio.played.end(i) - audio.played.start(i);
        swappingRef.current = true;
        audio.autoplay = false;
        audio.src = url;
        audio.addEventListener("loadedmetadata", () => {
            audio.currentTime = Math.min(t, Math.max(0, audio.duration - 0.5));
            swappingRef.current = false;
            if (resume) audio.play().catch(() => { });
        }, { once: true });
    }, [aiBeat, karaokeAi, data.song.file_path]);

    // cham diem hat (chi khi dang o man loi + karaoke AI + bat "Score me")
    const canScore = !!karaokeAi && !beatFailed;
    const scoring = !!scoreOn && aiBeat && !!showLyrics;
    const sing = useSingScore({ active: scoring, audioRef, track: karaokeAi?.track });
    // hat xong bai -> the diem; bai ke cho toi khi bam nut tren the
    const [scoreCard, setScoreCard] = useState(null);
    // KaraokeLine doc thoi gian bai 60 lan/giay qua ham nay (giu nguyen ham -> khong khoi dong lai vong ve)
    const getTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);

    // ---------- MV (H16) ----------
    // Bam "MV" o khung song am -> MV THAY CA khung song am (o /now-playing). Luot sang trang khac -> MV hien o cot phai
    // kieu Spotify (NowPlayingPanel) de van xem tiep; thu gon cot -> chi con dai mong, MV VAN CHAY (an di) de mo lai van khop nhac.
    // CHI 1 trinh phat YouTube cho ca luc xem, KHONG BAO GIO tao lai: no nam trong lop noi (.mv-float), moi khung hinh tu
    // "bam" theo o video dang hien (khung lon / cot phai) -> doi cho, dong mo cot ma nhac van chay lien mach (khong tai lai, khong tua).
    // Video khong bam duoc: dieu khien (Play / tua / am luong) o thanh phat duoi. Dang xem MV: mp3 tam dung.
    // Chi chuyen ve mp3 khi bam Close MV / ✕, MV loi, hoac mo /lyrics (man loi chay theo mp3).
    // Che do MV (mvWanted) do PlayerHost giu -> sang bai co MV van chieu MV (nhu Spotify).
    const panelSlot = usePanelSlot();
    const youtubeId = data.song.youtube_id;
    const onStage = location.pathname === "/now-playing";
    const [mvFailed, setMvFailed] = useState(false); // bai nay MV loi (cam nhung / mat mang) -> khong thu lai
    // dang o che do MV: trinh phat YouTube ton tai va dang phat tieng (mp3 dung) — ke ca luc bi an (cot phai thu gon)
    const mvOpen = !!mvWanted && !!youtubeId && !showLyrics && !mvFailed;
    const mvInPanel = mvOpen && !onStage && !!panelSlot && !panelCollapsed;
    // cot phai thu gon (kieu Spotify): chi con dai mong co nut mo lai
    const mvStrip = mvOpen && !onStage && !!panelSlot && panelCollapsed;
    // MV dang hien o dau: khung lon / cot phai / an (thu gon: van chay, chi khong hien)
    const mvPlace = onStage ? "stage" : mvInPanel ? "panel" : "off";
    const mvPlaceRef = useRef(mvPlace);
    useEffect(() => { mvPlaceRef.current = mvPlace; });
    const stageMvRef = useRef(null);    // o video trong khung lon
    const panelMvRef = useRef(null);    // o video trong cot phai
    const mvFloatRef = useRef(null);    // lop noi chua trinh phat YouTube
    // { fromAudio: {t, dur} } khi vua chuyen tu mp3 sang MV -> MV bat dau dung doan nhac dang toi (quy theo ti le thoi luong);
    // { time, playing } = MV dang toi dau -> chuyen ve mp3 thi noi tiep
    const mvResumeRef = useRef({ time: 0, playing: true });
    // MV phat luon khi vua bat: bam nut MV, hoac bai moi o che do MV (mp3 bai moi khong tu phat nen khong dua vao mp3)
    const mvStartRef = useRef(true);
    const [mvNote, setMvNote] = useState(null);     // bao loi ngan (MV bi cam nhung, khong co mang)
    // thoi gian / do dai / dang phat cua MV (thanh phat hien so nay khi dang xem MV, so cua mp3 giu nguyen)
    const [mvTime, setMvTime] = useState(0);
    const [mvDuration, setMvDuration] = useState(0);
    const [mvPlaying, setMvPlaying] = useState(false);
    // trang thai trinh phat YouTube (-1 chua chay, 1 dang phat, 2 dung, 3 dang tai...) -> dung / chua chay thi AN trinh phat
    const [mvState, setMvState] = useState(-1);
    const mvRef = useRef(null);                     // trinh phat YouTube (co sau onReady)
    const captionsOffRef = useRef(false);           // da tat phu de cua trinh phat hien tai chua
    // so giay MV da THAT SU xem (de cham diem nghe nhu mp3): cong don khi thoi gian tang deu luc dang phat
    const mvWatchRef = useRef({ seconds: 0, last: null, duration: 0 });
    // trinh phat dang dieu khien: MV khi dang xem, nguoc lai the <audio>
    const mv = () => (mvOpen ? mvRef.current : null);

    // am luong MV theo thanh am luong (0..100), co tinh "duck" khi tro ly dang noi
    const syncMvVolume = (value, isMuted) => {
        const player = mvRef.current;
        if (!player) return;
        player.setVolume(Math.round(value * (duckRef?.current ? 0.2 : 1) * 100));
        if (isMuted) player.mute(); else player.unMute();
    }

    const openMv = () => {
        setMvNote(null);
        setMvFailed(false);
        setMvTime(0);
        setMvDuration(0);
        setMvPlaying(false);
        setMvState(-1);
        mvStartRef.current = true;
        onMvWanted(true);
    }

    const closeMv = () => {
        // lay dung giay MV dang toi ngay luc bam (so hoi 4 lan/giay co the cham toi 0.25s) -> mp3 noi tiep khong bi lui
        const player = mvRef.current;
        try {
            if (player?.getCurrentTime) {
                mvResumeRef.current = { time: player.getCurrentTime(), playing: player.getPlayerState() === YT_PLAYING };
                player.pauseVideo();
            }
        } catch { /* chua san sang */ }
        setMvNote(null);
        onMvWanted(false);
    }

    // doi giua mp3 va MV, nhac NOI TIEP: MV dai khac mp3 (doan dao, doan ket) -> quy doi theo ti le thoi luong
    const mapTime = (t, fromDur, toDur) => (fromDur > 0 && toDur > 0 ? t * toDur / fromDur : t);

    // bat MV -> dung mp3, MV chay tiep tu doan nhac dang toi;
    // tat MV (bam nut / loi / mo /lyrics) -> mp3 phat tiep tu doan MV dang toi (MV dang dung thi mp3 cung dung)
    const mvWasOpen = useRef(false);
    useEffect(() => {
        const audio = audioRef.current;
        if (mvOpen && !mvWasOpen.current) {
            if (audio) {
                mvResumeRef.current = {
                    fromAudio: { t: audio.currentTime, dur: audio.duration },
                    playing: mvStartRef.current || !audio.paused,
                };
                audio.pause();
            }
            mvStartRef.current = false;
        } else if (!mvOpen && mvWasOpen.current) {
            mvRef.current = null;
            const { time, playing } = mvResumeRef.current;
            if (audio && time !== undefined) audio.currentTime = Math.min(mapTime(time, mvWatchRef.current.duration, audio.duration), Math.max(0, (audio.duration || 0) - 1));
            if (audio && playing && !loadError) audio.play().catch(() => { });
        }
        mvWasOpen.current = mvOpen;
    }, [mvOpen, loadError]);

    // dang xem MV: hoi trinh phat YouTube 4 lan/giay -> thanh thoi gian, nut Play, so giay da xem
    useEffect(() => {
        if (!mvOpen) return;
        const timer = setInterval(() => {
            const player = mvRef.current;
            if (!player?.getCurrentTime) return;
            const t = player.getCurrentTime();
            const d = player.getDuration();
            const playing = player.getPlayerState() === YT_PLAYING;
            const watch = mvWatchRef.current;
            // chi cong khi phat lien mach (tua toi / lui thi khong tinh)
            if (playing && watch.last !== null && t > watch.last && t - watch.last < 1.5) watch.seconds += t - watch.last;
            watch.last = t;
            if (d) watch.duration = d;
            setMvTime(t);
            setMvDuration(d);
            setMvPlaying(playing);
            setMvState(player.getPlayerState());
            // phu de chu kenh dat mac dinh chi tai SAU khi video bat dau phat -> tat lai 1 lan luc do
            if (playing && !captionsOffRef.current) {
                captionsOffRef.current = true;
                try { player.unloadModule("captions"); } catch { /* khong co phu de */ }
            }
            // het video (trang thai 0) khong luu "dang dung" -> lan sau mo lai van phat
            if (player.getPlayerState() !== YT_ENDED) mvResumeRef.current = { time: t, playing };
        }, 250);
        return () => clearInterval(timer);
    }, [mvOpen]);

    // lop noi chua MV bam theo o video dang hien MOI KHUNG HINH (doi trang, cuon, doi co man hinh van khop).
    // Ghi thang vao style (khong render lai React) -> trinh phat YouTube khong bi go ra / tao lai
    useEffect(() => {
        if (!mvOpen) return;
        const narrow = window.matchMedia("(max-width: 1100px)");
        let frameId;
        const follow = () => {
            frameId = requestAnimationFrame(follow);
            const el = mvFloatRef.current;
            if (!el) return;
            const place = mvPlaceRef.current;
            const target = place === "stage" ? stageMvRef.current : place === "panel" ? panelMvRef.current : null;
            el.dataset.place = target ? place : "off";
            if (!target) return;
            const r = target.getBoundingClientRect();
            el.style.transform = `translate(${r.left}px, ${r.top}px)`;
            el.style.width = `${r.width}px`;
            el.style.height = `${r.height}px`;
            // man hep: cot phai la ngan keo noi tren header -> MV cung phai noi len tren
            el.style.zIndex = place === "panel" && narrow.matches ? "18" : "14";
        };
        follow();
        return () => cancelAnimationFrame(frameId);
    }, [mvOpen]);

    // trinh phat YouTube san sang (1 lan moi lan bat MV) -> bat dau dung doan nhac mp3 dang toi
    const mvReady = (player) => {
        mvRef.current = player;
        mvWatchRef.current.last = null;     // vua tua: khong tinh doan nhay vao so giay da xem
        captionsOffRef.current = false;
        // tat phu de ma video bat san (cc_load_policy khong chan duoc phu de chu kenh dat mac dinh)
        try { player.unloadModule("captions"); } catch { /* trinh phat khong co phu de */ }
        syncMvVolume(volume, muted);
        const { time, fromAudio, playing } = mvResumeRef.current;
        const start = fromAudio ? mapTime(fromAudio.t, fromAudio.dur, player.getDuration()) : time;
        if (start > 1) player.seekTo(start, true);
        if (playing) player.playVideo(); else player.pauseVideo();
    }

    // MV loi -> bai nay quay ve mp3 (van giu "muon xem MV" cho bai sau)
    const mvError = (code) => {
        setMvFailed(true);
        setMvNote(code === 101 || code === 150 || code === 100
            ? "This MV can't be played outside YouTube. Playing the song instead."
            : "Can't load the MV (no internet?). Playing the song instead.");
    }

    // ti le da nghe (0..1): mp3 da phat + MV da xem, lay cai lon hon
    const listenedFraction = () => {
        const audio = audioRef.current;
        let listened = 0;
        for (let i = 0; i < audio.played.length; i++) {
            listened += audio.played.end(i) - audio.played.start(i);
        }
        listened += playedBeforeRef.current;
        const fromMp3 = audio.duration ? listened / audio.duration : 0;
        const watch = mvWatchRef.current;
        const fromMv = watch.duration ? watch.seconds / watch.duration : 0;
        console.log("Da nghe duoc :", listened, "giay mp3,", Math.round(watch.seconds), "giay MV")
        return Math.min(Math.max(fromMp3, fromMv), 1);
    }

    const finishAndSend = () => {
        if (reportedRef.current) return;
        reportedRef.current = true;

        // bai khong phat duoc -> sang bai khac, khong cham diem (nghe 0% khong phai do nguoi dung khong thich)
        if (loadError) {
            onFinish();
            return;
        }

        // che do playlist khong cham diem: diem so thich gan voi cam xuc, playlist khong co cam xuc
        if (!scored || scoredRef.current) {
            onFinish();
            return;
        }

        sendListenReport()
            // du gui thanh cong hay loi van chuyen bai, tranh bi ket
            .finally(() => {
                onFinish()
            })
    }

    const sendListenReport = () => {
        scoredRef.current = true;
        return api.post('/listen-report',
            {
                emotion: data.emotion,
                songId: data.song.id,
                finishPercent: listenedFraction()
            }
        )
            .catch((err) => {
                console.log("Loi goi API :" + err)
            })
    }

    // het bai (mp3 / MV): Repeat one -> cham diem luot dau (1 lan) roi phat lai tu dau; nguoc lai sang bai
    const handleEnded = () => {
        // dang cham diem karaoke -> hien diem, chua sang bai
        if (scoring && !mv()) { setScoreCard(sing.getResult()); return; }
        if (repeat !== "one") { finishAndSend(); return; }
        if (scored && !loadError && !scoredRef.current) sendListenReport();
        const player = mv();
        if (player) { player.seekTo(0, true); player.playVideo(); }
        else { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => { }); }
    }

    // Prev (giong Spotify): bai da chay > 3s -> tua ve dau; moi bat dau -> ve bai truoc (khong cham diem bai dang nghe:
    // quay lai khong co nghia la khong thich bai nay). Khong co bai truoc -> cung tua ve dau
    const handlePrev = () => {
        const player = mv();
        const t = player ? player.getCurrentTime() : audioRef.current.currentTime;
        if (t > 3 || !canPrev) {
            if (player) { player.seekTo(0, true); setMvTime(0); }
            else audioRef.current.currentTime = 0;
            return;
        }
        reportedRef.current = true;
        onPrev();
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
        // nhac dem AI loi (file hong / bi xoa) -> quay ve mp3 goc, karaoke dung cach L − R
        if (audioRef.current?.src.includes("/karaoke/")) { swappingRef.current = false; setBeatFailed(true); return; }
        console.log("Khong phat duoc file:", data.song.file_path)
        setLoadError(true);
        setIsPlaying(false);
    }

    // phat / dung trinh phat dang dieu khien (MV neu dang xem, nguoc lai mp3)
    const isPaused = () => {
        const player = mv();
        return player ? player.getPlayerState() !== YT_PLAYING : audioRef.current.paused;
    }
    const pauseMedia = () => {
        const player = mv();
        if (player) player.pauseVideo(); else audioRef.current.pause();
    }
    const playMedia = () => {
        const player = mv();
        if (player) player.playVideo();
        else if (!loadError) audioRef.current.play().catch(() => { });
    }

    const togglePlay = () => (isPaused() ? playMedia() : pauseMedia());

    // keo thanh thoi gian de tua bai
    const handleSeek = (e) => {
        const seconds = Number(e.target.value);
        const player = mv();
        if (player) { player.seekTo(seconds, true); setMvTime(seconds); }
        else audioRef.current.currentTime = seconds;
    }

    const handleVolume = (e) => {
        const value = Number(e.target.value);
        audioRef.current.volume = value;
        audioRef.current.muted = value === 0;
        setVolume(value);
        setMuted(value === 0);
        syncMvVolume(value, value === 0);
    }

    // the diem karaoke: hat lai tu dau (cham lai tu 0) / sang bai ke
    const singAgain = () => {
        sing.reset();
        setScoreCard(null);
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
    }
    const nextAfterScore = () => {
        setScoreCard(null);
        finishAndSend();
    }
    // dang hien the diem ma roi man loi (Esc, nut Back...) -> khong ai bam nut tren the nua -> sang bai luon
    // (bai moi = MusicPlayer moi -> the tu mat)
    useEffect(() => {
        if (scoreCard && !showLyrics) finishAndSend();
    });

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

    // nut Karaoke o khung lon: bat -> mo luon man loi (de hat theo); dang bat -> tat, o lai
    const toggleKaraokeFromStage = () => {
        if (karaokeOn) { onKaraoke(false); return; }
        onKaraoke(true);
        navigate("/lyrics");
    }

    const toggleMute = () => {
        const next = !muted;
        audioRef.current.muted = next;
        setMuted(next);
        syncMvVolume(volume, next);
    }

    // tro ly dang nghe / dang noi -> nhac nho con 20% ("duck"), xong tra lai ("unduck").
    // Co duck do PlayerHost giu (duckRef), khong giu o day: doi bai thi MusicPlayer duoc tao lai
    const changeVolume = (value) => {
        const audio = audioRef.current;
        audio.volume = duckRef?.current ? value * 0.2 : value;
        audio.muted = false;
        setVolume(value);
        setMuted(false);
        syncMvVolume(value, false);
    }

    // lenh tu tro ly giong noi (PlayerHost chuyen toi qua controlRef)
    const runControl = (command) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (command === "pause") pauseMedia();
        else if (command === "resume") playMedia();
        else if (command === "next") finishAndSend();
        // "bai truoc": ve han bai truoc (khong tua ve dau nhu nut Prev khi bai da chay > 3s); khong co bai truoc -> tua ve dau
        else if (command === "prev") {
            if (canPrev) { reportedRef.current = true; onPrev(); }
            else handlePrev();
        }
        // "thich bai nay": chi tha tim (da thich roi thi giu nguyen, khong bo thich nham)
        else if (command === "like") { if (!liked) toggleLike(data.song); }
        // MV (tro ly: "mo MV" / "tat MV"): giong bam nut MV o khung song am
        else if (command === "mv_on") { if (youtubeId && !mvOpen) openMv(); }
        else if (command === "mv_off") { if (mvOpen) closeMv(); }
        // playlist khong cham diem -> chi bo qua bai, khong gui feed-back
        else if (command === "not_for_me") { if (!scored) finishAndSend(); else dislike(); }
        else if (command === "volume_up") changeVolume(Math.min(1, volume + 0.2));
        else if (command === "volume_down") changeVolume(Math.max(0.1, volume - 0.2));
        else if (command === "mute") { audio.muted = true; setMuted(true); syncMvVolume(volume, true); }
        // duckRef da duoc PlayerHost dat truoc khi goi -> syncMvVolume tu tinh 20%
        else if (command === "duck") { audio.volume = volume * 0.2; syncMvVolume(volume, muted); }
        else if (command === "unduck") { audio.volume = volume; syncMvVolume(volume, muted); }
    }
    // luon de ban moi nhat (dung state volume moi)
    useEffect(() => {
        if (controlRef) controlRef.current = runControl;
    });
    // am luong / tat tieng -> the <audio> (bai moi bat dau bang muc da chinh o bai truoc; tro ly dang noi (duck) -> 20%)
    // va bao PlayerHost giu lai cho bai sau
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.volume = duckRef?.current ? volume * 0.2 : volume;
            audio.muted = muted;
        }
        onVolumeChange?.({ volume, muted });
    }, [volume, muted, duckRef, onVolumeChange]);

    // MV dung / chua chay -> AN trinh phat YouTube, hien anh thumbnail cua MV (YouTube cam ve de len trinh phat,
    // nen khong che icon cua ho ma an ca trinh phat khi khong phat)
    const mvHidden = mvState !== YT_PLAYING && mvState !== YT_BUFFERING;
    const mvPoster = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "";

    // 1 trinh phat MV, dat o khung lon (/now-playing) hoac cot phai (trang khac)
    const mvPlayer = mvOpen && (
        <MvPlayer videoId={youtubeId} title={`${data.song.title} — ${artist} (MV)`}
            onReady={mvReady}
            onStateChange={(state) => { if (state === YT_ENDED) handleEnded(); }}
            onError={mvError} />
    );

    // thanh phat hien so cua MV khi dang xem MV, nguoc lai cua mp3
    const shownTime = mvOpen ? mvTime : currentTime;
    const shownDuration = mvOpen ? mvDuration : duration;
    const shownPlaying = mvOpen ? mvPlaying : isPlaying;
    useEffect(() => { onPlayingChange?.(shownPlaying); }, [shownPlaying, onPlayingChange]);
    const progress = shownDuration ? (shownTime / shownDuration) * 100 : 0;
    // Repeat all: bai cuoi hang doi -> bai tiep la bai dau
    const nextSong = playlist ? (playlist.songs[playlist.index + 1] ?? (repeat === "all" && !playlist.journey ? playlist.songs[0] : null)) : null;
    const repeatLabel = repeat === "one" ? "Repeat one (on)" : repeat === "all" ? "Repeat all (on)" : "Repeat (off)";
    const volumeLevel = muted ? 0 : volume * 100;

    return (
        <div className={`player ${showLyrics ? "lyrics-open" : ""} ${mvOpen && onStage ? "mv-on" : ""}`} data-vibe={vibe} data-genre={genre}>
            {/* crossOrigin: nhac o cong 8080 khac trang web -> can CORS de song am doc duoc du lieu (thieu thi mat tieng) */}
            <audio ref={audioRef}
                crossOrigin="anonymous"
                src={`${API_URL}/music/${data.song.file_path}`}
                onPlay={() => { wantPlayRef.current = true; setIsPlaying(true); }}
                // dang doi nguon mp3 <-> nhac dem: trinh duyet tu dung, khong phai nguoi dung bam dung
                onPause={() => { if (swappingRef.current) return; wantPlayRef.current = false; setIsPlaying(false); }}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={handleEnded}
                onError={handleError}
                // dang o che do xem MV ma bai co MV -> khong tu phat mp3 (MV phat thay)
                autoPlay={!mvOpen} />

            {/* khung lon: nen toi nhieu lop theo vibe (mau) + the loai (hoa van), anh bia nhoe phia sau
                -> moi bai 1 tong rieng, song am sang mau noi len tren */}
            <section className="player-stage">
                {coverSrc && <div className="stage-cover" style={{ backgroundImage: `url(${coverSrc})` }} aria-hidden="true" />}
                <div className="stage-aurora" aria-hidden="true" />
                <div className="stage-head">
                    <div className="stage-info">
                        <h2 className="stage-title">{data.song.title}</h2>
                        {playlist && (
                            <span className="stage-source">
                                {playlist.journey ? `✦ ${playlist.name}` : `♪ Playing from ${playlist.name}`} · {playlist.index + 1}/{playlist.songs.length}
                            </span>
                        )}
                        {(!playlist || playlist.journey) && data.message && <p className="stage-message">{data.message}</p>}
                        {/* I2: vi sao NYX chon bai nay (backend lay tu dung cac diem da dung de xep hang) */}
                        {scored && data.song.why?.length > 0 && (
                            <p className="stage-why">
                                <span className="why-label">Why this song</span>
                                {data.song.why.map((w) => w.text).join(" · ")}
                            </p>
                        )}
                        {/* C15: bai chon tu 1 lan quet camera -> nguoi dung sua duoc cam xuc AI doc sai */}
                        {data.scanId && data.detectedEmotion && (
                            <MoodFix scanId={data.scanId} detected={data.detectedEmotion} onResult={fixMood} />
                        )}
                        {/* vua sua / xac nhan cam xuc -> cam on + noi ro NYX dung cau tra loi do the nao */}
                        {data.aiEmotion && (
                            <p className="stage-note" role="status">
                                {data.corrected && data.via === "voice"
                                    ? `NYX read your face as ${moodLabel(data.aiEmotion)}, but went with what you said`
                                    : data.corrected
                                        ? `Thanks! NYX had read you as ${moodLabel(data.aiEmotion)}, it'll learn from this`
                                        : "Thanks for confirming, NYX will learn from your answer"}
                                {data.faceSaved ? " (photo kept for retraining)" : ""}
                            </p>
                        )}
                        {mvNote && <p className="stage-note" role="status">{mvNote}</p>}
                    </div>
                    <div className="stage-actions">
                    {/* bai co MV tren YouTube (npm run fetch-mv) -> nut MV */}
                    {youtubeId && (
                        <button
                            className={`pill-toggle mv-toggle ${mvOpen ? "on" : ""}`}
                            onClick={mvOpen ? closeMv : openMv}
                            aria-pressed={mvOpen}
                            title={mvOpen ? "Close the MV (back to the song)" : "Watch the music video (YouTube)"}
                        >
                            <MvIcon />
                            <span>{mvOpen ? "Close MV" : "MV"}</span>
                        </button>
                    )}
                    {/* chi bai co loi chay theo nhac moi co Karaoke */}
                    {canKaraoke && (
                        <button
                            className={`pill-toggle karaoke-toggle ${karaokeOn ? "on" : ""}`}
                            onClick={toggleKaraokeFromStage}
                            aria-pressed={karaokeOn}
                            title={karaokeOn ? "Turn karaoke off (vocals back)" : "Karaoke: remove the singer's voice and show lyrics"}
                        >
                            <MicIcon />
                            <span>{karaokeOn ? "Karaoke on" : "Karaoke"}</span>
                        </button>
                    )}
                    </div>
                </div>
                {/* song am nhap nho theo nhac (anh ca si chi con o thanh phat duoi) */}
                <div className="stage-visual">
                    {/* dang xem MV: MV thay ca khung song am (lop trong suot chan chuot -> dieu khien o thanh phat) */}
                    {/* o trong: MV that nam o lop noi .mv-float, bam theo o nay; dung / chua chay -> lo anh thumbnail */}
                    {mvOpen && onStage
                        ? <div ref={stageMvRef} className="stage-mv" style={{ backgroundImage: `url(${mvPoster})` }} />
                        : <AudioVisualizer audioRef={audioRef} vibe={vibe} />}
                </div>

                {/* Repeat one: bai nay se phat lai -> khong bao "Up next" */}
                {playlist && repeat !== "one" && (
                    <UpNextCard
                        remaining={shownDuration - shownTime}
                        duration={shownDuration}
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
                    lyrics={lyrics}
                    loading={lyricsLoading}
                    karaoke={karaokeOn}
                    onKaraoke={onKaraoke}
                    aiBeat={aiBeat}
                    canScore={canScore}
                    scoreOn={!!scoreOn}
                    onScoreOn={onScoreOn}
                    scoreStatus={sing.status}
                    hearing={sing.hearing}
                    scoreCard={scoreCard && <KaraokeScoreCard result={scoreCard} onAgain={singAgain} onNext={nextAfterScore} />}
                    getTime={getTime}
                    currentTime={currentTime}
                    onSeek={seekTo}
                    onClose={closeLyrics}
                    actions={<>
                        {likeButton("lyrics-action")}
                        {scored && (
                            <button className="lyrics-action" onClick={dislike} title="Not for me (skip and remember)" aria-label="Not for me">
                                <DislikeIcon />
                            </button>
                        )}
                    </>}
                />
            )}

            {/* luot sang trang khac luc dang xem MV -> MV o cot phai kieu Spotify (ve vao o trong cua MainLayout) */}
            {mvInPanel && createPortal(
                <NowPlayingPanel
                    song={data.song}
                    artist={artist}
                    coverSrc={coverSrc}
                    context={playlist ? playlist.name : "Music video"}
                    lyrics={lyrics}
                    videoRef={panelMvRef}
                    poster={mvPoster}
                    onCollapse={() => onPanelCollapse(true)}
                    onClose={closeMv}
                    onOpenLyrics={() => navigate("/lyrics")}
                />,
                panelSlot
            )}
            {/* lop noi chua 1 trinh phat MV duy nhat, tu bam theo o video dang hien (khung lon / cot phai) hoac an di.
                Khong bam duoc (pointer-events: none). Dung / chua chay -> an trinh phat, lo anh thumbnail ben duoi */}
            {mvOpen && createPortal(
                <div ref={mvFloatRef} className={`mv-float ${mvHidden ? "is-paused" : ""}`} data-place="off" aria-hidden="true">
                    {mvPlayer}
                </div>,
                panelSlot?.parentElement || document.body
            )}
            {/* cot phai thu gon: chi con dai mong + nut mo lai (kieu Spotify) */}
            {mvStrip && createPortal(<NowPlayingStrip onExpand={() => onPanelCollapse(false)} />, panelSlot)}

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
                    {likeButton("icon-btn")}
                    {/* che do playlist khong cham diem -> khong co nut nay */}
                    {scored && (
                        <button className="icon-btn dislike" onClick={dislike} title="Not for me (skip and remember)" aria-label="Not for me">
                            <DislikeIcon />
                        </button>
                    )}
                </div>

                <div className="bar-center">
                    <div className="bar-controls">
                        {/* che do cam xuc: NYX chon bai tiep theo cam xuc -> Shuffle chi dung cho playlist / hang doi */}
                        <button
                            className={`icon-btn toggle ${shuffle && playlist && !playlist.journey ? "on" : ""}`}
                            onClick={onShuffle}
                            disabled={!playlist || playlist.journey}
                            aria-pressed={!!shuffle}
                            aria-label="Shuffle"
                            title={!playlist ? "Shuffle works on playlists. In mood mode NYX picks the next song for you"
                                : playlist.journey ? "A mood journey keeps its order (sad songs first, then brighter ones)"
                                : shuffle ? "Shuffle (on)" : "Shuffle (off)"}
                        ><ShuffleIcon /></button>
                        <button className="icon-btn" onClick={handlePrev} aria-label="Previous song" title="Previous (press again within 3s to go back a song)"><PrevIcon /></button>
                        <button className="play-btn" onClick={togglePlay} disabled={loadError} aria-label={shownPlaying ? "Pause" : "Play"}>
                            {shownPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button className="icon-btn" onClick={finishAndSend} aria-label="Next song"><NextIcon /></button>
                        <button
                            className={`icon-btn toggle repeat-btn ${repeat !== "off" ? "on" : ""}`}
                            onClick={onRepeat}
                            aria-label={repeatLabel}
                            title={repeat === "all" && !playlist ? "Repeat all (on): applies to playlists" : repeatLabel}
                        >
                            <RepeatIcon />
                            {repeat === "one" && <span className="repeat-one" aria-hidden="true">1</span>}
                        </button>
                    </div>

                    {loadError ? (
                        <p className="bar-error" role="alert">
                            Can't play this song: the music file is missing on the server. Press next to skip.
                        </p>
                    ) : (
                    <div className="bar-progress">
                        <span className="time">{formatTime(shownTime)}</span>
                        <input
                            type="range"
                            className="slider seek"
                            min="0"
                            max={shownDuration || 0}
                            step="0.1"
                            value={shownTime}
                            onChange={handleSeek}
                            style={{ "--fill": `${progress}%` }}
                            aria-label="Seek"
                        />
                        <span className="time">{formatTime(shownDuration)}</span>
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
