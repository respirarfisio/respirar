// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import Layout      from './components/Layout'
import Pacientes   from './pages/Pacientes'
import Paciente    from './pages/Paciente'
import Avaliacao   from './pages/Avaliacao'
import Relatorio   from './pages/Relatorio'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/respirar">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Pacientes />} />
          <Route path="paciente/novo"                          element={<Paciente />} />
          <Route path="paciente/:pid"                          element={<Paciente />} />
          <Route path="paciente/:pid/avaliacao/nova"           element={<Avaliacao />} />
          <Route path="paciente/:pid/avaliacao/:aid"           element={<Avaliacao />} />
          <Route path="paciente/:pid/avaliacao/:aid/relatorio" element={<Relatorio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
