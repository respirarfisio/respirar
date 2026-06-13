// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import AuthGuard  from './components/AuthGuard'
import Layout     from './components/Layout'
import Pacientes  from './pages/Pacientes'
import Paciente   from './pages/Paciente'
import Avaliacao  from './pages/Avaliacao'
import Relatorio  from './pages/Relatorio'
import Admin      from './pages/Admin'
import Dashboard  from './pages/Dashboard'
import Agenda     from './pages/Agenda'
import Termo      from './pages/Termo'
import Prescricao from './pages/Prescricao'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/respirar">
      <AuthGuard>
        {({ user, role, logout }) => (
          <Routes>
            <Route path="/" element={<Layout user={user} role={role} logout={logout} />}>
              <Route index                                          element={<Pacientes />} />
              <Route path="dashboard"                              element={<Dashboard />} />
              <Route path="agenda"                                 element={<Agenda />} />
              <Route path="paciente/novo"                          element={<Paciente />} />
              <Route path="paciente/:pid"                          element={<Paciente />} />
              <Route path="paciente/:pid/termo"                    element={<Termo />} />
              <Route path="paciente/:pid/prescricao"               element={<Prescricao />} />
              <Route path="paciente/:pid/avaliacao/nova"           element={<Avaliacao />} />
              <Route path="paciente/:pid/avaliacao/:aid"           element={<Avaliacao />} />
              <Route path="paciente/:pid/avaliacao/:aid/relatorio" element={<Relatorio />} />

              <Route path="admin" element={
                (role === 'admin' || role === 'superadmin')
                  ? <Admin role={role} />
                  : <Navigate to="/" replace />
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </AuthGuard>
    </BrowserRouter>
  </React.StrictMode>,
)
