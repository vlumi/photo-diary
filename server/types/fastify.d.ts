export type AuthUser = {
  id: string;
  isAdmin?: boolean;
} & Record<string, unknown>;

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
    token?: string;
    // Gallery ids whose `hostname` regex matches the `Host` header.
    // Empty (or undefined) on the primary host = unscoped. Non-empty
    // = the admin surface is narrowed to that set; cross-gallery
    // admin operations (user/meta/gallery CRUD) are unreachable. Set
    // globally by the `hostScopeFilter` middleware; route handlers
    // call the guards in `lib/host-scope.ts` to enforce.
    galleryScope?: string[];
  }
}
