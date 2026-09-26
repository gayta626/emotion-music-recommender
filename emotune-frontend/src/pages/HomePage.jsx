import { useState } from 'react';
import EmotionScanner from '../components/EmotionScanner';
import MusicPlayer from '../components/MusicPlayer';
const HomePage = () => {
    const [started, setStarted] = useState(false);
    const [suggestResult, setSuggestResult] = useState(null);
    const [notice, setNotice] = useState("")

    const handleResult = (data) => {
        if (data.error || !data.song) {
            setNotice(data.message || "Chưa nhận diện được, thử lại nhé");
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
        return <button onClick={() => setStarted(true)}>▶ Bắt đầu</button>
    }

    return (
        <div>
            {/* dang phat nhac thi go Scanner -> cleanup tat camera + dung quet */}
            {!suggestResult && <EmotionScanner onResult={handleResult} />}
            {!suggestResult && notice && <p>{notice}</p>}
            {suggestResult && (
                <div>
                    <span>{suggestResult.song.title}</span>
                    <span>{suggestResult.message}</span>
                    {suggestResult.isEncourage && <span>💛 Bài này để động viên bạn</span>}
                </div>
            )}
            {suggestResult && <MusicPlayer data={suggestResult} onFinish={playNextSong} />}
        </div>
    )
}

export default HomePage
