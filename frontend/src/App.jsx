import { Routes, Route } from "react-router-dom";
import Login from "./components/account/Login";
import Register from "./components/account/Register";
import Home from "./components/Home";
import NotFound404 from "./components/NotFound404";
import Header from "./components/layout/Header";
import FeaturesPage from "./components/FeaturesPage";
import AboutPage from "./components/AboutPage";
import { isAuthenticated } from "./utils/helper";
import Main from "./components/Main";
import "./App.css";
import "./Main.css";
import { Navigate } from "react-router";

function App() {
  const LandingRoutes = () => {
    return (
      <>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </>
    );
  };

  const MainRoutes = () => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" />;
    }

    return (
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    );
  };

  return (
    <>
      <Routes>
        <Route path="/*" element={<LandingRoutes />} />
        <Route path="/main/*" element={<MainRoutes />} />
      </Routes>
    </>
  );
}

export default App;
