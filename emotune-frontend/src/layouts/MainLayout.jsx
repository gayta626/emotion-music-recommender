import { Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import PlaybackProvider from '../contexts/PlaybackProvider';
import './MainLayout.scss'

const MainLayout = () => {
    return (
        // PlaybackProvider: SideBar (chon playlist) va HomePage (phat) dung chung trang thai phat nhac
        <PlaybackProvider>
            <div className="app-shell">
                <Header />
                <SideBar />
                <main className="app-main">
                    <Outlet />
                </main>
            </div>
        </PlaybackProvider>
    )
}

export default MainLayout;
