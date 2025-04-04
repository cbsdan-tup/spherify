import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { useDispatch, useSelector } from "react-redux";
import { clearCurrentMeetingRoomName } from "../../../redux/teamSlice";
import { setMeetingStatus } from '../../../utils/tokenService';

const JitsiMeeting = ({ roomName, displayName, chatName = "General" }) => {
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null);
  const [loading, setLoading] = useState(true);
  const [redirected, setRedirected] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 400, height: 400 });
  const [position, setPosition] = useState({ x: 10, y: 100 });

  const dispatch = useDispatch();

  const conferencingUrl = useSelector(
    (state) => state.configurations.conferencing?.url
  );

  useEffect(() => {
    console.log("Url: ", conferencingUrl);
    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement("script");
        script.src = `https://${
          conferencingUrl ? conferencingUrl : "meet.jit.si"
        }/external_api.js`;
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

      const domain = `${conferencingUrl ? conferencingUrl : "meet.jit.si"}`;

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
            "microphone",
            "camera",
            "closedcaptions",
            "desktop",
            "hangup",
            "raisehand",
            "tileview",
            "select-background",
            "recording",
            "security",
            "mute-everyone",
          ],
        },
        width: "100%",
        height: "100%",
      };

      window.JitsiMeetExternalAPI ? setLoading(false) : setLoading(true);

      jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);

      jitsiApi.current.addEventListener("videoConferenceJoined", () => {
        setLoading(false);
      });

      jitsiApi.current.addEventListener("videoConferenceLeft", () => {
        setLoading(false);
        setRedirected(true);
      });
    };

    // Set meeting as active when component mounts
    setMeetingStatus(true);
    
    loadJitsi();

    return () => {
      // Set meeting as inactive when component unmounts
      setMeetingStatus(false);
      if (jitsiApi.current) {
        jitsiApi.current.dispose();
      }
    };
  }, [roomName, displayName]);

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      setWindowSize({ width: 400, height: 400 });
      setPosition({ x: 0, y: 0 });
    } else {
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
      <Rnd
        size={
          isFullScreen
            ? { width: window.innerWidth, height: window.innerHeight }
            : undefined
        } 
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
            <i className="fa-solid fa-video"></i> {chatName}
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

        <div
          ref={jitsiContainer}
          className="jitsi-container"
          style={{
            width: "100%",
            height: "calc(100% - 50px)",
            border: "1px solid white",
          }}
        />
        {loading && (
          <div
            className="d-flex align-items-center justify-content-center py-3 bg-warning"
            style={{ gap: 4 }}
          >
            <div className="loader text-center"></div>
            <span>Loading Meet</span>
          </div>
        )}
      </Rnd>
    </>
  );
};

export default JitsiMeeting;
