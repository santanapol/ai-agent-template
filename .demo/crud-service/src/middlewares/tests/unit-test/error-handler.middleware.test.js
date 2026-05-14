"use strict";

jest.mock("../../../config/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const errorHandler = require("../../error-handler.middleware");
const HttpError = require("../../../utils/http-error");
const CODES = require("../../../utils/error-codes");

function mockRes() {
  const res = {};
  res.headersSent = false;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

describe("error-handler.middleware", () => {
  const req = { id: "req-1" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps HttpError to envelope and status", () => {
    const res = mockRes();
    const err = new HttpError(404, CODES.RESOURCE_NOT_FOUND, "missing");
    errorHandler(err, req, res, jest.fn());
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "req-1");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: CODES.RESOURCE_NOT_FOUND,
        message: "missing",
        requestId: "req-1",
      }),
    );
  });

  it("maps express entity.parse.failed to INVALID_JSON_BODY", () => {
    const res = mockRes();
    const err = Object.assign(new Error("bad json"), {
      type: "entity.parse.failed",
    });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: CODES.INVALID_JSON_BODY,
      }),
    );
  });

  it("maps MongoServerError code 18 to DATASTORE_CREDENTIAL_REJECTED", () => {
    const res = mockRes();
    const err = Object.assign(new Error("auth failed"), {
      name: "MongoServerError",
      code: 18,
    });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: CODES.DATASTORE_CREDENTIAL_REJECTED,
      }),
    );
  });

  it("maps MongoServerError code 121 to INVALID_PARAM", () => {
    const res = mockRes();
    const err = Object.assign(new Error("validation failed"), {
      name: "MongoServerError",
      code: 121,
    });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: CODES.INVALID_PARAM,
      }),
    );
  });

  it("maps MongoServerError duplicate key 11000 to DUPLICATE", () => {
    const res = mockRes();
    const err = Object.assign(new Error("dup"), {
      name: "MongoServerError",
      code: 11000,
      keyPattern: { code: 1 },
      keyValue: { code: "X" },
    });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: CODES.DUPLICATE,
      }),
    );
  });

  it("maps unknown errors to INTERNAL_ERROR", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: CODES.INTERNAL_ERROR,
      }),
    );
  });

  it("does not send body when headers already sent", () => {
    const res = mockRes();
    res.headersSent = true;
    errorHandler(new Error("late"), req, res, jest.fn());
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
