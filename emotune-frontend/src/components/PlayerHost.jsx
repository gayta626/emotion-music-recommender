import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import MusicPlayer from './MusicPlayer';
import { usePlayback } from '../contexts/playbackContext';
import { setLed } from '../hardware';
import { useIdle } from '../hooks/useIdle';

// Bo phat nhac luon song (MainLayout ve no o moi trang) -> doi trang nhac khong tat.
// Thanh phat duoi luon hien khi co bai; khung phat lon chi hien o /now-playing.
// 2 che do:
// - "emotion": bai do AI chon theo cam xuc. Het bai: dang o /scan hoac nguoi dung RANH (>= 60s khong dung chuot)
//   -> sang /scan quet lai; dang LUOT -> khong bat camera, chon bai theo cam xuc quet gan nhat.
// - "playlist": phat lan luot 1 hang doi (playlist / bai cua 1 ca si), khong cham diem; het -> ve "emotion".
const IDLE_MS = 60000;

const PlayerHost = () => {
    const [suggestResult, setSuggestResult] = useState(null);
    const [mode, setMode] = useState("emotion");
    const [queue, setQueue] = useState(null);       // { name, songs, playlistId }
    const [index, setIndex] = useState(0);          // bai dang phat trong hang doi
    // tang moi lan doi bai -> MusicPlayer duoc tao moi (2 bai lien tiep khong dung chung trang thai)
    const [playKey, setPlayKey] = useState(0);
    const { registerPlayer, setNowPlaying, lastMood } = usePlayback();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isIdle = useIdle(IDLE_MS);
    // MusicPlayer dang phat dat ham nhan lenh dieu khien vao day (tro ly giong noi: dung, bai tiep, to/nho...)
    const controlRef = useRef(null);
    // dang duck (tro ly dang noi) -> giu o day de bai moi (MusicPlayer tao lai moi bai) van duck
    const duckRef = useRef(false);

    const play = (result) => {
        setSuggestResult(result);
        setPlayKey((k) => k + 1);
    }

    const playFromQueue = (q, i) => {
        const song = q.songs[i];
        setIndex(i);
        play({ song, emotion: song.emotion, message: null });
    }

    const startQueue = (q, start) => {
        if (!q.songs.length) return;
        setMode("playlist");
        setQueue(q);
        playFromQueue(q, Math.min(Math.max(start || 0, 0), q.songs.length - 1));
    }

    // nhan lenh tu cac trang (quet xong, playlist, ca si, o tim kiem)
    const handleCommand = (cmd) => {
        if (cmd.kind === "scan" || cmd.kind === "song") {
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

    // den OLED (Pi): dang phat -> cam xuc; khong phat -> tat (ScanPage tu bao "scanning")
    useEffect(() => {
        setLed(suggestResult ? suggestResult.emotion : 'off');
    }, [suggestResult])

    // bao cho trang playlist biet bai nao dang phat (to sang dong do)
    const playingPlaylistId = mode === "playlist" ? queue?.playlistId : null;
    const playingSongId = suggestResult?.song?.id;
    useEffect(() => {
        setNowPlaying(playingSongId ? { songId: playingSongId, playlistId: playingPlaylistId ?? null } : null);
    }, [playingSongId, playingPlaylistId, setNowPlaying])

    // het bai / bam Next
    const playNextSong = () => {
        if (mode === "playlist" && queue && index + 1 < queue.songs.length) {
            playFromQueue(queue, index + 1);
            return;
        }
        setMode("emotion");
        setQueue(null);

        const goScan = () => {
            setSuggestResult(null);
            navigate("/scan");
        }
        // dang o man quet / nguoi dung dang nghe thu dong / chua tung quet -> quet lai
        if (pathname === "/scan" || isIdle() || !lastMood) {
            goScan();
            return;
        }
        // dang luot web: khong bat camera, chon bai theo cam xuc quet gan nhat
        api.post('/suggest', { emotion: lastMood.emotion, auto: true })
            .then((res) => play(res.data))
            .catch(goScan);
    }

    // xin bai (menu ☰ -> Request a song): phat ngay bai do o che do cam xuc
    const playRequested = (result) => {
        setMode("emotion");
        setQueue(null);
        play(result);
    }

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
                playlist={inQueue ? { name: queue.name, songs: queue.songs, index } : null}
                onJump={jumpTo}
                onRequest={playRequested}
                showLyrics={onLyrics}
                controlRef={controlRef}
                duckRef={duckRef}
            />
        </div>
    )
}

export default PlayerHost
