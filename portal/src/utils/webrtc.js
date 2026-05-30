const normalizeUrl = (url = "") => String(url).trim().replace(/\s+/g, "");

export const buildRtcConfig = () => {
  const iceServers = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ];

  const turnUrls = (import.meta.env.VITE_TURN_URLS || "").split(",")
    .map(normalizeUrl)
    .filter(Boolean);

  const turnUsername = normalizeUrl(import.meta.env.VITE_TURN_USERNAME || "");
  const turnCredential = normalizeUrl(import.meta.env.VITE_TURN_PASSWORD || "");

  if (turnUrls.length && turnUsername && turnCredential) {
    turnUrls.forEach((turnUrl) => {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });
    });
  }

  return {
    iceServers,
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 10,
  };
};

export const createPeerConnection = ({
  rtcConfig,
  localStream,
  onIceCandidate,
  onTrack,
  onConnectionStateChange,
  onIceConnectionStateChange,
  onSignalingStateChange,
  onIceGatheringStateChange,
  onNegotiationNeeded,
}) => {
  const pc = new RTCPeerConnection(rtcConfig);

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate && typeof onIceCandidate === "function") {
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    if (typeof onTrack === "function") {
      onTrack(event);
    }
  };

  pc.onconnectionstatechange = () => {
    if (typeof onConnectionStateChange === "function") {
      onConnectionStateChange(pc.connectionState, pc);
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (typeof onIceConnectionStateChange === "function") {
      onIceConnectionStateChange(pc.iceConnectionState, pc);
    }
  };

  pc.onsignalingstatechange = () => {
    if (typeof onSignalingStateChange === "function") {
      onSignalingStateChange(pc.signalingState, pc);
    }
  };

  pc.onicegatheringstatechange = () => {
    if (typeof onIceGatheringStateChange === "function") {
      onIceGatheringStateChange(pc.iceGatheringState, pc);
    }
  };

  pc.onnegotiationneeded = () => {
    if (typeof onNegotiationNeeded === "function") {
      onNegotiationNeeded(pc);
    }
  };

  return pc;
};

export const flushIceCandidates = async (pc, candidateQueue = []) => {
  if (!pc || !candidateQueue?.length) return;

  while (candidateQueue.length) {
    const candidate = candidateQueue.shift();
    if (!candidate) continue;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn("Failed to add queued ICE candidate", error);
    }
  }
};

export const stopMediaStream = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};
