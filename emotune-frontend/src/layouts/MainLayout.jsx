import { Navigate, Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import PlayerHost from '../components/PlayerHost';
import PlaybackProvider from '../contexts/PlaybackProvider';
import { useAuth } from '../contexts/authContext';
import './MainLayout.scss'

const MainLayout = () => {
    const { user } = useAuth();
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
        </PlaybackProvider>
    )
}

export default MainLayout;
