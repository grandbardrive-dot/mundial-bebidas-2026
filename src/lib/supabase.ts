import { createClient } from '@supabase/supabase-js'

// Las credenciales se leen de variables de entorno (Vite expone solo las
// que empiezan con VITE_). NUNCA hardcodear claves en el repo.
// Local:   .env.local   |   Producción: variables de entorno en Netlify.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completá las claves de tu proyecto Supabase.',
  )
}

// Cliente principal: SIEMPRE anónimo (admin y clientes operan con la anon key,
// sin sesión de usuario). Desactivamos la persistencia de sesión para que este
// cliente nunca quede "logueado" (la sesión del proveedor vive en otro cliente,
// supabaseAuth, con su propio storageKey). Así un login de proveedor no rompe
// los flujos anon del álbum/admin.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
