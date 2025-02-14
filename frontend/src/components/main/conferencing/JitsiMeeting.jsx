import React, { useEffect, useRef, useState } from "react";
import LoadingSpinner from "../../layout/LoadingSpinner";

const JitsiMeeting = ({ roomName, displayName }) => {
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement("script");
        script.src = "https://spherify-meet.mooo.com/external_api.js";
        script.async = true;
        script.onload = () => {
          if (jitsiContainer.current) initializeJitsi();
        };
        document.body.appendChild(script);
      } else {
        if (jitsiContainer.current) initializeJitsi();
      }
    };

    const initializeJitsi = () => {
      if (!jitsiContainer.current) {
        console.error("Jitsi container is not yet available.");
        return;
      }

      if (jitsiApi.current) {
        jitsiApi.current.dispose();
      }

      const domain = "spherify-meet.mooo.com";
      const options = {
        roomName,
        width: "100%",
        height: 650,
        parentNode: jitsiContainer.current,
        userInfo: { displayName },
      };

      jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);

      jitsiApi.current.addEventListener("videoConferenceJoined", () => {
        setLoading(false);
      });

      jitsiApi.current.addEventListener("videoConferenceLeft", () => {
        setLoading(true);
      });
    };

    loadJitsi();

    return () => {
      if (jitsiApi.current) {
        jitsiApi.current.dispose();
      }
    };
  }, [roomName, displayName]);

  return (
    <>
      <div ref={jitsiContainer} style={{ width: "100%", height: "650px" }} />
    </>
  );
};

export default JitsiMeeting;
