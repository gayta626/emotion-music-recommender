import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import PlayerHost from '../components/PlayerHost';
import PlaybackProvider from '../contexts/PlaybackProvider';
import VoiceAssistant from '../components/VoiceAssistant';
import { useAIAssistant } from '../contexts/aiAssistantStore';
import { useAuth } from '../contexts/authContext';
import './MainLayout.scss'

const MainLayout = () => {
    const { user } = useAuth();
    const { isOpen: assistantOpen, closeAssistant } = useAIAssistant();
    // layout bị gỡ (chuyển sang /survey hoặc /login) -> đóng trợ lý, kẻo quay lại nó tự mở lại
    useEffect(() => closeAssistant, [closeAssistant]);
    // người mới (chưa làm khảo sát gu) -> làm khảo sát trước để gợi ý đúng gu ngay từ bài đầu
    if (user && !user.surveyDone) return <Navigate to="/survey" replace />;

    return (
        // PlaybackProvider: các trang (chọn nhạc) và PlayerHost (phát) dùng chung trạng thái phát nhạc
        <PlaybackProvider>
            <div className="app-shell">
                <Header />
                <SideBar />
                <main className="app-main">
                    {/* PlayerHost luôn được giữ (không gỡ) -> đổi trang nhạc vẫn chạy; khung phát lớn chỉ hiện ở /now-playing */}
                    <PlayerHost />
                    <Outlet />
                </main>
            </div>
            {/* tro ly giong noi: phu toan man hinh, can usePlayback + router nen nam trong PlaybackProvider */}
            {assistantOpen && <VoiceAssistant />}
        </PlaybackProvider>
    )
}

export default MainLayout;
