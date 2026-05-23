/**
 * Typed Error hierarchy for the server. Every server-side throw is one of
 * these subclasses; the error-handler middleware reads `.status` to set the
 * HTTP response code and echoes `.message` as the JSON `error` field. Each
 * subclass has a default message that matches the historical
 * `CONST.ERROR_*` string it replaced, so wire-shape stays stable.
 *
 * Constructor takes `(message?, context?)`. The optional context is a plain
 * object stashed on the instance for diagnostics — useful for logging or
 * tests, never serialised into the HTTP response.
 *
 * Usage:
 *   throw new NotFoundError();
 *   throw new NotFoundError(`Gallery "${id}" not found`);
 *   throw new AccessError("Admin required on this gallery", { galleryId });
 */

export class AppError extends Error {
  status: number = 500;
  constructor(
    message?: string,
    public context?: Record<string, unknown>
  ) {
    super(message ?? "Internal server error");
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  override status = 404;
  constructor(message = "Not found", context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class LoginError extends AppError {
  override status = 401;
  constructor(message = "Login failed", context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class InvalidTokenError extends AppError {
  override status = 401;
  constructor(message = "Invalid token", context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class TokenExpiredError extends AppError {
  override status = 401;
  constructor(message = "Token expired", context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class AccessError extends AppError {
  override status = 403;
  constructor(message = "Access denied", context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class RateLimitError extends AppError {
  override status = 429;
  constructor(
    message = "Too many requests",
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

export class NotImplementedError extends AppError {
  override status = 501;
  constructor(message = "Not implemented", context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class UnavailableError extends AppError {
  override status = 503;
  constructor(
    message = "Service not available",
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}
