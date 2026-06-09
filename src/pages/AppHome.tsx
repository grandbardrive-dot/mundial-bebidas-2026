import { useState } from 'react'
import { getClienteId, setClienteId, clearClienteId } from '../lib/cliente'
import { Onboarding } from '../components/Onboarding'
import { Album } from './Album'

/**
 * Ruta /app:
 *  - sin id en localStorage  -> formulario de onboarding
 *  - con id en localStorage   -> vista del álbum (placeholder por ahora)
 */
export function AppHome() {
  const [clienteId, setId] = useState<string | null>(() => getClienteId())

  function completar(id: string) {
    setClienteId(id)
    setId(id)
  }

  function reset() {
    clearClienteId()
    setId(null)
  }

  if (!clienteId) {
    return <Onboarding onComplete={completar} />
  }

  return <Album clienteId={clienteId} onReset={reset} />
}
