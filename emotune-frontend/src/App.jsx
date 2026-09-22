import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AIAssistantProvider } from './contexts/AIAssistantContext'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import Setting from './pages/Setting'
import './App.css'

const App = () => {


  return (
    <div>
      <AIAssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path='/' element={<HomePage />} />
              <Route path='/settings' element={<Setting />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AIAssistantProvider>
    </div>
  )
}

export default App
