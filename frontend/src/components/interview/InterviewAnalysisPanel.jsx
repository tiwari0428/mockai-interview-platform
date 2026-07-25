import { useEffect, useState } from "react";
import EyeContactTracker from "./EyeContactTracker.jsx";

const InterviewAnalysisPanel = ({
  cameraAvailable = true,
  cameraActive = false,
  faceVisible = false,
  faceMissingWarning = false,
  detectedFaceMissingCount = 0,
  detectedEyeContactPercentage = 0,
  detectedLookingAwayCount = 0,
  lookingAtCamera = false
}) => {
  const [eyeContactPercentage, setEyeContactPercentage] = useState(0);
  const [lookingAwayCount, setLookingAwayCount] = useState(0);
  const [faceMissingCount, setFaceMissingCount] = useState(0);
  const [confidenceScore] = useState(0);

  useEffect(() => {
    setFaceMissingCount(detectedFaceMissingCount);
  }, [detectedFaceMissingCount]);

  useEffect(() => {
    setEyeContactPercentage(Math.max(0, Math.min(Math.round(detectedEyeContactPercentage), 100)));
  }, [detectedEyeContactPercentage]);

  useEffect(() => {
    setLookingAwayCount(detectedLookingAwayCount);
  }, [detectedLookingAwayCount]);

  const eyeContactStatus = (() => {
    if (!cameraAvailable) {
      return "Camera not available";
    }
    if (!faceVisible) {
      return "Face Not Visible";
    }
    if (!lookingAtCamera) {
      return "Looking Away";
    }
    if (eyeContactPercentage >= 80) {
      return "Good Eye Contact";
    }
    if (eyeContactPercentage >= 50) {
      return "Moderate Eye Contact";
    }
    return "Needs Improvement";
  })();

  return (
    <section className="panel p-5">
      <h2 className="font-display text-2xl font-bold text-white">Interview Analysis</h2>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Camera Status:</p>
          <p className="mt-2 font-semibold text-white">
            {!cameraAvailable ? "Camera not available" : cameraActive ? "Camera Active" : "Camera Off"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Face Status:</p>
          <p className={`mt-2 font-semibold ${faceVisible ? "text-emerald-300" : "text-amber-300"}`}>
            {faceVisible ? "Face Detected" : "Face Not Visible"}
          </p>
          {faceMissingWarning ? (
            <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Please stay in front of the camera
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Face Missing Count:</p>
          <p className="mt-2 font-semibold text-white">{faceMissingCount}</p>
        </div>

        <EyeContactTracker
          cameraAvailable={cameraAvailable}
          faceVisible={faceVisible}
          eyeContactPercentage={eyeContactPercentage}
          lookingAwayCount={lookingAwayCount}
          eyeContactStatus={eyeContactStatus}
        />
      </div>

      <div className="hidden" aria-hidden="true">
        {eyeContactPercentage}
        {lookingAwayCount}
        {confidenceScore}
      </div>
    </section>
  );
};

export default InterviewAnalysisPanel;
