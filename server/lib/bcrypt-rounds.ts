// bcrypt cost factor. Production-safe default of 10 (~100ms per hash);
// tests override via `BCRYPT_ROUNDS=4` to keep the API suite from
// starving the event loop when many login flows run in parallel.
export const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);
