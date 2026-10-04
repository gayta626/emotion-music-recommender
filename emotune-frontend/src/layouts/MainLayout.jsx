import { Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import './MainLayout.scss'

const MainLayout = () => {
    return (
        <div className="app-shell">
            <Header />
            <SideBar />
            <main className="app-main">
                <Outlet />
            </main>
        </div>
    )
}

export default MainLayout;
