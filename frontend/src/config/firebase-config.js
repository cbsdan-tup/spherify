import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";

import { getToken as getHelperToken } from "../utils/helper";
import { errMsg, getUser } from "../utils/helper";
import axios from "axios";

const firebaseConfig = {
  apiKey: "AIzaSyC0k4vq9q1haAKlYHyfEEMKrOFZ_xh6K5Y",
  authDomain: "spherify-d19a5.firebaseapp.com",
  projectId: "spherify-d19a5",
  storageBucket: "spherify-d19a5.firebasestorage.app",
  messagingSenderId: "1067425363363",
  appId: "1:1067425363363:web:7171214f84476885371616"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
export const auth = getAuth();

export const refreshFirebaseToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    try {
      const newToken = await user.getIdToken(true);
      console.log("New Token:", newToken);
      return newToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  } else {
    console.log("No user signed in.");
  }
};

export const generateToken = async (user, authToken) => {
  const permission = await Notification.requestPermission();
  console.log(permission);

  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey:
        "BC-dERAfUj5DTLIg4RCiazTIEm1JQ1QqvY1qGHkpnzSDZLUIxCVxX0yEcZkHQbUjkrQprjypW-OLj7bpO-LD_0Q",
    });

    if (user && token) {
      console.log(token);
      try {
        const config = {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                "Content-Type": "application/json",
            }
        }

        const data = await axios.put(
          `${import.meta.env.VITE_API}/updateUser/${user._id}`,
          {
            permissionToken: token,
          },
          config
        );
        console.log(data);
        console.log("Successfully stored the permission token!");
      } catch (error) {
        errMsg("Error inserting the permission token!");
        console.log(error);
      }
    }
  } else {
    if (user) {
      try {
        const data = await axios.put(
          `${import.meta.env.VITE_API}/remove-permission-token/${user._id}`, {
            "Authorization": `Bearer ${getHelperToken()}`
          }
        );
        console.log(data);
        console.log("Successfully removed the permission token!");
      } catch (error) {
        errMsg("Error removing the permission token!");
        console.log(error);
      }
    }
  }
};
export default app;
