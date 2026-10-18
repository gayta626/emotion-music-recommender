import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import PlayerHost from '../components/PlayerHost';
import PageAmbient from '../components/PageAmbient';
import PlaybackProvider from '../contexts/PlaybackProvider';
import VoiceAssistant from '../components/VoiceAssistant';
import { useAIAssistant } from '../contexts/aiAssistantStore';
import { useAuth } from '../contexts/authContext';
import { PanelSlotContext } from '../contexts/panelSlotContext';
import usePageTransition from '../hooks/usePageTransition';
import './MainLayout.scss'

const MainLayout = () => {
    const { user } = useAuth();
    const { isOpen: assistantOpen, closeAssistant } = useAIAssistant();
    // the DOM cua cot phai "Now playing" (co sau lan ve dau) -> MusicPlayer ve vao bang portal
    const [panelSlot, setPanelSlot] = useState(null);
    // layout bị gỡ (chuyển sang /survey hoặc /login) -> đóng trợ lý, kẻo quay lại nó tự mở lại
    useEffect(() => closeAssistant, [closeAssistant]);
    // đổi trang -> nội dung giữa hiện dần (I6)
    const mainRef = useRef(null);
    usePageTransition(mainRef);
    // người mới (chưa làm khảo sát gu) -> làm khảo sát trước để gợi ý đúng gu ngay từ bài đầu
    if (user && !user.surveyDone) return <Navigate to="/survey" replace />;

    return (
        // PlaybackProvider: các trang (chọn nhạc) và PlayerHost (phát) dùng chung trạng thái phát nhạc
        <PlaybackProvider>
            {/* nen bau troi dem sau moi trang, mau theo trang dang mo */}
            <PageAmbient />
            <PanelSlotContext.Provider value={panelSlot}>
                <div className="app-shell">
                    <Header />
                    <SideBar />
                    <main className="app-main" ref={mainRef}>
                        {/* PlayerHost luôn được giữ (không gỡ) -> đổi trang nhạc vẫn chạy; khung phát lớn chỉ hiện ở /now-playing */}
                        <PlayerHost />
                        <Outlet />
                    </main>
                    {/* cột phải "Now playing" kiểu Spotify (MV, lời bài, ca sĩ): trống khi chưa phát / đã đóng */}
                    <div className="right-panel-slot" ref={setPanelSlot} />
                </div>
            </PanelSlotContext.Provider>
            {/* tro ly giong noi: phu toan man hinh, can usePlayback + router nen nam trong PlaybackProvider */}
            {assistantOpen && <VoiceAssistant />}
        </PlaybackProvider>
    )
}

export default MainLayout;
