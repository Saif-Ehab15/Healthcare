import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../Videoconference/Video.css";

const SOCKET_URL = "https://gliddery-sociogenetic-elza.ngrok-free.dev"; // 🔗 استخدم رابط ngrok بتاع الدكتور

const VideoConference = () => {
  const [yourId, setYourId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [incomingCall, setIncomingCall] = useState(false);
  const [fromUserId, setFromUserId] = useState(null);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socket = useRef();
  const peerConnection = useRef(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    // عند الاتصال بالسيرفر، يرسل ال socket.id
    socket.current.on("connect", () => {
      console.log("Connected to server:", socket.current.id);
      setYourId(socket.current.id);
    });

    // عندما يتصل الدكتور بالمريض
    socket.current.on("callUser", async (data) => {
      console.log("Incoming call from:", data.from);
      setIncomingCall(true);
      setFromUserId(data.from);
      setDoctorId(data.from);
      window.incomingOffer = data.offer; // نحفظ العرض لحين القبول
    });

    // عندما يأتي الرد من الدكتور بعد الإجابة
    socket.current.on("answerMade", async (data) => {
      console.log("Answer made:", data);
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    // استقبال ICE Candidate من الدكتور
    socket.current.on("iceCandidate", async (data) => {
      if (peerConnection.current && data.candidate) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error("Error adding received ICE candidate", error);
        }
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("iceCandidate", {
          to: doctorId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Remote stream received");
      setRemoteStream(event.streams[0]);
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    return pc;
  };

  const acceptCall = async () => {
    setIncomingCall(false);

    const pc = createPeerConnection();
    peerConnection.current = pc;

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    setStream(localStream);
    localVideoRef.current.srcObject = localStream;

    await pc.setRemoteDescription(new RTCSessionDescription(window.incomingOffer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.current.emit("answerCall", {
      to: fromUserId,
      answer,
    });
  };

  const rejectCall = () => {
    setIncomingCall(false);
    setFromUserId(null);
    toast.info("You rejected the call.");
  };

  return (
    <div className="video-container">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />
      <h2>🎥 Patient Video Conference</h2>
      <p>Your ID: <strong>{yourId || "Connecting..."}</strong></p>

      {incomingCall && (
        <div className="incoming-call">
          <p>📞 Incoming call from Doctor ({fromUserId})</p>
          <button onClick={acceptCall} className="accept-btn">Accept</button>
          <button onClick={rejectCall} className="reject-btn">Reject</button>
        </div>
      )}

      <div className="videos">
        <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
        <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
      </div>
    </div>
  );
};

export default VideoConference;
