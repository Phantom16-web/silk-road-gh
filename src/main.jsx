import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PaystackSandboxPanel from './PaystackSandboxPanel.jsx'

// The isolated Owner test console has no public navigation link.
// Backend endpoints independently enforce Owner authentication and re-authentication.
const isPaystackTestConsole = window.location.pathname.replace(/\/$/, '') === '/owner/paystack-test'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPaystackTestConsole ? <PaystackSandboxPanel /> : <App />}
  </StrictMode>,
)
