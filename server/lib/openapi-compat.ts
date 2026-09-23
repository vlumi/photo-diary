// What a newer OpenAPI document may not do to an older one, given that
// the iOS companion doesn't ship with the server: an installed app
// keeps calling whatever the last release documented. Responses may
// only grow; requests may only relax.

type Json = Record<string, unknown>;

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

const asObject = (value: unknown): Json | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : undefined;

const resolver = (doc: Json) => (schema: unknown): Json | undefined => {
  const object = asObject(schema);
  const ref = object?.$ref;
  if (typeof ref !== "string") return object;
  const name = ref.split("/").pop() ?? "";
  const schemas = asObject(asObject(doc.components)?.schemas);
  return asObject(schemas?.[name]);
};

// "string", "number|null", "array", "anyOf(integer|null)" — enough to
// tell whether a field still means what it meant.
const typeOf = (schema: Json | undefined): string => {
  if (!schema) return "any";
  const variants = (schema.anyOf ?? schema.oneOf) as unknown[] | undefined;
  if (Array.isArray(variants)) {
    return variants
      .map((variant) => typeOf(asObject(variant)))
      .sort()
      .join("|");
  }
  // One type, a 3.1 type array, or a 3.0 `nullable`: all end up as the
  // same sorted "a|b" form, so rewriting one as another isn't a change.
  const types = Array.isArray(schema.type)
    ? [...(schema.type as string[])]
    : [typeof schema.type === "string" ? schema.type : "any"];
  if (schema.nullable === true) types.push("null");
  return types.sort().join("|");
};

type Side = "response" | "request";

const compareSchemas = (
  at: string,
  side: Side,
  before: { doc: Json; schema: unknown },
  after: { doc: Json; schema: unknown },
  problems: string[]
): void => {
  const was = resolver(before.doc)(before.schema);
  const now = resolver(after.doc)(after.schema);
  if (!was) return;
  if (!now) {
    problems.push(`${at}: no longer described`);
    return;
  }
  const wasType = typeOf(was);
  const nowType = typeOf(now);
  if (wasType !== "any" && wasType !== nowType) {
    problems.push(`${at}: type changed from ${wasType} to ${nowType}`);
    return;
  }
  if (wasType === "array") {
    compareSchemas(
      `${at}[]`,
      side,
      { doc: before.doc, schema: was.items },
      { doc: after.doc, schema: now.items },
      problems
    );
    return;
  }
  const wasProps = asObject(was.properties) ?? {};
  const nowProps = asObject(now.properties) ?? {};
  const wasRequired = new Set((was.required as string[] | undefined) ?? []);
  const nowRequired = new Set((now.required as string[] | undefined) ?? []);
  for (const key of Object.keys(wasProps)) {
    if (!(key in nowProps)) {
      // A closed request body refuses a field it no longer lists; an
      // open one, and any response, simply stops mentioning it.
      if (side === "response" || now.additionalProperties === false) {
        problems.push(`${at}.${key}: removed`);
      }
      continue;
    }
    compareSchemas(
      `${at}.${key}`,
      side,
      { doc: before.doc, schema: wasProps[key] },
      { doc: after.doc, schema: nowProps[key] },
      problems
    );
  }
  if (side === "response") {
    for (const key of wasRequired) {
      if (key in nowProps && !nowRequired.has(key)) {
        problems.push(`${at}.${key}: was promised (required), now optional`);
      }
    }
  } else {
    for (const key of nowRequired) {
      if (!wasRequired.has(key)) {
        problems.push(`${at}.${key}: newly required`);
      }
    }
    const wasEnum = was.enum as unknown[] | undefined;
    const nowEnum = now.enum as unknown[] | undefined;
    if (Array.isArray(wasEnum) && Array.isArray(nowEnum)) {
      for (const value of wasEnum) {
        if (!nowEnum.includes(value)) {
          problems.push(`${at}: no longer accepts ${JSON.stringify(value)}`);
        }
      }
    }
  }
};

const jsonSchemaOf = (container: unknown): unknown =>
  asObject(asObject(asObject(container)?.content)?.["application/json"])?.schema;

type Parameter = { name: string; in: string; required?: boolean; schema?: unknown };

const parametersOf = (operation: Json): Parameter[] =>
  ((operation.parameters as Parameter[] | undefined) ?? []).filter(
    (parameter) => typeof parameter?.name === "string"
  );

/**
 * Every way `current` breaks a client written against `released`.
 * Empty when `current` only adds.
 */
export const findBreakingChanges = (released: Json, current: Json): string[] => {
  const problems: string[] = [];
  const releasedPaths = asObject(released.paths) ?? {};
  const currentPaths = asObject(current.paths) ?? {};
  for (const [path, byMethod] of Object.entries(releasedPaths)) {
    for (const method of METHODS) {
      const was = asObject(asObject(byMethod)?.[method]);
      if (!was) continue;
      const name = `${method.toUpperCase()} ${path}`;
      const now = asObject(asObject(currentPaths[path])?.[method]);
      if (!now) {
        problems.push(`${name}: removed`);
        continue;
      }

      const wasResponses = asObject(was.responses) ?? {};
      const nowResponses = asObject(now.responses) ?? {};
      for (const [status, response] of Object.entries(wasResponses)) {
        if (!status.startsWith("2") && !status.startsWith("3")) continue;
        // The generator's stand-in for a route that documents nothing:
        // that description AND no body. (Every response without a
        // description of its own gets the same text, described or not.)
        if (
          asObject(response)?.description === "Default Response" &&
          jsonSchemaOf(response) === undefined
        ) {
          continue;
        }
        if (!(status in nowResponses)) {
          problems.push(`${name}: no longer answers ${status}`);
          continue;
        }
        compareSchemas(
          `${name} ${status}`,
          "response",
          { doc: released, schema: jsonSchemaOf(response) },
          { doc: current, schema: jsonSchemaOf(nowResponses[status]) },
          problems
        );
      }

      compareSchemas(
        `${name} body`,
        "request",
        { doc: released, schema: jsonSchemaOf(was.requestBody) },
        { doc: current, schema: jsonSchemaOf(now.requestBody) },
        problems
      );

      const wasParameters = parametersOf(was);
      for (const parameter of parametersOf(now)) {
        const before = wasParameters.find(
          (p) => p.name === parameter.name && p.in === parameter.in
        );
        const at = `${name} ${parameter.in} parameter ${parameter.name}`;
        if (!before) {
          if (parameter.required) problems.push(`${at}: new and required`);
          continue;
        }
        if (parameter.required && !before.required) {
          problems.push(`${at}: newly required`);
        }
        compareSchemas(
          at,
          "request",
          { doc: released, schema: before.schema },
          { doc: current, schema: parameter.schema },
          problems
        );
      }
    }
  }
  return problems;
};
