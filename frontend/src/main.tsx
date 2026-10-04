import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${themeColor})`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
