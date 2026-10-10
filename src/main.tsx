import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'

// Vercel's analytics scripts live under /_vercel/ only on Vercel; the Cloudflare mirror has no such path.
const onVercel = window.location.hostname.endsWith('.vercel.app')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {onVercel && <Analytics />}
    {onVercel && <SpeedInsights />}
  </StrictMode>,
)
