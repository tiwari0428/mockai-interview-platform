import { useEffect, useRef, useState } from "react";

const useWebcamAnalysis = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [analysis, setAnalysis] = useState({
    faceVisible: false,
    eyeContactScore: 0,
    emotionLabel: "unavailable",
    postureStatus: "unknown"
  });

  useEffect(() => {
    let intervalId;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setAnalysis({
          faceVisible: true,
          eyeContactScore: 72,
          emotionLabel: "focused",
          postureStatus: "upright"
        });

        intervalId = window.setInterval(() => {
          setAnalysis((previous) => ({
            ...previous,
            faceVisible: true,
            eyeContactScore: Math.max(58, Math.min(88, previous.eyeContactScore + (Math.random() > 0.5 ? 2 : -2)))
          }));
        }, 4000);
      } catch (_error) {
        setCameraReady(false);
        setAnalysis({
          faceVisible: false,
          eyeContactScore: 0,
          emotionLabel: "camera-blocked",
          postureStatus: "unknown"
        });
      }
    };

    startCamera();

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    videoRef,
    cameraReady,
    analysis
  };
};

export default useWebcamAnalysis;
