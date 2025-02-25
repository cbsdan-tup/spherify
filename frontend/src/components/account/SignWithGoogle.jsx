import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../config/firebase-config";
import { authenticate, succesMsg, errMsg } from "../../utils/helper";
import axios from "axios";
import { useDispatch } from "react-redux";

function SignWithGoogle({ method }) {
  const dispatch = useDispatch();

  function googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider).then(async (result) => {
        console.log(result);
        const user = result.user;

        if (user) {
          const idToken = await user.getIdToken();

          const config = {
            headers: {
              "Content-Type": "application/json",
            },
          };

          const url = `${import.meta.env.VITE_API}/getUserInfo`;

          try {
            const { data: response } = await axios.post(
              url,
              { uid: user.uid },
              config
            );

            if (response.success && response.user) {
              const userInfo = {
                token: idToken,
                user: response.user,
              };
              succesMsg("Login Successfully!");
              {
                response?.user?.isAdmin ? authenticate(userInfo, dispatch, () => {window.location = "/admin"}) : authenticate(userInfo, dispatch, () => {window.location = "/main"});
              }
            } else {
              console.log("No user found, proceeding to registration...");
              // Proceed with registration logic if user is not found
              const config = {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              };
              const formData = new FormData();
              const displayName = user.displayName;
              const nameParts = displayName.split(/\s+/);

              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(" ") || "";

              formData.append("uid", user.uid);
              formData.append("email", user.email);
              formData.append("firstName", firstName);
              formData.append("lastName", lastName);

              try {
                const registerResponse = await axios.post(
                  `${import.meta.env.VITE_API}/register`,
                  formData,
                  config
                );

                succesMsg("User Registered Successfully!");

                const newUser = registerResponse.data.user;
                if (newUser) {
                  const userInfo = {
                    token: idToken,
                    user: newUser,
                  };

                  authenticate(
                    userInfo,
                    dispatch,
                    () => (window.location = "/main")
                  );
                }
              } catch (registerError) {
                console.error("Error during registration:", registerError);
                errMsg("Error registering new user.");
              }
            }
          } catch (getUserError) {
            console.error("Error fetching user info:", getUserError);
            console.log("User not found, creating new user...");

            const config = {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            };
            const formData = new FormData();
            const displayName = user.displayName;
            const nameParts = displayName.split(/\s+/);

            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || "";

            formData.append("uid", user.uid);
            formData.append("email", user.email);
            formData.append("firstName", firstName);
            formData.append("lastName", lastName);

            try {
              const registerResponse = await axios.post(
                `${import.meta.env.VITE_API}/register`,
                formData,
                config
              );

              succesMsg("User Registered Successfully!");

              const newUser = registerResponse.data.user;
              if (newUser) {
                const userInfo = {
                  token: idToken,
                  user: newUser,
                };
                authenticate(userInfo, dispatch, () => (window.location = "/main"));
              }
            } catch (registerError) {
              console.error("Error during registration:", registerError);
              errMsg("Error registering new user.");
            }
          }
        }
      });
    } catch (error) {
      console.log(error);
      errMsg("Error logging in");
    }
  }

  return (
    <div>
      <div
        className="login-google-sign-in"
        onClick={googleLogin}
      >
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/2048px-Google_%22G%22_logo.svg.png" alt="Google" /> {method} with Google
      </div>
    </div>
  );
}
export default SignWithGoogle;
