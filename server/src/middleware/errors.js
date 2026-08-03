function notFound(_req, res) {
  res.status(404).json({ ok: false, error: "Route not found." });
}

function isDatabaseUnavailableError(error) {
  const code = String(error?.code || "");
  if (
    [
      "ECONNREFUSED",
      "PROTOCOL_CONNECTION_LOST",
      "ENOTFOUND",
      "ETIMEDOUT",
      "ECONNRESET",
      "ER_ACCESS_DENIED_ERROR",
      "ER_BAD_DB_ERROR",
      "DATABASE_UNAVAILABLE"
    ].includes(code)
  ) {
    return true;
  }
  const message = String(error?.message || "");
  return /Database connection unavailable|Supabase storage is not configured|Supabase .+ timed out|fetch failed|UND_ERR_CONNECT|ECONNREFUSED/i.test(
    message
  );
}

function databaseUnavailableError(cause) {
  const error = new Error(
    "Durable account storage is temporarily unavailable. Study history may stay in this browser until Supabase is reachable."
  );
  error.status = 503;
  error.code = cause?.code || "DATABASE_UNAVAILABLE";
  error.cause = cause;
  return error;
}

function errorHandler(error, _req, res, _next) {
  let status = Number(error.status || error.statusCode || 500);
  if ((!status || status === 500) && isDatabaseUnavailableError(error)) {
    status = 503;
  }
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message =
    safeStatus === 503
      ? error.message || "Service temporarily unavailable."
      : safeStatus >= 500
        ? "Server error."
        : error.message;
  if (safeStatus >= 500) {
    console.error(error);
  }
  res.status(safeStatus).json({
    ok: false,
    error: message,
    ...(safeStatus === 503 ? { status: "degraded" } : {})
  });
}

export {
  databaseUnavailableError,
  errorHandler,
  isDatabaseUnavailableError,
  notFound
};
