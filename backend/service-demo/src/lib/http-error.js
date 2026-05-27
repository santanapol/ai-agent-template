export class HttpError extends Error {
  constructor(status, code, message, data = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}
