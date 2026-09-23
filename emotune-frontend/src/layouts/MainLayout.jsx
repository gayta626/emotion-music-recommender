import { Outlet } from 'react-router-dom'
import Header from '../components/Header';
import SideBar from '../components/SideBar';
import Footer from '../components/Footer';
import { useState } from 'react';

const MainLayout = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleSideBar = () => {
        setIsOpen(!isOpen)
    }
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