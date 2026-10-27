import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { ExperienceBoundary } from './components/ExperienceBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExperienceBoundary><BrowserRouter><App /></BrowserRouter></ExperienceBoundary>
  </React.StrictMode>
)
