# Production schema baseline

| Field | Value |
|-------|-------|
| dumped_at | 2026-07-09T04:23:12.230Z |
| environment | production |
| prod_git_commit | a7ba9fe361165de705934e5ba972e9efc3b4fb6a |
| dumped_by | human-prod-validators-2026-07-09 |
| databases | zero-platform, zero-agent-invoice, zero-smart-report |

> Read-only dump — no documents. URI hosts redacted.

## Database: `zero-platform`

URI: `mongodb://<prod-host>/zero-platform?appName=zero-platform`

### auth_audit_events

**Indexes:**
- `_id_`: `{"_id":1}`
- `by_request_id`: `{"request_id":1}`
- `ttl_retention_until`: `{"retention_until":1}` (TTL expireAfterSeconds=0)

### auth_credential_throttle

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_throttle_key`: `{"throttle_key":1}` (unique)

### auth_menus

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "key",
      "label"
    ],
    "properties": {
      "key": {
        "bsonType": "string",
        "minLength": 1
      },
      "label": {
        "bsonType": "string",
        "minLength": 1
      },
      "parent_key": {
        "bsonType": [
          "string",
          "null"
        ]
      },
      "sort_order": {
        "bsonType": [
          "int",
          "long",
          "double"
        ]
      },
      "type": {
        "bsonType": "string"
      },
      "ou_id": {
        "bsonType": [
          "objectId",
          "null"
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_menu_key`: `{"key":1}` (unique)
- `by_parent_key`: `{"parent_key":1}`

### auth_refresh_tokens

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_token_hash`: `{"token_hash":1}` (unique)
- `by_user_revoked_exp`: `{"user_id":1,"revoked_at":1,"expires_at":1}`
- `by_family`: `{"family_id":1}`
- `ttl_expires_at`: `{"expires_at":1}` (TTL expireAfterSeconds=0)

### auth_role_permissions

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "role",
      "menu_keys"
    ],
    "properties": {
      "ou_id": {
        "bsonType": [
          "objectId",
          "null"
        ]
      },
      "role": {
        "bsonType": "string",
        "minLength": 1
      },
      "menu_keys": {
        "bsonType": "array",
        "items": {
          "bsonType": "string"
        }
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_ou_role`: `{"ou_id":1,"role":1}` (unique)

### auth_users

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "ou_id",
      "branch_id",
      "username",
      "password_hash",
      "role",
      "cr_by",
      "cr_date",
      "cr_prog",
      "upd_by",
      "upd_date",
      "upd_prog"
    ],
    "properties": {
      "ou_id": {
        "bsonType": "objectId"
      },
      "branch_id": {
        "bsonType": "objectId"
      },
      "username": {
        "bsonType": "string",
        "minLength": 1
      },
      "password_hash": {
        "bsonType": "string",
        "minLength": 1
      },
      "role": {
        "bsonType": "string",
        "minLength": 1
      },
      "access_token_gen": {
        "bsonType": [
          "int",
          "long"
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_username`: `{"username":1}` (unique)
- `by_ou_branch`: `{"ou_id":1,"branch_id":1}`
- `by_ou_role`: `{"ou_id":1,"role":1}`

### platform_branches

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "ou_id"
    ],
    "properties": {
      "ou_id": {
        "bsonType": "objectId"
      },
      "branch_code": {
        "bsonType": "string"
      },
      "branch_name": {
        "bsonType": "string"
      },
      "active": {
        "bsonType": [
          "bool",
          "int",
          "long",
          "double"
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_ou_branch_code`: `{"ou_id":1,"branch_code":1}` (unique)
- `by_ou_active`: `{"ou_id":1,"active":1}`

### staff_profiles

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "user_id",
      "ou_id",
      "branch_id",
      "status",
      "code",
      "firstname",
      "lastname",
      "cr_by",
      "cr_date",
      "cr_prog",
      "upd_by",
      "upd_date",
      "upd_prog"
    ],
    "properties": {
      "status": {
        "enum": [
          "active",
          "archived"
        ]
      },
      "code": {
        "bsonType": "string",
        "minLength": 1,
        "maxLength": 32
      },
      "firstname": {
        "bsonType": "string",
        "minLength": 1,
        "maxLength": 128
      },
      "lastname": {
        "bsonType": "string",
        "minLength": 1,
        "maxLength": 128
      },
      "email": {
        "bsonType": [
          "string",
          "null"
        ],
        "maxLength": 254
      },
      "tel": {
        "bsonType": [
          "string",
          "null"
        ],
        "maxLength": 16
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `uniq_user_id`: `{"user_id":1}` (unique)
- `uniq_ou_branch_code`: `{"ou_id":1,"branch_id":1,"code":1}` (unique)
- `list_by_branch_status`: `{"ou_id":1,"branch_id":1,"status":1,"upd_date":-1}`
- `list_archived_by_ou`: `{"ou_id":1,"status":1,"upd_date":-1}`

## Database: `zero-agent-invoice`

URI: `mongodb://<prod-host>/zero-agent-invoice?appName=agent-invoice`

### agent_fees

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "ou_id",
      "branch_id",
      "game_company_id",
      "game_main_cate_id",
      "cr_by",
      "cr_date",
      "cr_prog",
      "upd_by",
      "upd_date",
      "upd_prog"
    ],
    "properties": {
      "ou_id": {
        "bsonType": "objectId"
      },
      "branch_id": {
        "bsonType": "objectId"
      },
      "game_company_id": {
        "bsonType": "objectId"
      },
      "game_main_cate_id": {
        "bsonType": "objectId"
      },
      "gcomp_cost": {
        "bsonType": [
          "double",
          "int",
          "long"
        ]
      },
      "agent_known_fee": {
        "bsonType": [
          "double",
          "int",
          "long"
        ]
      },
      "agent_fee": {
        "bsonType": [
          "double",
          "int",
          "long"
        ]
      },
      "cr_by": {
        "bsonType": "string",
        "minLength": 1
      },
      "cr_date": {
        "bsonType": "date"
      },
      "cr_prog": {
        "bsonType": "string",
        "minLength": 1
      },
      "upd_by": {
        "bsonType": "string",
        "minLength": 1
      },
      "upd_date": {
        "bsonType": "date"
      },
      "upd_prog": {
        "bsonType": "string",
        "minLength": 1
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `ou_id_1_branch_id_1_game_company_id_1_game_main_cate_id_1`: `{"ou_id":1,"branch_id":1,"game_company_id":1,"game_main_cate_id":1}` (unique)

### agent_iv

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "iv_no",
      "ou_id",
      "branch_id",
      "billing_month"
    ],
    "properties": {
      "iv_no": {
        "bsonType": "string",
        "minLength": 1
      },
      "ou_id": {
        "bsonType": "objectId"
      },
      "branch_id": {
        "bsonType": "objectId"
      },
      "billing_month": {
        "bsonType": "string",
        "minLength": 1
      },
      "status": {
        "bsonType": "string"
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `invoice_uniq_iv_no`: `{"iv_no":1}` (unique)
- `invoice_by_ou_branch_month`: `{"ou_id":1,"branch_id":1,"billing_month":1}`

### agent_iv_transaction

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "ref_iv_id",
      "company_id",
      "main_category_id"
    ],
    "properties": {
      "ref_iv_id": {
        "bsonType": "objectId"
      },
      "company_id": {
        "bsonType": "objectId"
      },
      "main_category_id": {
        "bsonType": "objectId"
      },
      "ou_id": {
        "bsonType": "objectId"
      },
      "branch_id": {
        "bsonType": "objectId"
      },
      "fee": {
        "bsonType": [
          "double",
          "int",
          "long",
          "null"
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `txn_uniq_invoice_company_cate`: `{"ref_iv_id":1,"company_id":1,"main_category_id":1}` (unique)
- `txn_by_invoice`: `{"ref_iv_id":1,"fee":1}`

### agents

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "ou_id",
      "branch_id"
    ],
    "properties": {
      "ou_id": {
        "bsonType": "objectId"
      },
      "branch_id": {
        "bsonType": "objectId"
      },
      "branch_type": {
        "enum": [
          "MA",
          "AG",
          null
        ]
      },
      "active": {
        "bsonType": [
          "bool",
          "int",
          "long",
          "double",
          "null"
        ]
      },
      "parent_branch_id": {
        "bsonType": [
          "objectId",
          "null"
        ]
      },
      "ref_fee_branch_id": {
        "bsonType": [
          "objectId",
          "null"
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `ou_id_1_branch_id_1`: `{"ou_id":1,"branch_id":1}` (unique)

## Database: `zero-smart-report`

URI: `mongodb://<prod-host>/`

### download_history

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "reportId",
      "startedAt",
      "status"
    ],
    "properties": {
      "reportId": {
        "bsonType": "objectId"
      },
      "startedAt": {
        "bsonType": "date"
      },
      "finishedAt": {
        "bsonType": [
          "date",
          "null"
        ]
      },
      "status": {
        "bsonType": "string",
        "minLength": 1
      },
      "format": {
        "enum": [
          "csv",
          "excel",
          null
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `IDX_DOWNLOAD_HISTORY_REPORT_LIST`: `{"reportId":1,"startedAt":-1}`
- `IDX_DOWNLOAD_HISTORY_RECENT`: `{"startedAt":-1}`

### reports

**Validator:**
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "name",
      "script",
      "enabled"
    ],
    "properties": {
      "name": {
        "bsonType": "string",
        "minLength": 1
      },
      "script": {
        "bsonType": "string"
      },
      "enabled": {
        "bsonType": "bool"
      },
      "outputFormat": {
        "enum": [
          "csv",
          "excel",
          null
        ]
      },
      "params": {
        "bsonType": [
          "object",
          "null"
        ]
      }
    }
  }
}
```
validationLevel: `moderate`

**Indexes:**
- `_id_`: `{"_id":1}`
- `IDX_REPORTS_NAME_UNIQUE`: `{"name":1}` (unique)
- `IDX_REPORTS_ENABLED`: `{"enabled":1}`

