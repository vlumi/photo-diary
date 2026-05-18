export type AuthUser = {
  id: string;
  isAdmin?: boolean;
} & Record<string, unknown>;

declare module "express-serve-static-core" {
  interface Request {
    user: AuthUser;
    token?: string;
  }
}
