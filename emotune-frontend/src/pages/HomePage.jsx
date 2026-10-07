import { useEffect, useRef, useState } from 'react';
import api from '../api';
import EmotionScanner from '../components/EmotionScanner';
import MusicPlayer from '../components/MusicPlayer';
import { usePlayback } from '../contexts/playbackContext';
import { setLed, useHardwareButtons } from '../hardware';
import './HomePage.scss';

// 2 che do phat:
// - "emotion": quet mat (hoac chon cam xuc) -> AI chon 1 bai -> het bai thi quet lai
// - "playlist": phat lan luot playlist, KHONG quet, KHONG cham diem; het playlist -> quay ve "emotion"
const HomePage = () => {
    const [started, setStarted] = useState(false);
    const [suggestResult, setSuggestResult] = useState(null);
    const [notice, setNotice] = useState("")
    const [mode, setMode] = useState("emotion");
    const [playlist, setPlaylist] = useState(null);   // { id, name, songs }
    const [index, setIndex] = useState(0);            // bai dang phat trong playlist
    // tang moi lan doi bai -> MusicPlayer duoc tao moi (2 bai lien tiep cua playlist khong bi dung chung trang thai)
    const [playKey, setPlayKey] = useState(0);
    const { playlistRequest } = usePlayback();

    // den LED: chua bat dau -> tat; dang quet -> trang nhap nhay (camera dang bat); dang phat -> mau cam xuc
    useEffect(() => {
        if (!started) setLed('off')
        else if (!suggestResult) setLed('scanning')
        else setLed(suggestResult.emotion)
    }, [started, suggestResult])

    // nut 1 tren mach thay cho nut Bat dau (dang phat thi MusicPlayer tu xu ly nut)
    useHardwareButtons({ onNext: () => setStarted(true) })

    // dua bai thu i cua playlist vao trinh phat (cung dang du lieu voi ket qua goi y)
    const playFromPlaylist = (pl, i) => {
        const song = pl.songs[i];
        setIndex(i);
        setSuggestResult({ song, emotion: song.emotion, message: null });
        setPlayKey((k) => k + 1);
    }

    // SideBar bam vao 1 playlist -> tai danh sach bai roi phat tu bai 1
    const handledRequestRef = useRef(null);
    useEffect(() => {
        if (!playlistRequest || handledRequestRef.current === playlistRequest.at) return;
        handledRequestRef.current = playlistRequest.at;
        api.get(`/playlists/${playlistRequest.playlistId}`)
            .then((res) => {
                const pl = res.data;
                setStarted(true);
                if (pl.songs.length === 0) {
                    setNotice(`"${pl.name}" is empty. Add songs with the ☰ button while a song is playing.`);
                    return;
                }
                setNotice("");
                setMode("playlist");
                setPlaylist(pl);
                playFromPlaylist(pl, 0);
            })
            .catch((err) => console.error("Loi tai playlist:", err));
    }, [playlistRequest])

    const handleResult = (data) => {
        if (data.error || !data.song) {
            setNotice(data.message || "Couldn't read your face. Try again.");
            return;
        }
        console.log("Dữ liệu nhận được:", data);
        setNotice("");
        // da co bai dang phat thi giu nguyen, bo qua ket qua quet ve tre
        setSuggestResult(prev => prev ?? data)
    }

    // het bai / bam Next
    const playNextSong = () => {
        if (mode === "playlist" && playlist && index + 1 < playlist.songs.length) {
            playFromPlaylist(playlist, index + 1);
            return;
        }
        // het playlist (hoac dang o che do cam xuc) -> go bai cu, EmotionScanner hien lai va quet bai moi
        console.log("Lay bai hat moi")
        setMode("emotion");
        setPlaylist(null);
        setSuggestResult(null)
    }

    // bam 1 bai trong hang doi -> nhay toi bai do
    const jumpTo = (i) => {
        if (mode === "playlist" && playlist?.songs[i]) playFromPlaylist(playlist, i);
    }

    // trinh duyet chan tu phat nhac khi nguoi dung chua bam vao trang -> can 1 lan bam
    if (!started) {
        return (
            <div className="home-page home-intro">
                <div className="intro-eyebrow">MOOD MUSIC BOX</div>
                <h1 className="intro-title">How are you feeling today?</h1>
                <p className="intro-subtitle">
                    NYX reads your expression through the camera and picks a song that fits your mood.
                </p>
                <button className="start-btn" onClick={() => setStarted(true)}>
                    ▶ Start
                </button>
            </div>
        )
    }

    const inPlaylist = mode === "playlist" && playlist;

    return (
        <div className="home-page">
            {/* dang phat nhac thi go Scanner -> cleanup tat camera + dung quet */}
            {!suggestResult && <EmotionScanner onResult={handleResult} notice={notice} />}
            {suggestResult && (
                <MusicPlayer
                    key={playKey}
                    data={suggestResult}
                    onFinish={playNextSong}
                    playlist={inPlaylist ? { name: playlist.name, songs: playlist.songs, index } : null}
                    onJump={jumpTo}
                />
            )}
        </div>
    )
}

export default HomePage
