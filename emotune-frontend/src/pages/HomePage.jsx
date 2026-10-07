import { useEffect, useState } from 'react';
import EmotionScanner from '../components/EmotionScanner';
import MusicPlayer from '../components/MusicPlayer';
import { setLed, useHardwareButtons } from '../hardware';
import './HomePage.scss';

const HomePage = () => {
    const [started, setStarted] = useState(false);
    const [suggestResult, setSuggestResult] = useState(null);
    const [notice, setNotice] = useState("")

    // den LED: chua bat dau -> tat; dang quet -> trang nhap nhay (camera dang bat); dang phat -> mau cam xuc
    useEffect(() => {
        if (!started) setLed('off')
        else if (!suggestResult) setLed('scanning')
        else setLed(suggestResult.emotion)
    }, [started, suggestResult])

    // nut 1 tren mach thay cho nut Bat dau (dang phat thi MusicPlayer tu xu ly nut)
    useHardwareButtons({ onNext: () => setStarted(true) })

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

    // go bai cu -> MusicPlayer bien mat, EmotionScanner hien lai va quet bai moi
    const playNextSong = () => {
        console.log("Lay bai hat moi")
        setSuggestResult(null)
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

    return (
        <div className="home-page">
            {/* dang phat nhac thi go Scanner -> cleanup tat camera + dung quet */}
            {!suggestResult && <EmotionScanner onResult={handleResult} notice={notice} />}
            {suggestResult && <MusicPlayer data={suggestResult} onFinish={playNextSong} />}
        </div>
    )
}

export default HomePage
