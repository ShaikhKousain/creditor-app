import { Navigate, Routes, Route } from "react-router"
import { CustomerList } from "@/pages/CustomerList"
import { CustomerDetail } from "@/pages/CustomerDetail"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { useAuth } from "@/AuthContext"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user === null ? <Navigate to="/login" replace /> : children
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : children
}

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><CustomerList /></ProtectedRoute>} />
      <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
    </Routes>
  )
}

export default App