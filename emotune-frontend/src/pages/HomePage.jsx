import { useState } from 'react';
import EmotionScanner from '../components/EmotionScanner';
const HomePage = () => {
    const [suggestResult, setSuggestResult] = useState(null);

    const handleResult = (data) => {
        console.log("Dữ liệu nhận được:", data);
        setSuggestResult(data)
    }
    return (
        <div>
            <EmotionScanner onResult={handleResult} />
            {suggestResult && (
                <div>
                    <span>{suggestResult.song.title}</span>
                    <span>{suggestResult.message}</span>
                    <span>{suggestResult.isEncourage}</span>
                </div>
            )}
        </div>
    )
}

export default HomePage