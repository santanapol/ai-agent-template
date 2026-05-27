import Joi from 'joi';

export const createItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  desc: Joi.string().trim().max(2000).optional().default(''),
});
