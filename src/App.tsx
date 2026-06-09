import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { AppHome } from './pages/AppHome'
import { AsignarFiguritas } from './pages/AsignarFiguritas'
import { Admin } from './pages/Admin'
import { ProveedorLogin } from './pages/ProveedorLogin'
import { ProveedorPanel } from './pages/ProveedorPanel'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppHome />} />
        <Route path="/asignar" element={<AsignarFiguritas />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/proveedor/login" element={<ProveedorLogin />} />
        <Route path="/proveedor" element={<ProveedorPanel />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
