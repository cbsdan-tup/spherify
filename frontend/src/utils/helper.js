import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loginUser, logoutUser } from "../redux/authSlice";

// export const authenticate = (data, next) => {
//   const dispatch = useDispatch();
//   dispatch(loginUser(data));
//   //   if (window !== "undefined") {
//   //     sessionStorage.setItem("token", JSON.stringify(data.token));
//   //     sessionStorage.setItem("user", JSON.stringify(data.user));
//   //     console.log(data.user);
//   //   }
//   next();
// };

export const authenticate = (data, dispatch, next) => {
  dispatch(loginUser(data));
  next();
};

export const isAuthenticated = (state) => {
  return state?.isAuthenticated;
};

export const getToken = (state) => {
  return state?.token;
};
// export const isAuthenticated = () => {
//   if (typeof window !== "undefined") {
//     const token = sessionStorage.getItem("token");
//     const user = sessionStorage.getItem("user");
//     if (token && user) {
//       return true;
//     }
//   }
//   return false;
// };

// export const getToken = () => {
//   if (window !== "undefined") {
//     if (sessionStorage.getItem("token")) {
//       return JSON.parse(sessionStorage.getItem("token"));
//     } else {
//       return false;
//     }
//   }
// };

// ✅ Get user from Redux store
export const getUser = (state) => {
  console.log(state);
  return state?.user;
};

// ✅ Logout function using Redux (No `sessionStorage`)
export const logout = (dispatch, next) => {
  dispatch(logoutUser());
  next(); // Call callback function after logout if provided
};

// export const getUser = () => {
//   if (window !== "undefined") {
//     if (sessionStorage.getItem("user")) {
//       return JSON.parse(sessionStorage.getItem("user"));
//     } else {
//       return false;
//     }
//   }
// };

export const isAdmin = () => {
  if (typeof window !== "undefined") {
    const user = sessionStorage.getItem("user");
    if (user) {
      const userObj = JSON.parse(user);
      return userObj.role === "admin";
    }
  }
  return false;
};

// export const logout = (next) => {
//   if (window !== "undefined") {
//     sessionStorage.removeItem("token");
//     sessionStorage.removeItem("user");
//   }
//   const dispatch = useDispatch();

//   dispatch(logoutUser());
//   next();
// };

export const errMsg = (message = "") =>
  toast.error(message, {
    position: "bottom-right",
  });

export const succesMsg = (message = "") =>
  toast.success(message, {
    position: "bottom-right",
  });

export const formatDate = (dateStr) => {
  const dateObj = new Date(dateStr);

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  const formattedDate = dateObj.toLocaleString("en-US", options);
  const [datePart, timePart] = formattedDate.split(", ");
  return `${datePart.replace(/\//g, "-")} ${timePart}`;
};

export const handleAvatarChange = (event) => {
  return new Promise((resolve, reject) => {
    const file = event.target.files[0];

    if (!file) {
      reject("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result); // Return the Base64 URL
    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
};