import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './console/App.tsx'
import { applyServerParam } from './source/source.ts'

applyServerParam() // hidden ?server=<url> picks a real server (?server=builtin goes back)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
