import React, { useEffect, useRef } from "react";

const JitsiMeeting = ({ roomName, displayName }) => {
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null); // Store Jitsi API instance

  useEffect(() => {
    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement("script");
        script.src = "https://spherify-meet.mooo.com/external_api.js";
        script.async = true;
        script.onload = initializeJitsi;
        document.body.appendChild(script);
      } else {
        initializeJitsi();
      }
    };

    const initializeJitsi = () => {
      if (jitsiApi.current) {
        jitsiApi.current.dispose(); // Remove the previous Jitsi instance before creating a new one
      }

      const domain = "spherify-meet.mooo.com";
      const options = {
        roomName,
        width: "100%",
        height: 620,
        parentNode: jitsiContainer.current,
        userInfo: { displayName },
      };

      jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);
    };

    loadJitsi();

    return () => {
      if (jitsiApi.current) {
        jitsiApi.current.dispose(); 
      }
    };
  }, [roomName, displayName]);

  return <div ref={jitsiContainer} />;
};

export default JitsiMeeting;
