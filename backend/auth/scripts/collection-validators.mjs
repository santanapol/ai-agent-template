/** @type {Array<{ collection: string, schema: object }>} */
export const COLLECTION_VALIDATORS = [
  {
    collection: 'auth_users',
    schema: {
      bsonType: 'object',
      required: [
        'ou_id',
        'branch_id',
        'username',
        'password_hash',
        'role',
        'access_token_gen',
        'cr_by',
        'cr_date',
        'cr_prog',
        'upd_by',
        'upd_date',
        'upd_prog'
      ],
      properties: {
        ou_id: { bsonType: 'objectId' },
        branch_id: { bsonType: 'objectId' },
        username: { bsonType: 'string', minLength: 1 },
        password_hash: { bsonType: 'string', minLength: 1 },
        role: { bsonType: 'string', minLength: 1 },
        access_token_gen: { bsonType: ['int', 'long'] }
      }
    }
  },
  {
    collection: 'platform_branches',
    schema: {
      bsonType: 'object',
      required: ['ou_id'],
      properties: {
        ou_id: { bsonType: 'objectId' },
        branch_code: { bsonType: 'string' },
        branch_name: { bsonType: 'string' },
        active: { bsonType: ['bool', 'int', 'long', 'double'] }
      }
    }
  },
  {
    collection: 'auth_menus',
    schema: {
      bsonType: 'object',
      required: ['key', 'label'],
      properties: {
        key: { bsonType: 'string', minLength: 1 },
        label: { bsonType: 'string', minLength: 1 },
        parent_key: { bsonType: ['string', 'null'] },
        sort_order: { bsonType: ['int', 'long', 'double'] },
        type: { bsonType: 'string' },
        ou_id: { bsonType: ['objectId', 'null'] }
      }
    }
  },
  {
    collection: 'auth_role_permissions',
    schema: {
      bsonType: 'object',
      required: ['role', 'menu_keys'],
      properties: {
        ou_id: { bsonType: ['objectId', 'null'] },
        role: { bsonType: 'string', minLength: 1 },
        menu_keys: { bsonType: 'array', items: { bsonType: 'string' } }
      }
    }
  }
]
