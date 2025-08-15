import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './dashboard'
import Layout from './layout'
import { Spinner } from './components/spinner'

function App(): JSX.Element {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<Spinner />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App