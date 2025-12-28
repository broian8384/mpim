import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupWebAdapter } from './utils/webAdapter.js'

// Initialize Web Adapter (fills window.api if in browser)
setupWebAdapter();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
