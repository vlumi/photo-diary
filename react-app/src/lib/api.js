import token from "./token";

/**
 * Thin fetch wrapper: attaches the bearer token (if any), throws on non-2xx,
 * and parses the response body as JSON (returning {} for empty bodies).
 */
const authedFetch = async (url, options = {}) => {
  const config = token.createConfig();
  const headers = { ...(config.headers || {}), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.response = { status: response.status };
    throw error;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export default authedFetch;
