import token from "./token";

class HttpError extends Error {
  response: { status: number };
  constructor(message: string, status: number) {
    super(message);
    this.response = { status };
  }
}

const authedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<unknown> => {
  const config = token.createConfig();
  const headers = { ...(config.headers || {}), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new HttpError(`Request failed: ${response.status}`, response.status);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export default authedFetch;
