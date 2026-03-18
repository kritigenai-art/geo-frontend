import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// In production (Amplify), all relative API calls must go to the FastAPI backend.
// Set VITE_BACKEND_URL in Amplify environment variables to your backend's URL.
if (import.meta.env.VITE_BACKEND_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
