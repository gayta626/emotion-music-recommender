// API_URL van can cho the <audio> (trinh duyet tu tai file, khong qua axios)
import { API_URL } from '../config'
import { songImageUrl } from '../utils/images'
import api from '../api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
import { YT_BUFFERING, YT_ENDED, YT_PAUSED, YT_PLAYING } from '../utils/youtube'
import { setVocalCut } from '../utils/audioGraph'
import { useLyrics } from '../hooks/useLyrics'
import { useKaraokeTrack } from '../hooks/useKaraokeTrack'
import { useSingScore } from '../hooks/useSingScore'
import KaraokeScoreCard from './KaraokeScoreCard'
import { Cover, QueueMenu, QueuePanel, UpNextCard } from './PlayerOverlays'
import { MoodFix } from './MoodCheck'
import { moodLabel } from '../utils/moodFix'
import { addMvSpan, coveredFraction, spansFromPlayed } from '../utils/listenSpans'
import { songToMv, mvToSong } from '../utils/mvTime'
import './MusicPlayer.scss'

// moi vibe co 1 bo mau nen rieng trong MusicPlayer.scss ([data-vibe])
const VIBES = ["happy", "sad", "angry", "surprise", "neutral"];
// the loai -> kieu nen + kieu song am (data-genre): rap / pop = cot, ballad / chill = song cong mem
const GENRE_STYLE = { rap: "rap", pop: "pop", ballad: "ballad", "thư giãn": "chill" };
// chuyen giao mp3 -> MV (khong lang): MV tua truoc HANDOFF_LEAD giay (bu thoi gian tai), lech qua MAX_HANDOFF_DRIFT
// thi tua lai, khop roi chuyen dan tieng trong FADE_MS
const HANDOFF_LEAD = 0.4;
const MAX_HANDOFF_DRIFT = 0.3;
const FADE_MS = 300;
// MV chay ngam o /now-playing: lech mp3 qua muc nay (giay) thi tua lai cho khop
const SHADOW_MAX_DRIFT = 0.5;

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
    // cac doan da nghe o nguon truoc (doi nguon thi audio.played bi xoa) -> cham diem nghe van dung (utils/listenSpans)
    const playedBeforeRef = useRef([]);
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
        playedBeforeRef.current = [...playedBeforeRef.current, ...spansFromPlayed(audio.played, audio.duration)];
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
    // nguoi dung da tat MV (Close MV / ✕ / "tat MV") o BAI NAY -> cot phai khong tu chieu lai cho bai nay
    const [mvDismissed, setMvDismissed] = useState(false);
    // cot phai "Now playing" LUON co o trang khac /now-playing, /lyrics (chon bai o trang chu / trang ca si van thay);
    // chua xem MV -> anh + nut ▶ xem MV. Thu gon (kieu Spotify): chi con dai mong co nut mo lai
    const panelShown = !onStage && !showLyrics && !!panelSlot;
    // cot phai dang hien ma bai co MV -> TU CHIEU MV o cot (quet mat xong bam Home, bai ke khi dang luot...), ke ca khi
    // chua bat che do MV; ve /now-playing thi lai la song am (nhac noi tiep). Man <= 1100px: cot la ngan keo noi -> khong tu mo
    const panelMv = panelShown && !mvDismissed && window.matchMedia("(min-width: 1101px)").matches;
    // dang o che do MV: trinh phat YouTube ton tai va dang phat tieng (mp3 dung) — ke ca luc bi an (cot phai thu gon)
    const mvOpen = (!!mvWanted || panelMv) && !!youtubeId && !showLyrics && !mvFailed;
    // MV "CHAY NGAM" o /now-playing: bai co MV ma cot phai o trang khac se tu chieu -> o trang phat nhac trinh phat YouTube
    // van ton tai (an, cam, chay theo mp3) -> ra trang khac MV da tai san, chi chuyen tieng (khong tai lai, khong khung den)
    const mvShadow = onStage && !mvOpen && !!youtubeId && !mvFailed && !mvDismissed && !showLyrics && !!panelSlot
        && window.matchMedia("(min-width: 1101px)").matches;
    // trinh phat YouTube co mat (dang xem hoac chay ngam)
    const mvMounted = mvOpen || mvShadow;
    const panelOpen = panelShown && !panelCollapsed;
    const panelStrip = panelShown && panelCollapsed;
    const mvInPanel = mvOpen && panelOpen;
    // MV dang hien o dau: khung lon / cot phai / an (thu gon hoac chay ngam: van chay, chi khong hien)
    const mvPlace = onStage ? (mvOpen ? "stage" : "off") : mvInPanel ? "panel" : "off";
    const mvPlaceRef = useRef(mvPlace);
    useEffect(() => { mvPlaceRef.current = mvPlace; });
    // dang xem MV that hay chay ngam (mvReady doc; effect nay khai bao TRUOC effect bat / tat MV -> chay truoc no)
    const mvOpenRef = useRef(mvOpen);
    useEffect(() => { mvOpenRef.current = mvOpen; });
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
    // cac doan MV da THAT SU xem (giay cua MV, de cham diem nghe nhu mp3): ghi khi thoi gian tang deu luc dang phat
    const mvWatchRef = useRef({ spans: [], last: null, duration: 0 });
    // MV da "nhan tieng" chua: vua bat MV ma mp3 dang phat -> mp3 VAN PHAT trong luc trinh phat YouTube tai (~1-2s, mang
    // cham lau hon), MV chay cam o dung doan; MV phat that roi moi chuyen dan tieng mp3 -> MV (truoc day dung mp3 ngay -> lang ~1.4s).
    // State cho render (thanh phat, nut dieu khien), ref cho effect / callback
    const [mvLive, setMvLive] = useState(false);
    const mvLiveRef = useRef(false);
    const handoffRef = useRef(null);                // hen gio vong cho chuyen giao
    // tat MV -> lan bat sau phai chuyen giao lai tu dau (chinh state ngay luc render, khong can effect)
    const [prevMvOpen, setPrevMvOpen] = useState(mvOpen);
    if (prevMvOpen !== mvOpen) {
        setPrevMvOpen(mvOpen);
        if (!mvOpen && mvLive) {
            setMvLive(false);
            // thanh phat ve lai mp3 ngay o giay MV dang toi (mp3 con dung o cho luc chuyen giao -> khong lui 1 nhip)
            const songDur = duration || 0;
            setCurrentTime(Math.min(mvToSong(mvTime, { offset: data.song.mv_offset, songDur, mvDur: mvDuration }), Math.max(0, songDur - 1)));
        }
    }
    const mvActive = mvOpen && mvLive;
    // am luong moi nhat cho vong chuyen giao (chay ngoai render)
    const volRef = useRef({ volume, muted });
    useEffect(() => { volRef.current = { volume, muted }; });
    // trinh phat dang dieu khien: MV khi MV da nhan tieng, nguoc lai the <audio>
    const mv = () => (mvActive ? mvRef.current : null);

    // am luong MV theo thanh am luong (0..100), co tinh "duck" khi tro ly dang noi; chua nhan tieng thi giu cam
    const syncMvVolume = (value, isMuted) => {
        const player = mvRef.current;
        if (!player) return;
        if (!mvLiveRef.current) { player.mute(); return; }
        player.setVolume(Math.round(value * (duckRef?.current ? 0.2 : 1) * 100));
        if (isMuted) player.mute(); else player.unMute();
    }

    // MV nhan tieng: tu day thanh phat / nut dieu khien MV, mp3 dung
    const goLive = () => {
        mvLiveRef.current = true;
        mvWatchRef.current.last = null;
        // lay giay MV ngay luc nhan tieng (khong cho lan hoi 250ms toi) -> thanh phat khong nhay ve 0:00 1 nhip
        const player = mvRef.current;
        try {
            if (player?.getCurrentTime) {
                setMvTime(player.getCurrentTime());
                setMvDuration(player.getDuration());
                setMvPlaying(player.getPlayerState() === YT_PLAYING);
            }
        } catch { /* chua san sang */ }
        setMvLive(true);
    }

    // chuyen dan tieng mp3 -> MV trong FADE_MS (khop doan nen nghe nhu 1 bai lien mach), xong thi dung mp3
    const crossfade = (player) => {
        const audio = audioRef.current;
        const began = performance.now();
        const { muted: isMuted } = volRef.current;
        if (!isMuted) { player.setVolume(0); player.unMute(); }
        const step = () => {
            const { volume: v } = volRef.current;
            const level = v * (duckRef?.current ? 0.2 : 1);
            // tat MV giua chung -> tra am luong mp3, mp3 phat tiep
            if (mvRef.current !== player) { audio.volume = level; return; }
            const k = isMuted ? 1 : Math.min(1, (performance.now() - began) / FADE_MS);
            player.setVolume(Math.round(level * k * 100));
            audio.volume = level * (1 - k);
            if (k < 1) { handoffRef.current = setTimeout(step, 16); return; }
            audio.pause();
            audio.volume = level;
            goLive();
            syncMvVolume(v, isMuted);
        };
        step();
    }

    // cho MV phat that o dung doan mp3 dang toi roi moi chuyen giao (mp3 van phat trong luc cho -> khong lang)
    const handoff = (player) => {
        let retries = 0;
        const step = () => {
            const audio = audioRef.current;
            if (mvRef.current !== player || !audio) return;
            // nguoi dung dung nhac / mp3 het trong luc cho -> MV dung o doan do, nhan luon (khong can chuyen tieng)
            if (audio.paused) {
                player.pauseVideo();
                goLive();
                syncMvVolume(volRef.current.volume, volRef.current.muted);
                return;
            }
            if (player.getPlayerState() === YT_PLAYING) {
                const want = songToMv(audio.currentTime, mvSync(audio.duration, player.getDuration()));
                // lech > 0.3s (tai lau hon du doan) -> tua lai 1-2 lan, van cam; roi chuyen giao
                if (Math.abs(player.getCurrentTime() - want) > MAX_HANDOFF_DRIFT && retries < 2) {
                    retries++;
                    player.seekTo(want + HANDOFF_LEAD, true);
                } else { crossfade(player); return; }
            }
            handoffRef.current = setTimeout(step, 50);
        };
        step();
    }

    const openMv = () => {
        setMvDismissed(false);
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
        setMvDismissed(true);
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

    // doi giua mp3 va MV, nhac NOI TIEP DUNG DOAN: MV co canh mo dau / ket -> dung do lech da do (songs.mv_offset,
    // `npm run align-mv`); bai chua do thi quy theo ti le thoi luong (utils/mvTime.js)
    const mvOffset = data.song.mv_offset;
    const mvSync = (songDur, mvDur) => ({ offset: mvOffset, songDur, mvDur });

    // bat MV -> mp3 phat tiep cho toi khi MV san sang (handoff), MV chay tu doan nhac dang toi;
    // tat MV (bam nut / loi / mo /lyrics) -> mp3 phat tiep tu doan MV dang toi (MV dang dung thi mp3 cung dung).
    // Tat khi MV chua nhan tieng -> mp3 van dang phat, khong dong vao
    const mvWasOpen = useRef(false);
    const mvReadyRef = useRef(null);    // mvReady moi nhat (effect goi khi MV chay ngam da san sang)
    useEffect(() => {
        const audio = audioRef.current;
        if (mvOpen && !mvWasOpen.current) {
            if (audio) mvResumeRef.current = { fromAudio: true, playing: mvStartRef.current || !audio.paused, mp3Playing: !audio.paused };
            mvStartRef.current = false;
            // MV dang chay ngam (tu /now-playing ra trang khac, hoac bam nut MV) -> da tai san, chuyen giao ngay
            if (mvRef.current) mvReadyRef.current(mvRef.current);
        } else if (!mvOpen && mvWasOpen.current) {
            clearTimeout(handoffRef.current);
            if (mvLiveRef.current) {
                const { time, playing } = mvResumeRef.current;
                if (audio && time !== undefined) audio.currentTime = Math.min(mvToSong(time, { offset: mvOffset, songDur: audio.duration, mvDur: mvWatchRef.current.duration }), Math.max(0, (audio.duration || 0) - 1));
                if (audio && playing && !loadError) audio.play().catch(() => { });
            } else if (audio && audio.paused && !loadError && mvResumeRef.current.fromAudio && mvResumeRef.current.playing) {
                // MV chua kip tai xong (chua nhan tieng) ma da tat / ve /now-playing -> mp3 phat (nguoi dung dang muon nghe)
                audio.play().catch(() => { });
            }
            mvLiveRef.current = false;
            // ve /now-playing: MV khong bi go ra, chi cam lai va chay ngam theo mp3
            try { mvRef.current?.mute(); } catch { /* chua san sang */ }
        }
        mvWasOpen.current = mvOpen;
    }, [mvOpen, loadError, mvOffset]);
    // trinh phat YouTube bi go ra (mo /lyrics, MV loi, man hep...) -> quen trinh phat cu
    useEffect(() => {
        if (mvMounted) return;
        clearTimeout(handoffRef.current);
        mvRef.current = null;
    }, [mvMounted]);
    useEffect(() => () => clearTimeout(handoffRef.current), []);

    // MV chay ngam: cam, phat / dung theo mp3, lech > 0.5s thi tua lai cho khop (de luc ra trang khac chuyen tieng ngay)
    useEffect(() => {
        if (!mvShadow) return;
        const timer = setInterval(() => {
            const player = mvRef.current;
            const audio = audioRef.current;
            if (!player?.getPlayerState || !audio) return;
            try {
                player.mute();
                const state = player.getPlayerState();
                const playing = state === YT_PLAYING || state === YT_BUFFERING;
                const mvDur = player.getDuration();
                const t = audio.currentTime + (Number(mvOffset) || 0);
                // doan mp3 nam ngoai MV (MV ngan hon / do lech am) -> MV dung
                const inside = mvOffset === null || mvOffset === undefined || (t >= 0 && (!mvDur || t < mvDur));
                if (audio.paused || !inside) { if (playing) player.pauseVideo(); return; }
                const want = songToMv(audio.currentTime, mvSync(audio.duration, mvDur));
                if (Math.abs(player.getCurrentTime() - want) > SHADOW_MAX_DRIFT) player.seekTo(want + HANDOFF_LEAD, true);
                if (!playing) player.playVideo();
            } catch { /* trinh phat chua san sang */ }
        }, 500);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mvShadow, mvOffset]);

    // dang xem MV: hoi trinh phat YouTube 4 lan/giay -> thanh thoi gian, nut Play, so giay da xem
    useEffect(() => {
        if (!mvMounted) return;
        const timer = setInterval(() => {
            const player = mvRef.current;
            if (!player?.getCurrentTime) return;
            const t = player.getCurrentTime();
            const d = player.getDuration();
            const playing = player.getPlayerState() === YT_PLAYING;
            const watch = mvWatchRef.current;
            // trang thai luon cap nhat (MV chay ngam ra trang khac -> hien video ngay, khong lo thumbnail 1 nhip)
            setMvState(player.getPlayerState());
            // MV chua nhan tieng (dang chay cam cho chuyen giao / chay ngam): chua tinh la dang xem
            if (!mvLiveRef.current) return;
            // chi ghi khi phat lien mach (tua toi / lui thi khong tinh); noi tiep doan truoc thi keo dai doan do
            if (playing && watch.last !== null && t > watch.last && t - watch.last < 1.5) {
                const prev = watch.spans[watch.spans.length - 1];
                if (prev && prev[1] === watch.last) prev[1] = t;
                else watch.spans.push([watch.last, t]);
            }
            watch.last = t;
            if (d) watch.duration = d;
            setMvTime(t);
            setMvDuration(d);
            setMvPlaying(playing);
            // phu de chu kenh dat mac dinh chi tai SAU khi video bat dau phat -> tat lai 1 lan luc do
            if (playing && !captionsOffRef.current) {
                captionsOffRef.current = true;
                try { player.unloadModule("captions"); } catch { /* khong co phu de */ }
            }
            // het video (trang thai 0) khong luu "dang dung" -> lan sau mo lai van phat
            if (player.getPlayerState() !== YT_ENDED) mvResumeRef.current = { time: t, playing };
        }, 250);
        return () => clearInterval(timer);
    }, [mvMounted]);

    // lop noi chua MV bam theo o video dang hien MOI KHUNG HINH (doi trang, cuon, doi co man hinh van khop).
    // Ghi thang vao style (khong render lai React) -> trinh phat YouTube khong bi go ra / tao lai
    useEffect(() => {
        if (!mvMounted) return;
        const narrow = window.matchMedia("(max-width: 1100px)");
        let frameId;
        // ca trang dang thu nho bang zoom (index.css --ui-zoom, laptop): getBoundingClientRect tra toa do DA thu nho,
        // con px dat vao style lai bi thu nho them lan nua -> chia cho zoom. Chi doc lai khi doi be rong cua so
        let zoom = 1, zoomForWidth = -1;
        const follow = () => {
            frameId = requestAnimationFrame(follow);
            const el = mvFloatRef.current;
            if (!el) return;
            const place = mvPlaceRef.current;
            const target = place === "stage" ? stageMvRef.current : place === "panel" ? panelMvRef.current : null;
            el.dataset.place = target ? place : "off";
            if (!target) return;
            if (zoomForWidth !== window.innerWidth) {
                zoomForWidth = window.innerWidth;
                zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
            }
            const r = target.getBoundingClientRect();
            el.style.transform = `translate(${r.left / zoom}px, ${r.top / zoom}px)`;
            el.style.width = `${r.width / zoom}px`;
            el.style.height = `${r.height / zoom}px`;
            // man hep: cot phai la ngan keo noi tren header -> MV cung phai noi len tren
            el.style.zIndex = place === "panel" && narrow.matches ? "18" : "14";
        };
        follow();
        return () => cancelAnimationFrame(frameId);
    }, [mvMounted]);

    // MV phai DUNG: seekTo luc trinh phat chua chay (state -1) lam YouTube tu phat, pauseVideo ngay sau do bi bo qua
    // -> giu cam, gap trang thai dang phat / dang tai thi dung lai, toi khi that su dung (toi da ~5s) moi tra tieng
    const holdPaused = (player) => {
        let tries = 0;
        player.mute();
        const step = () => {
            if (mvRef.current !== player) return;
            const state = player.getPlayerState();
            if (state === YT_PAUSED || ++tries > 100) {
                syncMvVolume(volRef.current.volume, volRef.current.muted);
                return;
            }
            if (state === YT_PLAYING || state === YT_BUFFERING) player.pauseVideo();
            handoffRef.current = setTimeout(step, 50);
        };
        step();
    }

    // trinh phat YouTube san sang (1 lan moi lan bat MV) -> bat dau dung doan nhac mp3 dang toi.
    // Cung duoc goi lai khi MV dang chay ngam chuyen sang xem that (trinh phat da co san)
    const mvReady = (player) => {
        const already = mvRef.current === player;
        mvRef.current = player;
        mvWatchRef.current.last = null;     // vua tua: khong tinh doan nhay vao so giay da xem
        if (!already) {
            captionsOffRef.current = false;
            // tat phu de ma video bat san (cc_load_policy khong chan duoc phu de chu kenh dat mac dinh)
            try { player.unloadModule("captions"); } catch { /* trinh phat khong co phu de */ }
        }
        // chay ngam (o /now-playing): cam, dung doan mp3; vong chay ngam lo phat / dung / khop tiep
        if (!mvOpenRef.current) {
            const audio = audioRef.current;
            mvLiveRef.current = false;
            player.mute();
            if (audio) player.seekTo(songToMv(audio.currentTime + HANDOFF_LEAD, mvSync(audio.duration, player.getDuration())), true);
            if (audio && !audio.paused) player.playVideo(); else holdPaused(player);
            return;
        }
        const { time, fromAudio, mp3Playing } = mvResumeRef.current;
        const audio = audioRef.current;
        // luc bat MV mp3 dang phat ma gio da dung (nguoi dung bam Pause trong luc MV tai / mp3 het) -> MV cung dung
        const playing = fromAudio && mp3Playing && audio ? !audio.paused : mvResumeRef.current.playing;
        // mp3 dang phat -> MV chay cam, tua toi cho mp3 SE toi khi MV tai xong (HANDOFF_LEAD), roi handoff chuyen tieng
        const viaHandoff = fromAudio && playing && audio && !audio.paused;
        const start = fromAudio && audio
            ? songToMv(audio.currentTime + (viaHandoff ? HANDOFF_LEAD : 0), mvSync(audio.duration, player.getDuration()))
            : time;
        if (!viaHandoff) goLive();
        else mvLiveRef.current = false;
        syncMvVolume(volume, muted);
        // MV chay ngam da khop mp3 -> khong tua (tua lam YouTube tai lai doan do), handoff chuyen tieng luon
        const nearby = already && Math.abs(player.getCurrentTime() - start) < SHADOW_MAX_DRIFT + HANDOFF_LEAD;
        if (start > 1 && !nearby) player.seekTo(start, true);
        if (playing) player.playVideo(); else holdPaused(player);
        if (viaHandoff) handoff(player);
    }
    useEffect(() => { mvReadyRef.current = mvReady; });

    // MV loi -> bai nay quay ve mp3 (van giu "muon xem MV" cho bai sau)
    const mvError = (code) => {
        setMvFailed(true);
        setMvNote(code === 101 || code === 150 || code === 100
            ? "This MV can't be played outside YouTube. Playing the song instead."
            : "Can't load the MV (no internet?). Playing the song instead.");
    }

    // ti le da nghe (0..1): GOP cac doan mp3 / nhac dem / MV tren cung truc tien do bai
    // (truoc day lay max(mp3, MV) -> nghe nua dau mp3 + nua sau MV chi duoc 50%)
    const listenedFraction = () => {
        const audio = audioRef.current;
        const watch = mvWatchRef.current;
        let spans = [...playedBeforeRef.current, ...spansFromPlayed(audio.played, audio.duration)];
        for (const [a, b] of watch.spans) spans = addMvSpan(spans, a, b, mvSync(audio.duration, watch.duration));
        const fraction = coveredFraction(spans);
        console.log("Da nghe duoc :", Math.round(fraction * 100), "% bai (mp3 + MV)")
        return fraction;
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
        // bam Play khi MV dang bi giu dung (holdPaused) -> thoi giu, tra tieng
        if (player) { clearTimeout(handoffRef.current); syncMvVolume(volume, muted); player.playVideo(); }
        else if (!loadError) audioRef.current.play().catch(() => { });
    }

    const togglePlay = () => (isPaused() ? playMedia() : pauseMedia());

    // keo thanh thoi gian de tua bai (thanh theo giay mp3 -> dang xem MV thi doi sang giay MV)
    const handleSeek = (e) => {
        const seconds = Number(e.target.value);
        const player = mv();
        if (player) {
            const mvSeconds = songToMv(seconds, mvSync(audioRef.current.duration, player.getDuration()));
            player.seekTo(mvSeconds, true);
            setMvTime(mvSeconds);
        }
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
    const mvPlayer = mvMounted && (
        <MvPlayer videoId={youtubeId} title={`${data.song.title} — ${artist} (MV)`}
            onReady={mvReady}
            onStateChange={(state) => { if (state === YT_ENDED && mvLiveRef.current) handleEnded(); }}
            onError={mvError} />
    );

    // thanh phat LUON theo truc thoi gian cua BAI (mp3): dang xem MV thi quy giay MV ve giay mp3 (mv_offset, chua do thi
    // theo ti le) -> doi trang mp3 <-> MV thanh tien do + so giay khong nhay (MV dai hon vi canh mo dau / ket)
    const songSync = mvSync(duration, mvDuration);
    const shownTime = mvActive ? mvToSong(mvTime, songSync) : currentTime;
    const shownDuration = duration;
    // con bao lau thi HET that (MV co the con canh ket sau khi nhac het) -> the "Up next"
    const remainingReal = mvActive ? mvDuration - mvTime : duration - currentTime;
    const shownPlaying = mvActive ? mvPlaying : isPlaying;
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
                // tua (vd tat MV -> mp3 nhay toi giay MV dang toi): cap nhat ngay, khong cho timeupdate ke tiep
                onSeeking={(e) => setCurrentTime(e.target.currentTime)}
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
                        remaining={remainingReal}
                        duration={mvActive ? mvDuration : duration}
                        nextSong={nextSong}
                        onPlayNow={finishAndSend}
                    />
                )}
                {playlist && queueOpen && onStage && (
                    <QueuePanel playlist={playlist} onJump={onJump} onClose={() => setQueueOpen(false)} />
                )}
            </section>

            {/* trang khac: khung lon bi an (display: none) -> hang doi noi ngoai khung, khong thi bam "View playlist" khong thay gi */}
            {playlist && queueOpen && !onStage && (
                <QueuePanel playlist={playlist} onJump={onJump} onClose={() => setQueueOpen(false)} floating />
            )}

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

            {/* trang khac /now-playing -> cot phai "Now playing" kieu Spotify (ve vao o trong cua MainLayout):
                dang xem MV thi MV o day, khong thi anh MV / anh bia + nut xem MV */}
            {panelOpen && createPortal(
                <NowPlayingPanel
                    song={data.song}
                    artist={artist}
                    coverSrc={coverSrc}
                    context={playlist ? playlist.name : mvOpen ? "Music video" : "Now playing"}
                    lyrics={lyrics}
                    // giay cua BAI de to loi: dang xem MV -> quy giay MV ve giay mp3 (mv_offset, chua do thi theo ti le)
                    time={shownTime}
                    videoRef={panelMvRef}
                    // dang xem MV: thumbnail MV (lo ra khi video dung); chua xem: anh bia vuong (thumbnail YouTube co san vien den)
                    poster={mvOpen ? mvPoster : coverSrc || (youtubeId ? mvPoster : null)}
                    mvOn={mvOpen}
                    onPlayMv={youtubeId && !mvFailed ? openMv : null}
                    onCollapse={() => onPanelCollapse(true)}
                    onClose={closeMv}
                    onOpenLyrics={() => navigate("/lyrics")}
                />,
                panelSlot
            )}
            {/* lop noi chua 1 trinh phat MV duy nhat, tu bam theo o video dang hien (khung lon / cot phai) hoac an di.
                Khong bam duoc (pointer-events: none). Dung / chua chay -> an trinh phat, lo anh thumbnail ben duoi */}
            {mvMounted && createPortal(
                <div ref={mvFloatRef} className={`mv-float ${mvHidden ? "is-paused" : ""}`} data-place="off" aria-hidden="true">
                    {mvPlayer}
                </div>,
                panelSlot?.parentElement || document.body
            )}
            {/* cot phai thu gon: chi con dai mong + nut mo lai (kieu Spotify) */}
            {panelStrip && createPortal(<NowPlayingStrip mvOn={mvOpen} onExpand={() => onPanelCollapse(false)} />, panelSlot)}

            {/* thanh phat nhac co dinh duoi cung man hinh */}
            <footer className="player-bar">
                <div className="bar-song">
                    {/* bam anh / ten bai -> mo khung phat lon */}
                    <div className="bar-track">
                        <button className="bar-open" onClick={() => navigate('/now-playing')} aria-label="Open now playing" title="Open now playing">
                            <Cover className="bar-cover" src={coverSrc} />
                        </button>
                        <div className="bar-text">
                            <button className="bar-open bar-title" onClick={() => navigate('/now-playing')} title="Open now playing">
                                {data.song.title}
                            </button>
                            {data.song.artist_id
                                ? <Link className="bar-artist bar-artist-link" to={`/artist/${data.song.artist_id}`} title={`View ${artist}`}>
                                    {artist}
                                </Link>
                                : <span className="bar-artist">{artist}</span>}
                        </div>
                    </div>
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
