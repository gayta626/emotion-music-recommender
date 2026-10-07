import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import PlaybackProvider from '../contexts/PlaybackProvider';
import { useAuth } from '../contexts/authContext';
import HomePage from '../pages/HomePage';
import './MainLayout.scss'

const MainLayout = () => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    // người mới (chưa làm khảo sát gu) -> làm khảo sát trước để gợi ý đúng gu ngay từ bài đầu
    if (user && !user.surveyDone) return <Navigate to="/survey" replace />;

    const onHome = pathname === '/';

    return (
        // PlaybackProvider: SideBar / trang playlist (chọn) và HomePage (phát) dùng chung trạng thái phát nhạc
        <PlaybackProvider>
            <div className="app-shell">
                <Header />
                <SideBar />
                <main className="app-main">
                    {/* HomePage luôn được giữ (không gỡ) -> sang trang khác nhạc vẫn chạy, chỉ còn thanh phát dưới */}
                    <HomePage visible={onHome} />
                    {!onHome && <Outlet />}
                </main>
            </div>
        </PlaybackProvider>
    )
}

export default MainLayout;
