import { Routes, Route } from "react-router-dom";
import Login from "./components/account/Login";
import Register from "./components/account/Register";
import Home from "./components/Home";
import NotFound404 from "./components/NotFound404";
import Header from "./components/layout/Header";
import FeaturesPage from "./components/FeaturesPage";
import AboutPage from "./components/AboutPage";
import { isAuthenticated, getToken, getUser, errMsg, socket } from "./utils/helper";
import Main from "./components/Main";
import "./Variables.css";
import "./App.css";
import "./Main.css";
import "./FileSharing.css";
import "./TextChats.css";
import "./Conferencing.css";
import { Navigate } from "react-router";
import { useEffect, useState } from "react";

import { useSelector, useDispatch } from "react-redux";
import { refreshFirebaseToken } from "./config/firebase-config";
import { updateToken } from "./redux/authSlice";
import AdminPage from "./components/AdminPage";
import { fetchConfigurations } from "./redux/configurationSlice";
import { setupTokenRefresh } from "./utils/tokenService"; // We'll create this file

function App() {
  const authState = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const favIcon = useSelector((state) => state.configurations.site?.favicon);
  const userId = authState?.user?._id;

  // Set up favicon
  useEffect(() => {
    if (favIcon) {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        document.head.appendChild(newLink);
      }
      link.href = favIcon;
    }
  }, [favIcon]);

  // Initialize the token refresh service once on app start
  useEffect(() => {
    // This function returns a cleanup function
    const cleanup = setupTokenRefresh(dispatch, updateToken);
    return cleanup;
  }, [dispatch]);

  // Fetch configurations once
  useEffect(() => {
    dispatch(fetchConfigurations());
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
      console.log("not login", authState);
      return <Navigate to="/login" />;
    }

    if (authState?.user?.isAdmin) {
      return <Navigate to="/admin" />;
    }

    return (
      <Routes>
        <Route path="/*" element={<Main />} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    );
  };

  const AdminRoutes = () => {
    if (!isAuthenticated(authState)) {
      console.log("not login", authState);
      return <Navigate to="/login" />;
    }

    if (!authState?.user?.isAdmin) {
      return <Navigate to="/main" />;
    }

    return (
      <Routes>
        <Route path="/*" element={<AdminPage />} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    );
  };

  return (
    <>
      <Routes>
        <Route path="/*" element={<LandingRoutes />} />
        <Route path="/main/*" element={<MainRoutes />} />

        <Route path="/admin/*" element={<AdminRoutes />} />
      </Routes>
    </>
  );
}

export default App;
