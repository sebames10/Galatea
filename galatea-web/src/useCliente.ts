import { useCallback, useEffect, useState } from 'react'
import { clientes, type Cliente } from './api'

// Celular uruguayo 09X XXX XXX (8 o 9 dígitos sin el +598); la API lo vuelve a validar
export const telefonoValido = (t: string) => /^0?9\d{7}$/.test(t.replace(/\D/g, ''))

/** Perfil del cliente de este dispositivo (se crea anónimo la primera vez) y su registro con nombre y teléfono. */
export function useCliente() {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    clientes
      .yo()
      .then((c) => vigente && setCliente(c))
      .catch(() => {}) // sin conexión: se ve como no registrado y el registro muestra el error
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  const registrar = useCallback(async (nombre: string, telefono: string) => {
    const c = await clientes.registrar(nombre, telefono)
    setCliente(c)
    return c
  }, [])

  return { cliente, cargando, registrar }
}
