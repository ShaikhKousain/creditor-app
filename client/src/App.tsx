import { Routes, Route } from "react-router"
import { CustomerList } from "@/pages/CustomerList"
import { CustomerDetail } from "@/pages/CustomerDetail"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { useAuth } from "@/AuthContext"

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  )
}

export default App