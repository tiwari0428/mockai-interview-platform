export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  console.error(error);

  const isServerError = statusCode >= 500;
  const clientMessage = isServerError
    ? "Something went wrong. Please try again later."
    : error.message || "Request failed";

  res.status(statusCode).json({
    message: clientMessage
  });
};