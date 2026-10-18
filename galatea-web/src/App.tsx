import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './store'
import { AppShell } from './components/AppShell'
import { Splash } from './components/Splash'
import { Inicio } from './views/Inicio'
import { Menu } from './views/Menu'
import { ProductoDetalle } from './views/ProductoDetalle'
import { Reservar } from './views/Reservar'
import { Pedido } from './views/Pedido'
import { Juego } from './views/Juego'
import { JuegoExperiencia } from './views/JuegoExperiencia'
import { JuegosDeMesa } from './views/JuegosDeMesa'
import { Bienvenida } from './views/Bienvenida'
import { Eventos } from './views/Eventos'
import { EventoDetalle } from './views/EventoDetalle'
import { Promociones } from './views/Promociones'
import { Recomendaciones } from './views/Recomendaciones'
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
            <Route path="menu/:id" element={<ProductoDetalle />} />
            <Route path="reservar" element={<Reservar />} />
            <Route path="pedido" element={<Pedido />} />
            <Route path="juego" element={<Juego />} />
            <Route path="juego/experiencia" element={<JuegoExperiencia />} />
            <Route path="juego/mesa" element={<JuegosDeMesa />} />
            <Route path="bienvenida" element={<Bienvenida />} />
            <Route path="eventos" element={<Eventos />} />
            <Route path="eventos/:fecha" element={<EventoDetalle />} />
            <Route path="promociones" element={<Promociones />} />
            <Route path="recomendaciones" element={<Recomendaciones />} />
            <Route path="staff" element={<Staff />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {splash && <Splash onDone={cerrarSplash} />}
    </AppProvider>
  )
}
