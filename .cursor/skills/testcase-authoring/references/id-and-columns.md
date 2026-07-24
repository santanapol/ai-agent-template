# IDs and columns

## ID shape (portable)

`PREFIX-SCENARIO-nn`

| Part | Meaning |
|------|---------|
| `PREFIX` | Zone / product area — **read from the repo’s catalogue or test-cases README** |
| `SCENARIO` | Short slice code (e.g. `SHOP`) — from repo tables |
| `nn` | Sequence **within that scenario file** |

### Numbering conventions (propose if repo has none)

| Range (typical) | Use |
|-----------------|-----|
| `01–09` | Core negatives / blockers |
| `10–19` | Core positives / UC |
| `20–29` | State / decision-table expansions (deep) |
| `30+` | Bug-hunt / risk rows |

Rules:

- Do **not** invent a fixed PREFIX table inside authored docs without repo/user confirmation.  
- `nn` is per file — do not share counters across scenario files.  
- Prefer stable IDs; avoid renumbering after automation titles exist.  
- Gaps are OK (leave room to insert).  

## Standard table columns

| Column | Author fills? | Notes |
|--------|---------------|--------|
| **ID** | Yes | Stable; must appear in automated test titles when Automated ≠ manual/deferred |
| **Slot** | Yes if catalogue exists | Traceability to coverage map |
| **Technique** | Yes | See [techniques.md](techniques.md) |
| **Case** | Yes | What is done / input (cite TD codes when Test data exists) |
| **Expected** | Yes | From product SoT, not current code — prefer HTTP + code/field when Spec defines them |
| **Spec/FR** | Yes when available | Pointer into oracle |
| **Automated** | Yes | See [levels-automated.md](levels-automated.md) |
| **Result** | **No** (leave blank or `—`) | Filled by `testcase-execution` only |

Optional sections: Fixture · Test data · recommended run order · Deep · Bug-hunt notes · Last run · Run summary (execution updates counts).

## Authoring rules

- Leave **Result** empty while authoring.  
- Do not change Expected to match failing implementation.  
- Stub may use shorter Expected; deep/bug-hunt should be precise enough to judge Pass/Fail without guessing.  
