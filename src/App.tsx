import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { AppHome } from './pages/AppHome'
import { AsignarFiguritas } from './pages/AsignarFiguritas'
import { Admin } from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppHome />} />
        <Route path="/asignar" element={<AsignarFiguritas />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
