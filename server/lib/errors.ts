/**
 * Typed Error hierarchy for the server. Replaces the string-constant style
 * (`throw CONST.ERROR_ACCESS`) with `instanceof`-checkable subclasses, each
 * carrying its HTTP status as a class property and an optional context
 * payload for diagnostics.
 *
 * Migration is incremental — the error-handler middleware understands both
 * forms during the transition; `CONST.ERROR_*` strings stay aliased to the
 * same `.message` text so they keep mapping to the same HTTP status. The
 * preferred form for new code is `throw new <SpecificError>(message?, ctx?)`.
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

export class AccessError extends AppError {
  override status = 403;
  constructor(message = "Access denied", context?: Record<string, unknown>) {
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
