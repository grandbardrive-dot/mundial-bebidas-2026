// Identificación simple del cliente por dispositivo (sin contraseñas).
// Guardamos el id del cliente en localStorage para reconocerlo en este equipo.

const KEY = 'gb_cliente_id'

export function getClienteId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setClienteId(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* storage no disponible (modo privado, etc.) */
  }
}

export function clearClienteId(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
