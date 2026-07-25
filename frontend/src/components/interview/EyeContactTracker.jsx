const getStatusClassName = (status) => {
  if (status === "Good Eye Contact") {
    return "text-emerald-300";
  }

  if (status === "Moderate Eye Contact") {
    return "text-cyan-200";
  }

  if (status === "Camera not available") {
    return "text-slate-400";
  }

  return "text-amber-300";
};

const EyeContactTracker = ({
  cameraAvailable = true,
  faceVisible = false,
  eyeContactPercentage = 0,
  lookingAwayCount = 0,
  eyeContactStatus = "Face Not Visible"
}) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
    <p className="text-sm text-slate-400">Eye Contact:</p>
    <p className="mt-2 font-semibold text-white">
      {cameraAvailable ? `${Math.round(eyeContactPercentage)}%` : "Camera not available"}
    </p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <p className="text-sm text-slate-400">Looking Away:</p>
        <p className="mt-1 font-semibold text-white">{lookingAwayCount} times</p>
      </div>
      <div>
        <p className="text-sm text-slate-400">Eye Contact Status:</p>
        <p className={`mt-1 font-semibold ${getStatusClassName(eyeContactStatus)}`}>
          {cameraAvailable ? eyeContactStatus : "Camera not available"}
        </p>
      </div>
    </div>

    {!faceVisible && cameraAvailable ? (
      <p className="mt-3 text-sm text-slate-500">Face must be visible before eye contact can be estimated.</p>
    ) : null}
  </div>
);

export default EyeContactTracker;
