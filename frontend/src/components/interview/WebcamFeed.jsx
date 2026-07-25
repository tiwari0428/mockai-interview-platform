import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import faceMeshBinary from "@mediapipe/face_mesh/face_mesh.binarypb?url";
import faceMeshAssets from "@mediapipe/face_mesh/face_mesh_solution_packed_assets.data?url";
import faceMeshAssetsLoader from "@mediapipe/face_mesh/face_mesh_solution_packed_assets_loader.js?url";
import faceMeshWasm from "@mediapipe/face_mesh/face_mesh_solution_wasm_bin.wasm?url";
import faceMeshWasmJs from "@mediapipe/face_mesh/face_mesh_solution_wasm_bin.js?url";
import faceMeshSimdWasm from "@mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.wasm?url";
import faceMeshSimdWasmJs from "@mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.js?url";
import faceMeshSimdWasmData from "@mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.data?url";

const FACE_MESH_ASSETS = {
  "face_mesh.binarypb": faceMeshBinary,
  "face_mesh_solution_packed_assets.data": faceMeshAssets,
  "face_mesh_solution_packed_assets_loader.js": faceMeshAssetsLoader,
  "face_mesh_solution_wasm_bin.wasm": faceMeshWasm,
  "face_mesh_solution_wasm_bin.js": faceMeshWasmJs,
  "face_mesh_solution_simd_wasm_bin.wasm": faceMeshSimdWasm,
  "face_mesh_solution_simd_wasm_bin.js": faceMeshSimdWasmJs,
  "face_mesh_solution_simd_wasm_bin.data": faceMeshSimdWasmData
};

const videoConstraints = {
  width: 960,
  height: 720,
  facingMode: "user"
};

const clampPercentage = (value) => Math.max(0, Math.min(Math.round(value), 100));
const EYE_CONTACT_FRAME_WINDOW = 5;
const AWAY_FRAMES_REQUIRED = 3;
const AWAY_TRIGGER_MS = 400;
const RETURN_TO_CENTER_MS = 300;

const estimateLookingAtCamera = (landmarks = []) => {
  const noseTip = landmarks[1];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const faceLeft = landmarks[234];
  const faceRight = landmarks[454];

  if (!noseTip || !leftEyeOuter || !rightEyeOuter) {
    return false;
  }

  const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const horizontalCentered = Math.abs(noseTip.x - 0.5) <= 0.21 && Math.abs(eyeCenterX - 0.5) <= 0.21;
  const verticalCentered = Math.abs(noseTip.y - 0.5) <= 0.2 && Math.abs(eyeCenterY - 0.42) <= 0.2;
  const noseNearEyeCenter = Math.abs(noseTip.x - eyeCenterX) <= 0.12;

  if (!faceLeft || !faceRight) {
    return horizontalCentered && verticalCentered && noseNearEyeCenter;
  }

  const faceCenterX = (faceLeft.x + faceRight.x) / 2;
  const faceWidth = Math.max(Math.abs(faceRight.x - faceLeft.x), 0.2);
  const yawCentered = Math.abs(noseTip.x - faceCenterX) <= faceWidth * 0.2;

  return horizontalCentered && verticalCentered && noseNearEyeCenter && yawCentered;
};

const WebcamFeed = ({
  onCameraStatusChange,
  onCameraAvailabilityChange,
  onFaceVisibleChange,
  onFaceMissingWarningChange,
  onFaceMissingCountChange,
  onEyeContactAnalysisChange
}) => {
  const webcamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const frameRequestRef = useRef(null);
  const isProcessingFrameRef = useRef(false);
  const lastFaceVisibleRef = useRef(false);
  const lookingAtCameraStateRef = useRef(true);
  const recentEyeContactFramesRef = useRef([]);
  const awayCandidateStartedAtRef = useRef(null);
  const returnCandidateStartedAtRef = useRef(null);
  const awayEventActiveRef = useRef(false);
  const eyeContactFramesRef = useRef(0);
  const totalFaceFramesRef = useRef(0);
  const lookingAwayCountRef = useRef(0);
  const lastEyeContactEmitAtRef = useRef(0);
  const faceMissingStartedAtRef = useRef(null);
  const missingWarningShownRef = useRef(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const updateFaceVisible = useCallback(
    (nextVisible) => {
      if (lastFaceVisibleRef.current === nextVisible) {
        return;
      }

      lastFaceVisibleRef.current = nextVisible;
      onFaceVisibleChange?.(nextVisible);
    },
    [onFaceVisibleChange]
  );

  const stopCameraStream = useCallback(() => {
    const stream = webcamRef.current?.stream || webcamRef.current?.video?.srcObject;
    stream?.getTracks?.().forEach((track) => track.stop());
  }, []);

  const stopFaceDetection = useCallback(() => {
    if (frameRequestRef.current) {
      window.cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    isProcessingFrameRef.current = false;
    faceMissingStartedAtRef.current = null;
    missingWarningShownRef.current = false;
    onFaceMissingWarningChange?.(false);
  }, [onFaceMissingWarningChange]);

  const emitEyeContactAnalysis = useCallback(
    (force = false) => {
      const percentage = totalFaceFramesRef.current
        ? clampPercentage((eyeContactFramesRef.current / totalFaceFramesRef.current) * 100)
        : 0;
      const now = Date.now();

      if (!force && now - lastEyeContactEmitAtRef.current < 350) {
        return;
      }

      lastEyeContactEmitAtRef.current = now;
      onEyeContactAnalysisChange?.({
        eyeContactPercentage: percentage,
        lookingAwayCount: lookingAwayCountRef.current,
        lookingAtCamera: lookingAtCameraStateRef.current === true
      });
    },
    [onEyeContactAnalysisChange]
  );

  const resetEyeContactAnalysis = useCallback(() => {
    lookingAtCameraStateRef.current = true;
    recentEyeContactFramesRef.current = [];
    awayCandidateStartedAtRef.current = null;
    returnCandidateStartedAtRef.current = null;
    awayEventActiveRef.current = false;
    eyeContactFramesRef.current = 0;
    totalFaceFramesRef.current = 0;
    lookingAwayCountRef.current = 0;
    lastEyeContactEmitAtRef.current = 0;
    onEyeContactAnalysisChange?.({
      eyeContactPercentage: 0,
      lookingAwayCount: 0,
      lookingAtCamera: false
    });
  }, [onEyeContactAnalysisChange]);

  const updateSmoothedEyeContact = useCallback((lookingAtCameraEstimate) => {
    const now = Date.now();
    recentEyeContactFramesRef.current = [
      ...recentEyeContactFramesRef.current.slice(-(EYE_CONTACT_FRAME_WINDOW - 1)),
      lookingAtCameraEstimate
    ];

    const recentFrames = recentEyeContactFramesRef.current;
    const awayFrameCount = recentFrames.filter((isLookingAtCamera) => !isLookingAtCamera).length;
    const centeredFrameCount = recentFrames.filter(Boolean).length;
    const enoughAwayFrames = recentFrames.length >= AWAY_FRAMES_REQUIRED && awayFrameCount >= AWAY_FRAMES_REQUIRED;
    const enoughCenteredFrames = recentFrames.length >= AWAY_FRAMES_REQUIRED && centeredFrameCount >= AWAY_FRAMES_REQUIRED;

    if (enoughAwayFrames) {
      if (!awayCandidateStartedAtRef.current) {
        awayCandidateStartedAtRef.current = now;
        console.log("[EyeContact] awayCandidate", {
          awayFrames: awayFrameCount,
          windowSize: recentFrames.length
        });
      }
    } else {
      awayCandidateStartedAtRef.current = null;
    }

    if (enoughCenteredFrames) {
      if (!returnCandidateStartedAtRef.current) {
        returnCandidateStartedAtRef.current = now;
      }
    } else {
      returnCandidateStartedAtRef.current = null;
    }

    if (
      !awayEventActiveRef.current &&
      awayCandidateStartedAtRef.current &&
      now - awayCandidateStartedAtRef.current >= AWAY_TRIGGER_MS
    ) {
      awayEventActiveRef.current = true;
      lookingAtCameraStateRef.current = false;
      lookingAwayCountRef.current += 1;
      console.log("[EyeContact] awayConfirmed");
      console.log("[EyeContact] lookingAwayCount", lookingAwayCountRef.current);
      emitEyeContactAnalysis(true);
      return;
    }

    if (
      awayEventActiveRef.current &&
      returnCandidateStartedAtRef.current &&
      now - returnCandidateStartedAtRef.current >= RETURN_TO_CENTER_MS
    ) {
      awayEventActiveRef.current = false;
      lookingAtCameraStateRef.current = true;
      awayCandidateStartedAtRef.current = null;
      returnCandidateStartedAtRef.current = null;
      console.log("[EyeContact] returnedCenter");
      emitEyeContactAnalysis(true);
      return;
    }

    if (!awayEventActiveRef.current) {
      lookingAtCameraStateRef.current = true;
    }
  }, [emitEyeContactAnalysis]);

  const resetFaceState = useCallback(() => {
    updateFaceVisible(false);
    onFaceMissingCountChange?.(0);
    onFaceMissingWarningChange?.(false);
  }, [onFaceMissingCountChange, onFaceMissingWarningChange, updateFaceVisible]);

  const handleStartCamera = () => {
    setCameraError("");
    onCameraAvailabilityChange?.(true);
    resetEyeContactAnalysis();
    setCameraEnabled(true);
  };

  const handleStopCamera = useCallback(() => {
    stopFaceDetection();
    stopCameraStream();
    setCameraEnabled(false);
    setCameraActive(false);
    onCameraStatusChange?.(false);
    onCameraAvailabilityChange?.(true);
    resetFaceState();
  }, [onCameraAvailabilityChange, onCameraStatusChange, resetFaceState, stopCameraStream, stopFaceDetection]);

  const handleUserMedia = useCallback(() => {
    setCameraActive(true);
    setCameraError("");
    onCameraStatusChange?.(true);
    onCameraAvailabilityChange?.(true);
  }, [onCameraAvailabilityChange, onCameraStatusChange]);

  const handleUserMediaError = useCallback(
    (error) => {
      console.log("[WebcamFeed] Camera access error:", error);
      setCameraActive(false);
      setCameraEnabled(false);
      onCameraStatusChange?.(false);
      onCameraAvailabilityChange?.(false);
      resetFaceState();
      resetEyeContactAnalysis();

      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      setCameraError(
        denied
          ? "Camera access is blocked. Please allow webcam permission in your browser settings and try again."
          : "Camera is not available right now. Please check your webcam and try again."
      );
    },
    [onCameraAvailabilityChange, onCameraStatusChange, resetEyeContactAnalysis, resetFaceState]
  );

  useEffect(() => {
    onCameraStatusChange?.(cameraActive);
  }, [cameraActive, onCameraStatusChange]);

  useEffect(() => {
    if (!cameraActive) {
      stopFaceDetection();
      updateFaceVisible(false);
      return undefined;
    }

    let cancelled = false;

    const faceMesh = new FaceMesh({
      locateFile: (file) => FACE_MESH_ASSETS[file] || file
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });
    faceMesh.onResults((results) => {
      const visible = Boolean(results.multiFaceLandmarks?.length);
      updateFaceVisible(visible);

      if (visible) {
        const lookingAtCameraEstimate = estimateLookingAtCamera(results.multiFaceLandmarks[0]);
        updateSmoothedEyeContact(lookingAtCameraEstimate);
        totalFaceFramesRef.current += 1;
        if (!awayEventActiveRef.current) {
          eyeContactFramesRef.current += 1;
        }
        emitEyeContactAnalysis();
        faceMissingStartedAtRef.current = null;
        missingWarningShownRef.current = false;
        onFaceMissingWarningChange?.(false);
        return;
      }

      recentEyeContactFramesRef.current = [];
      awayCandidateStartedAtRef.current = null;
      returnCandidateStartedAtRef.current = null;
      lookingAtCameraStateRef.current = false;
      const now = Date.now();
      if (!faceMissingStartedAtRef.current) {
        faceMissingStartedAtRef.current = now;
      }

      if (now - faceMissingStartedAtRef.current > 2000) {
        onFaceMissingWarningChange?.(true);
        if (!missingWarningShownRef.current) {
          missingWarningShownRef.current = true;
          onFaceMissingCountChange?.((previous) => previous + 1);
        }
      }
    });

    faceMeshRef.current = faceMesh;

    const processFrame = async () => {
      if (cancelled || !webcamRef.current?.video || isProcessingFrameRef.current) {
        frameRequestRef.current = window.requestAnimationFrame(processFrame);
        return;
      }

      const video = webcamRef.current.video;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        frameRequestRef.current = window.requestAnimationFrame(processFrame);
        return;
      }

      isProcessingFrameRef.current = true;
      try {
        await faceMesh.send({ image: video });
      } catch (error) {
        console.log("[WebcamFeed] Face detection frame failed:", error);
      } finally {
        isProcessingFrameRef.current = false;
        frameRequestRef.current = window.requestAnimationFrame(processFrame);
      }
    };

    frameRequestRef.current = window.requestAnimationFrame(processFrame);

    return () => {
      cancelled = true;
      stopFaceDetection();
      faceMesh.close();
      faceMeshRef.current = null;
    };
  }, [
    cameraActive,
    emitEyeContactAnalysis,
    onFaceMissingCountChange,
    onFaceMissingWarningChange,
    stopFaceDetection,
    updateSmoothedEyeContact,
    updateFaceVisible
  ]);

  useEffect(() => () => {
    stopFaceDetection();
    stopCameraStream();
  }, [stopCameraStream, stopFaceDetection]);

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">Webcam Feed</h2>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${
            cameraActive
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-slate-950/60 text-slate-300"
          }`}
        >
          {cameraActive ? "Camera Active" : "Camera Off"}
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-inner">
        {cameraEnabled ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center p-6 text-center text-sm leading-6 text-slate-400">
            Camera preview will appear here.
          </div>
        )}
      </div>

      {cameraError ? (
        <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          {cameraError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button-primary" onClick={handleStartCamera} disabled={cameraEnabled}>
          Start Camera
        </button>
        <button className="button-secondary" onClick={handleStopCamera} disabled={!cameraEnabled && !cameraActive}>
          Stop Camera
        </button>
      </div>
    </section>
  );
};

export default WebcamFeed;
