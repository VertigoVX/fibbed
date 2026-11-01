import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/zilla-slab/latin-700.css'
import '@fontsource/spectral/latin-400.css'
import '@fontsource/spectral/latin-500.css'
import '@fontsource/spectral/latin-400-italic.css'
import '@fontsource/libre-franklin/latin-500.css'
import './styles/tokens.css'
import './styles/app.css'
import App from './App'
import { clientId, createBackend } from './lib/backend'

createBackend().then((backend) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App backend={backend} clientId={clientId()} />
    </StrictMode>,
  )
})
