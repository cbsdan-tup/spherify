import { Routes, Route } from "react-router-dom";
import Login from "./components/account/Login";
import Register from "./components/account/Register";
import Home from "./components/Home";
import NotFound404 from "./components/NotFound404";
import Header from "./components/layout/Header";
import FeaturesPage from "./components/FeaturesPage";
import AboutPage from "./components/AboutPage";
import { isAuthenticated, getToken, getUser, errMsg } from "./utils/helper";
import Main from "./components/Main";
import "./Variables.css";
// import "./MainHeader.css";
import "./App.css";
import "./Main.css";
import "./TextChats.css";
import "./Conferencing.css";
import { Navigate } from "react-router";
import { useEffect } from "react";

import { useSelector, useDispatch } from "react-redux";

import {refreshFirebaseToken} from "./config/firebase-config";
import { updateToken } from "./redux/authSlice";

function App() {
  const authState = useSelector((state) => state.auth);

  let dispatch = useDispatch();
  useEffect(() => {
    const refreshToken = async () => {
      try {
        console.log("Current token:", authState.token);
        const token = await refreshFirebaseToken();
        if (token) {
          dispatch(updateToken(token)); 
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
        errMsg("Error refreshing token", error);
      }
    };

    const interval = setInterval(async () => {
      refreshToken();
    }, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]); 

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
    if (!isAuthenticated(authState)) {
      console.log("not login", authState)
      return <Navigate to="/login" />;
    }

    return (
      <Routes>
        <Route path="/*" element={<Main />} />
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
