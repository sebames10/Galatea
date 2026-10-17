import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './store'
import { AppShell } from './components/AppShell'
import { Splash } from './components/Splash'
import { Inicio } from './views/Inicio'
import { Menu } from './views/Menu'
import { Reservar } from './views/Reservar'
import { Pedido } from './views/Pedido'
import { Juego } from './views/Juego'
import { Bienvenida } from './views/Bienvenida'
import { Staff } from './views/Staff'

// La animación del logo se muestra una vez por sesión del navegador
const SPLASH_KEY = 'galatea:splash-visto'

export default function App() {
  const [splash, setSplash] = useState(() => sessionStorage.getItem(SPLASH_KEY) !== '1')

  const cerrarSplash = () => {
    sessionStorage.setItem(SPLASH_KEY, '1')
    setSplash(false)
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Inicio />} />
            <Route path="menu" element={<Menu />} />
            <Route path="reservar" element={<Reservar />} />
            <Route path="pedido" element={<Pedido />} />
            <Route path="juego" element={<Juego />} />
            <Route path="bienvenida" element={<Bienvenida />} />
            <Route path="staff" element={<Staff />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {splash && <Splash onDone={cerrarSplash} />}
    </AppProvider>
  )
}
