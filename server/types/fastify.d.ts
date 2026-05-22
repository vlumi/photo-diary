export type AuthUser = {
  id: string;
  isAdmin?: boolean;
} & Record<string, unknown>;

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
    token?: string;
  }
}
