import { ObjectId } from 'mongodb';
import { rejectRequest } from '../utils/response.js';

function isValidObjectId(value) {
  return typeof value === 'string' && ObjectId.isValid(value);
}

export function userContextMiddleware(req, res, next) {
  const ouId = req.headers['x-user-ou'];
  const branchId = req.headers['x-user-branch'];
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!isValidObjectId(ouId) || !isValidObjectId(branchId) || !userId || !userRole) {
    return rejectRequest(res, req, {
      status: 403,
      code: 'MISSING_GATEWAY_USER_CONTEXT',
      message: 'Required user context is missing',
    });
  }

  req.userContext = {
    ouId,
    branchId,
    userId,
    userRole,
  };

  next();
}
