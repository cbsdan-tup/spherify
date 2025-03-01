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
import "./FileSharing.css";
import "./TextChats.css";
import "./Conferencing.css";
import { Navigate } from "react-router";
import { useEffect } from "react";

import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import { refreshFirebaseToken } from "./config/firebase-config";
import { updateToken } from "./redux/authSlice";
import AdminPage from "./components/AdminPage";
import { fetchConfigurations } from "./redux/configurationSlice";

function App() {
  const authState = useSelector((state) => state.auth);

  let dispatch = useDispatch();

  const favIcon = useSelector((state) => state.configurations.site?.favicon);

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

  const refreshToken = useCallback(async () => {
    try {
      console.log("Refreshing token...");
      const token = await refreshFirebaseToken();
      if (token) {
        dispatch(updateToken(token));
        console.log("token:", token);
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }, [dispatch]);

  useEffect(() => {
    refreshToken();

    const interval = setInterval(refreshToken, 55 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  useEffect(() => {
    dispatch(fetchConfigurations());
  }, []);

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
