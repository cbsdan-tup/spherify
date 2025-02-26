import React, { useEffect, useRef, useState } from "react";
import LoadingSpinner from "../../layout/LoadingSpinner";
import { Rnd } from "react-rnd";
import { useDispatch } from "react-redux";
import { clearCurrentMeetingRoomName } from "../../../redux/teamSlice";

const JitsiMeeting = ({ roomName, displayName, chatName = "General" }) => {
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null);
  const [loading, setLoading] = useState(true);
  const [redirected, setRedirected] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 400, height: 400 });
  const [position, setPosition] = useState({ x: 10, y: 100 });

  const dispatch = useDispatch();

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
        interfaceConfigOverwrite: {
          SHOW_CHROME_EXTENSION_BANNER: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          SHOW_ROOM_NAME: false,
          HIDE_INVITE_MORE_HEADER: true,
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "closedcaptions", "desktop",
            "hangup", "raisehand", "tileview", "select-background", "recording", "security", "mute-everyone"
          ],
        },
        width: "100%",
        height: "100%",
      };

      jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);

      jitsiApi.current.addEventListener("videoConferenceJoined", () => {
        setLoading(false);
      });

      jitsiApi.current.addEventListener("videoConferenceLeft", () => {
        setLoading(true);
        setRedirected(true);
      });
    };

    loadJitsi();

    return () => {
      if (jitsiApi.current) {
        jitsiApi.current.dispose();
      }
    };
  }, [roomName, displayName]);

  // 🔥 Toggle full-screen mode
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      // Save previous position & size before going full-screen
      setWindowSize({ width: 400, height: 400 });
      setPosition({ x: 0, y: 0 });
    } else {
      // Restore previous size and position
      setWindowSize({ width: 400, height: 400 });
      setPosition({ x: 10, y: 10 });
    }
    setIsFullScreen(!isFullScreen);
  };

  const handleCloseConference = () => {
    dispatch(clearCurrentMeetingRoomName());
  };

  if (redirected) {
    handleCloseConference();
    return null;
  }
  return (
    <>
      {loading && <LoadingSpinner message="Loading..."/>}
      <Rnd
        size={
          isFullScreen
            ? { width: window.innerWidth, height: window.innerHeight }
            : undefined
        } // Apply size only in full screen
        position={isFullScreen ? { x: 0, y: 0 } : position}
        default={{ x: 10, y: 10, width: 400, height: 400 }}
        minWidth={350}
        minHeight={270}
        bounds="window"
        dragHandleClassName="drag-handle"
        onResizeStop={(e, direction, ref, delta, position) => {
          setWindowSize({ width: ref.offsetWidth, height: ref.offsetHeight });
          setPosition(position);
        }}
        onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
        className={`jitsi-wrapper ${isFullScreen ? "fullscreen" : ""}`}
      >
        <div className={`drag-handle ${isFullScreen && "opacity-1"}`}>
          <div className="left">
            <i class="fa-solid fa-video"></i> {chatName}
          </div>
          {!isFullScreen && (
            <div className="center">
              {" "}
              <i className="fa-solid fa-arrows-alt"></i>
            </div>
          )}

          <div className="right">
            <i
              className={`fa-solid ${
                isFullScreen ? "fa-compress" : "fa-expand"
              }`}
              onClick={toggleFullScreen}
            ></i>
            <i
              className="fa-solid fa-circle-xmark exit"
              onClick={handleCloseConference}
            ></i>
          </div>
        </div>

        {/* Jitsi Container */}
        <div
          ref={jitsiContainer}
          className="jitsi-container"
          style={{
            width: "100%",
            height: "calc(100% - 50px)",
            border: "1px solid white",
          }}
        />
      </Rnd>
    </>
  );
};

export default JitsiMeeting;
