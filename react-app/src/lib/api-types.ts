import type { components, paths } from "./api-schema";

// Names for the API's shapes, taken from the schema the server
// generates (`api-schema.ts`, never edited by hand). Declare a response
// type here rather than writing an interface beside the service that
// reads it: a hand-written copy keeps compiling after the server
// changes, and this does not.

type JsonOf<R> = R extends { content: { "application/json": infer Body } }
  ? Body
  : never;

/** The JSON body a route answers with (status 200 unless said otherwise). */
export type ResponseOf<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number = 200,
> = paths[Path][Method] extends { responses: infer Responses }
  ? Status extends keyof Responses
    ? JsonOf<Responses[Status]>
    : never
  : never;

export type ApiPhoto = components["schemas"]["Photo"];
export type ApiGallery = components["schemas"]["Gallery"];
export type ApiError = components["schemas"]["ErrorResponse"];
