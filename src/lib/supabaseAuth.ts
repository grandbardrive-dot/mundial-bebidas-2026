import { createClient } from '@supabase/supabase-js'

// Cliente SEPARADO para el panel de proveedores (login real con Supabase Auth).
// Usa su propio storageKey, así la sesión del proveedor NO se mezcla con el
// cliente anónimo principal (supabase.ts). Cuando un proveedor inicia sesión,
// este cliente queda como rol `authenticated`; el resto de la app sigue anon.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY para el cliente de proveedores.',
  )
}

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'gb-proveedor-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
