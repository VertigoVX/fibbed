import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import '@fontsource/zilla-slab/latin-700.css'
import '@fontsource/spectral/latin-400.css'
import '@fontsource/spectral/latin-500.css'
import '@fontsource/libre-franklin/latin-500.css'
import '../styles/tokens.css'
import '../styles/app.css'
import '../styles/desk.css'
import { Moderate } from './Moderate'
import { supabaseEditorApi } from './editorApi'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const root = createRoot(document.getElementById('root')!)

if (!url || !key) {
  root.render(
    <main className="page paper">
      <h1>Supabase is not configured</h1>
      <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>
    </main>,
  )
} else {
  const api = supabaseEditorApi(createClient(url, key, { auth: { storageKey: 'fibbed-editor' } }))
  root.render(
    <StrictMode>
      <Moderate api={api} />
    </StrictMode>,
  )
}
