/* eslint-disable no-console */
import { info, error } from "../../lib/logger.js";

let mockError, mockLog;
beforeEach(() => {
  mockError = vi.fn();
  mockLog = vi.fn();
  global.console = { error: mockError, log: mockLog };
});

describe("info", () => {
  test("No message", () => {
    info();
    expect(console.log).toBeCalled();
    expect(mockLog.mock.calls[0][1]).toBeUndefined();
  });
  test("Empty message", () => {
    info("");
    expect(console.log).toBeCalled();
    expect(mockLog.mock.calls[0][1]).toBe("");
  });
  test("Basic message", () => {
    info("test");
    expect(console.log).toBeCalled();
    expect(mockLog.mock.calls[0][1]).toBe("test");
  });
});
describe("error", () => {
  test("No message", () => {
    error();
    expect(console.error).toBeCalled();
    expect(mockError.mock.calls[0][1]).toBeUndefined();
  });
  test("Empty message", () => {
    error("");
    expect(console.error).toBeCalled();
    expect(mockError.mock.calls[0][1]).toBe("");
  });
  test("Basic message", () => {
    error("test");
    expect(console.error).toBeCalled();
    expect(mockError.mock.calls[0][1]).toBe("test");
  });
});
