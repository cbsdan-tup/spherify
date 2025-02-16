import React, { useEffect, useRef, useState } from "react";
import LoadingSpinner from "../../layout/LoadingSpinner";
import Draggable from "react-draggable";

const JitsiMeeting = ({ roomName, displayName }) => {
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isScale, setIsScale] = useState(false);

  const handleScaleClick = () => {
    setIsScale(!isScale);
  };
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
        parentNode: jitsiContainer.current,
        userInfo: { displayName },
      };

      if (!isScale) {
        options.height = 570;
      }

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
      <div
        onClick={handleScaleClick}
        className={`scale-button-container ${isScale ? "scale" : ""}`}
      >
        <i className="fa-solid fa-expand scale-button"></i>
      </div>
      <div
        ref={jitsiContainer}
        style={{ border: "1px solid white" }}
        className={!isScale ? "jitsi-container" : "jitsi-container scale"}
      />
    </>
  );
};

export default JitsiMeeting;
