import * as itemsService from '../services/items.service.js';
import { generateETag } from '../utils/etag.js';
import { mapItemToResponse } from '../utils/mapper.js';
import { sendSuccess } from '../utils/response.js';

export async function createItem(req, res) {
  const { ouId, branchId, userId } = req.userContext;
  const document = await itemsService.createItem({
    ouId,
    branchId,
    userId,
    body: req.body,
  });

  res.setHeader('ETag', generateETag(document.upd_date));

  sendSuccess(res, {
    status: 201,
    code: 'CREATED',
    message: 'Item created successfully',
    data: mapItemToResponse(document),
  });
}
