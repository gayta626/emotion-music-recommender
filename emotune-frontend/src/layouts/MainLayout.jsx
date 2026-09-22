import { Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import Footer from '../components/Footer';

const MainLayout = () => {
    return (
        <>
            <Header />
            <SideBar />
            <Outlet />
            <Footer />
        </>
    )
}

export default MainLayout;