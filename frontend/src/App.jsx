import { Routes, Route } from "react-router-dom"
import Login from "./components/account/Login"
import Register from "./components/account/Register"
import Home from "./components/Home"
import NotFound404 from "./components/NotFound404"
import Header from "./components/layout/Header"

function App() {

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </>
  )
}

export default App
