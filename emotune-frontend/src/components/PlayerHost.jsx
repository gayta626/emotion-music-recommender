import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import MusicPlayer from './MusicPlayer';
import { usePlayback } from '../contexts/playbackContext';
import { useIdle } from '../hooks/useIdle';
import { useAuth } from '../contexts/authContext';
import { journeyName } from '../utils/journey';
import { loadRescan } from '../utils/playPrefs';

// Bo phat nhac luon song (MainLayout ve no o moi trang) -> doi trang nhac khong tat.
// Thanh phat duoi luon hien khi co bai; khung phat lon chi hien o /now-playing.
// 2 che do:
// - "emotion": bai do AI chon theo cam xuc. Het bai: dang o /scan hoac nguoi dung RANH (>= 60s khong dung chuot)
//   -> sang /scan quet lai; dang LUOT -> khong bat camera, chon bai theo cam xuc quet gan nhat.
//   Tat "Scan again after a song" o Settings (utils/playPrefs) -> khong tu quet lai, luon tu chon bai ke.
// - "playlist": phat lan luot 1 hang doi (playlist / bai cua 1 ca si), khong cham diem; het -> ve "emotion".
// Prev / Shuffle / Repeat (I1): xem playPrev, toggleShuffle, cycleRepeat ben duoi.
const IDLE_MS = 60000;
const HISTORY_MAX = 20;
const REPEAT_ORDER = ["off", "all", "one"];

// tron ngau nhien (Fisher–Yates) -> moi thu tu deu co xac suat nhu nhau (sort(() => Math.random() - 0.5) bi lech)
const shuffled = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const PlayerHost = () => {
    const [suggestResult, setSuggestResult] = useState(null);
    const [mode, setMode] = useState("emotion");
    const [queue, setQueue] = useState(null);       // { name, songs, playlistId }
    const [index, setIndex] = useState(0);          // bai dang phat trong hang doi
    // tang moi lan doi bai -> MusicPlayer duoc tao moi (2 bai lien tiep khong dung chung trang thai)
    const [playKey, setPlayKey] = useState(0);
    // che do karaoke (H15) + cham diem ("Score me"): MAC DINH TAT, chi bat khi nguoi dung bam;
    // sang bai moi thi tat lai (play() ben duoi) -> bai sau khong tu bo giong ca si
    const [karaoke, setKaraoke] = useState(false);
    const [scoreOn, setScoreOn] = useState(false);
    // che do xem MV o trang phat nhac (H16): chi bat khi bam nut MV; bat roi thi bai ke (tu chuyen) co MV cung chieu MV,
    // nhu Spotify; tu chon bai moi -> tat (trang phat nhac mo bang song am)
    const [mvWanted, setMvWanted] = useState(false);
    // cot phai "Now playing" o trang khac /now-playing (MV / anh bai, loi bai, ca si): thu gon thanh dai mong hay mo rong
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    // Shuffle (chi tac dung voi hang doi) + Repeat: off -> all (lap hang doi) -> one (lap 1 bai); giu khi sang bai
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState("off");
    // cac bai da phat truoc o che do cam xuc (moi nhat cuoi) -> nut Prev quay lai; playlist thi lui index
    const [history, setHistory] = useState([]);
    const { registerPlayer, setNowPlaying, lastMood } = usePlayback();
    const { user } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isIdle = useIdle(IDLE_MS);
    // MusicPlayer dang phat dat ham nhan lenh dieu khien vao day (tro ly giong noi: dung, bai tiep, to/nho...)
    const controlRef = useRef(null);
    // dang duck (tro ly dang noi) -> giu o day de bai moi (MusicPlayer tao lai moi bai) van duck
    const duckRef = useRef(false);
    // am luong + tat tieng nguoi dung da chinh: MusicPlayer duoc tao lai moi bai -> giu o day, bai sau dung lai
    // (truoc day sang bai la ve 100%: "nho tieng roi bai ke" bi mat tac dung)
    const [savedVolume, setSavedVolume] = useState({ volume: 1, muted: false });

    // fromHistory: dang quay lai bai cu (Prev) -> khong ghi bai dang phat vao lich su nua
    const play = (result, fromHistory = false) => {
        // mode o day la che do CUA BAI DANG PHAT (state chua doi) -> chi nho bai cam xuc
        if (!fromHistory && suggestResult && mode === "emotion") {
            setHistory((h) => [...h, suggestResult].slice(-HISTORY_MAX));
        }
        setSuggestResult(result);
        setPlayKey((k) => k + 1);
        setKaraoke(false);
        setScoreOn(false);
    }

    const playFromQueue = (q, i) => {
        const song = q.songs[i];
        setIndex(i);
        // hanh trinh cam xuc: bai dau kem loi dan cua NYX ("bat dau bang bai hop tam trang, roi vui dan len")
        // + thong tin lan quet (C15: nut "Not right?" sua cam xuc, loi cam on sau khi sua)
        play({ song, emotion: song.emotion, message: q.journey && i === 0 ? q.message : null, ...(q.journey && i === 0 ? q.scan : {}) });
    }

    const startQueue = (q, start) => {
        if (!q.songs.length) return;
        const first = Math.min(Math.max(start || 0, 0), q.songs.length - 1);
        setMode("playlist");
        // dang bat Shuffle: bai duoc chon phat truoc, cac bai con lai tron ngau nhien (original de tat Shuffle thi ve thu tu cu).
        // Hanh trinh cam xuc khong tron: thu tu buon -> vui chinh la y nghia cua no
        if (shuffle && !q.journey) {
            const picked = q.songs[first];
            const rest = q.songs.filter((_, i) => i !== first);
            const mixed = { ...q, songs: [picked, ...shuffled(rest)], original: q.songs };
            setQueue(mixed);
            playFromQueue(mixed, 0);
            return;
        }
        const plain = { ...q, original: q.songs };
        setQueue(plain);
        playFromQueue(plain, first);
    }

    // nhan lenh tu cac trang (quet xong, playlist, ca si, o tim kiem)
    const handleCommand = (cmd) => {
        // nguoi dung TU CHON bai (trang chu, trang ca si, playlist, o tim kiem, tro ly) -> trang phat nhac luon mo bang
        // song am, MV chi la lua chon (nut MV). Cot phai o trang khac van tu chieu MV (panelMv trong MusicPlayer)
        if (cmd.kind === "song" || cmd.kind === "queue" || cmd.kind === "playlist") setMvWanted(false);
        // I4: buon/gian keo dai -> backend tra ve hanh trinh ~5 bai (buon -> trung tinh -> vui): phat nhu 1 hang doi
        // nhung VAN cham diem nghe (bai do AI chon theo cam xuc, khac playlist)
        const journey = cmd.kind === "scan" ? cmd.result.journey : null;
        if (journey?.songs?.length) {
            startQueue({
                name: journeyName(journey),
                songs: journey.songs,
                playlistId: null,
                journey: { from: journey.from, to: journey.to },
                message: cmd.result.message,
                scan: {
                    scanId: cmd.result.scanId,
                    detectedEmotion: cmd.result.detectedEmotion,
                    aiEmotion: cmd.result.aiEmotion,
                    corrected: cmd.result.corrected,
                    faceSaved: cmd.result.faceSaved,
                    via: cmd.result.via,
                },
            }, 0);
        } else if (cmd.kind === "scan" || cmd.kind === "song") {
            setMode("emotion");
            setQueue(null);
            play(cmd.kind === "scan" ? cmd.result : { song: cmd.song, emotion: cmd.song.emotion, message: null });
        } else if (cmd.kind === "queue") {
            startQueue({ playlistId: null, ...cmd.queue }, cmd.start);
        } else if (cmd.kind === "playlist") {
            api.get(`/playlists/${cmd.playlistId}`)
                .then((res) => startQueue({ name: res.data.name, songs: res.data.songs, playlistId: res.data.id }, cmd.start))
                .catch((err) => console.error("Loi tai playlist:", err));
        } else if (cmd.kind === "control") {
            if (cmd.command === "duck") duckRef.current = true;
            else if (cmd.command === "unduck") duckRef.current = false;
            controlRef.current?.(cmd.command);
        }
    }

    // dang ky 1 lan; ham that nam trong ref de luon dung state moi nhat
    const handlerRef = useRef(handleCommand);
    useEffect(() => { handlerRef.current = handleCommand; });
    useEffect(() => registerPlayer((cmd) => handlerRef.current(cmd)), [registerPlayer]);

    // bao cho trang playlist biet bai nao dang phat (to sang dong do); dang chay hanh trinh -> bao ca buoc may / tong
    // (loi chao trang chu I3: "NYX is easing you ... (2/5)")
    const playingPlaylistId = mode === "playlist" ? queue?.playlistId : null;
    const playingSongId = suggestResult?.song?.id;
    const journeyMeta = mode === "playlist" ? queue?.journey : null;
    const journeyTotal = journeyMeta ? queue.songs.length : 0;
    // I6: dang phat hay tam dung (MusicPlayer bao len) -> icon song nhay o cac trang dung yen khi tam dung
    const [audioPlaying, setAudioPlaying] = useState(false);
    useEffect(() => {
        setNowPlaying(playingSongId ? {
            songId: playingSongId,
            playlistId: playingPlaylistId ?? null,
            journey: journeyMeta ? { ...journeyMeta, step: index + 1, total: journeyTotal } : null,
            playing: audioPlaying,
        } : null);
    }, [playingSongId, playingPlaylistId, journeyMeta, index, journeyTotal, audioPlaying, setNowPlaying])

    // het bai / bam Next
    const playNextSong = () => {
        if (mode === "playlist" && queue && index + 1 < queue.songs.length) {
            playFromQueue(queue, index + 1);
            return;
        }
        // Repeat all: het hang doi -> quay lai bai dau, khong chuyen sang che do cam xuc.
        // Hanh trinh da toi "vui" thi khong quay lai bai buon dau tien
        if (mode === "playlist" && queue && repeat === "all" && !queue.journey) {
            playFromQueue(queue, 0);
            return;
        }
        setMode("emotion");
        setQueue(null);

        const goScan = () => {
            setSuggestResult(null);
            navigate("/scan");
        }
        // Settings "Scan again after a song" (doc luc het bai -> doi o Settings la co tac dung ngay)
        const rescan = loadRescan(user?.username);
        // dang o man quet / nguoi dung dang nghe thu dong / chua tung quet -> quet lai (tru khi da tat o Settings)
        if (pathname === "/scan" || (rescan && (isIdle() || !lastMood))) {
            goScan();
            return;
        }
        // tat quet lai ma chua quet lan nao -> bai hop gu nhat (Made for you), bo bai vua phat
        if (!lastMood) {
            const recent = new Set([suggestResult?.song?.id, ...history.slice(-3).map((h) => h.song?.id)]);
            api.get('/songs/for-you')
                .then((res) => {
                    const song = res.data.find((s) => !recent.has(s.id));
                    if (song) play({ song, emotion: song.emotion, message: null });
                    else setSuggestResult(null);
                })
                .catch(() => setSuggestResult(null));
            return;
        }
        // dang luot web (hoac da tat quet lai): khong bat camera, chon bai theo cam xuc quet gan nhat
        api.post('/suggest', { emotion: lastMood.emotion, auto: true })
            .then((res) => play(res.data))
            .catch(() => (rescan ? goScan() : setSuggestResult(null)));
    }

    // xin bai (menu ☰ -> Request a song): phat ngay bai do o che do cam xuc
    const playRequested = (result) => {
        setMode("emotion");
        setQueue(null);
        play(result);
    }

    // Prev: playlist -> bai truoc trong hang doi; che do cam xuc -> bai AI da chon truoc do.
    // Khong co gi de lui -> MusicPlayer tu tua ve dau bai (canPrev = false)
    const canPrev = mode === "playlist" && queue ? index > 0 : history.length > 0;
    const playPrev = () => {
        if (mode === "playlist" && queue) {
            if (index > 0) playFromQueue(queue, index - 1);
            return;
        }
        if (!history.length) return;
        setHistory(history.slice(0, -1));
        play(history[history.length - 1], true);
    }

    // Shuffle: bat -> tron cac bai CHUA phat (bai da phat + bai dang phat giu nguyen de Prev van lui dung);
    // tat -> ve thu tu goc, dung o bai dang phat. Khong dung play() -> bai dang phat khong bi ngat
    const toggleShuffle = () => {
        const next = !shuffle;
        setShuffle(next);
        if (mode !== "playlist" || !queue) return;
        if (next) {
            setQueue({ ...queue, songs: [...queue.songs.slice(0, index + 1), ...shuffled(queue.songs.slice(index + 1))] });
        } else {
            const current = queue.songs[index];
            setQueue({ ...queue, songs: queue.original });
            setIndex(Math.max(0, queue.original.findIndex((s) => s.id === current.id)));
        }
    }

    const cycleRepeat = () => setRepeat((r) => REPEAT_ORDER[(REPEAT_ORDER.indexOf(r) + 1) % REPEAT_ORDER.length]);

    // bam 1 bai trong hang doi -> nhay toi bai do
    const jumpTo = (i) => {
        if (mode === "playlist" && queue?.songs[i]) playFromQueue(queue, i);
    }

    const onNowPlaying = pathname === "/now-playing";
    // man loi bai hat: MusicPlayer phu len toan man hinh, thanh phat van o duoi
    const onLyrics = pathname === "/lyrics";
    // vao thang /now-playing, /lyrics (go URL / F5) khi chua co bai -> ve trang chu
    if ((onNowPlaying || onLyrics) && !suggestResult) return <Navigate to="/" replace />;
    if (!suggestResult) return null;

    const inQueue = mode === "playlist" && queue;

    return (
        <div className={`home-page now-playing ${onNowPlaying ? "" : "is-hidden"}`}>
            <MusicPlayer
                key={playKey}
                data={suggestResult}
                onFinish={playNextSong}
                onPrev={playPrev}
                canPrev={canPrev}
                shuffle={shuffle}
                onShuffle={toggleShuffle}
                repeat={repeat}
                onRepeat={cycleRepeat}
                playlist={inQueue ? { name: queue.name, songs: queue.songs, index, journey: !!queue.journey } : null}
                onJump={jumpTo}
                onRequest={playRequested}
                showLyrics={onLyrics}
                controlRef={controlRef}
                duckRef={duckRef}
                savedVolume={savedVolume}
                onVolumeChange={setSavedVolume}
                karaoke={karaoke}
                onKaraoke={setKaraoke}
                scoreOn={scoreOn}
                onScoreOn={setScoreOn}
                mvWanted={mvWanted}
                onMvWanted={setMvWanted}
                panelCollapsed={panelCollapsed}
                onPanelCollapse={setPanelCollapsed}
                onPlayingChange={setAudioPlaying}
            />
        </div>
    )
}

export default PlayerHost
