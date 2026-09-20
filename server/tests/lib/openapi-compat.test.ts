import { findBreakingChanges } from "../../lib/openapi-compat.js";

type Json = Record<string, unknown>;

const doc = (operation: Json, schemas: Json = {}): Json => ({
  paths: { "/things/{id}": { get: operation } },
  components: { schemas },
});

const answering = (schema: Json, extra: Json = {}): Json => ({
  responses: { 200: { content: { "application/json": { schema } } } },
  ...extra,
});

const accepting = (schema: Json, extra: Json = {}): Json => ({
  requestBody: { content: { "application/json": { schema } } },
  responses: {},
  ...extra,
});

const thing = (properties: Json, rest: Json = {}): Json => ({
  type: "object",
  properties,
  ...rest,
});

describe("what a newer API document may not do to a released one", () => {
  test("adding is fine: fields, optional request fields, routes, enum values it accepts", () => {
    const released = doc(
      answering(thing({ id: { type: "string" } }, { required: ["id"] }), {
        parameters: [{ name: "lang", in: "query", schema: { type: "string", enum: ["en"] } }],
      })
    );
    const current = doc(
      answering(
        thing(
          { id: { type: "string" }, title: { type: "string" } },
          { required: ["id", "title"] }
        ),
        {
          parameters: [
            { name: "lang", in: "query", schema: { type: "string", enum: ["en", "ja"] } },
            { name: "page", in: "query", schema: { type: "integer" } },
          ],
        }
      )
    );
    (current.paths as Json)["/other"] = { post: { responses: {} } };
    expect(findBreakingChanges(released, current)).toEqual([]);
  });

  test("a route may not disappear", () => {
    expect(findBreakingChanges(doc(answering(thing({}))), { paths: {} })).toEqual([
      "GET /things/{id}: removed",
    ]);
  });

  test("a response field may not be removed, retyped, or lose its promise", () => {
    const released = doc(
      answering(
        thing(
          {
            id: { type: "string" },
            count: { type: "number" },
            place: thing({ name: { type: "string" } }),
          },
          { required: ["id", "count"] }
        )
      )
    );
    const current = doc(
      answering(
        thing(
          {
            id: { type: "string" },
            count: { anyOf: [{ type: "number" }, { type: "null" }] },
            place: thing({}),
          },
          { required: ["count"] }
        )
      )
    );
    expect(findBreakingChanges(released, current)).toEqual([
      "GET /things/{id} 200.count: type changed from number to null|number",
      "GET /things/{id} 200.place.name: removed",
      "GET /things/{id} 200.id: was promised (required), now optional",
    ]);
  });

  test("shared components and arrays are followed", () => {
    const released = doc(
      answering({ type: "array", items: { $ref: "#/components/schemas/Thing" } }),
      { Thing: thing({ id: { type: "string" }, size: { type: "number" } }) }
    );
    const current = doc(
      answering({ type: "array", items: { $ref: "#/components/schemas/Thing" } }),
      { Thing: thing({ id: { type: "string" } }) }
    );
    expect(findBreakingChanges(released, current)).toEqual([
      "GET /things/{id} 200[].size: removed",
    ]);
  });

  test("a described response is checked even under the generator's default description", () => {
    const described = (properties: Json): Json => ({
      responses: {
        200: {
          description: "Default Response",
          content: { "application/json": { schema: thing(properties) } },
        },
      },
    });
    expect(
      findBreakingChanges(
        doc(described({ id: { type: "string" }, size: { type: "number" } })),
        doc(described({ id: { type: "string" } }))
      )
    ).toEqual(["GET /things/{id} 200.size: removed"]);
  });

  test("a success status may not change, but an undocumented placeholder is no promise", () => {
    const released = doc({
      responses: { 200: { description: "Default Response" }, 201: { description: "Created" } },
    });
    const current = doc({ responses: { 204: { description: "Done" } } });
    expect(findBreakingChanges(released, current)).toEqual([
      "GET /things/{id}: no longer answers 201",
    ]);
  });

  test("a request may not start demanding, refusing, or narrowing", () => {
    const released = doc(
      accepting(
        thing(
          { lang: { type: "string" }, view: { type: "string", enum: ["year", "month"] } },
          { additionalProperties: false }
        ),
        { parameters: [{ name: "lang", in: "query", schema: { type: "string" } }] }
      )
    );
    const current = doc(
      accepting(
        thing(
          { view: { type: "string", enum: ["year"] }, token: { type: "string" } },
          { additionalProperties: false, required: ["token"] }
        ),
        {
          parameters: [
            { name: "lang", in: "query", required: true, schema: { type: "integer" } },
            { name: "key", in: "query", required: true, schema: { type: "string" } },
          ],
        }
      )
    );
    expect(findBreakingChanges(released, current)).toEqual([
      "GET /things/{id} body.lang: removed",
      'GET /things/{id} body.view: no longer accepts "month"',
      "GET /things/{id} body.token: newly required",
      "GET /things/{id} query parameter lang: newly required",
      "GET /things/{id} query parameter lang: type changed from string to integer",
      "GET /things/{id} query parameter key: new and required",
    ]);
  });

  test("an open request body may stop listing a field it still tolerates", () => {
    const released = doc(accepting(thing({ lang: { type: "string" } })));
    const current = doc(accepting(thing({})));
    expect(findBreakingChanges(released, current)).toEqual([]);
  });
});
