---
name: testcase-execution
description: >-
  Execute scenario testcases in any repo: discover prep and runners from project
  docs, run per Automated column, write Result/Last run/Run summary, optional
  reports. Use when running testcases, verifying a slice, recording
  Pass/Fail/Skip, or producing a test report. Works with no prior chat—repo
  discovery then skill references and target scenario files. Does not author new
  cases or change Expected except to record Fail against the documented oracle.
---

# Testcase execution

## Overview

Run existing scenario testcases and record **Result** / **Last run** / **Run summary**. The oracle for Pass/Fail is **Expected in the scenario** (and product SoT it cites)—not “what the code currently does.”

**Does not:** add or rewrite cases, change Expected to match code, or fix product bugs.

## Standalone rule

Do not rely on prior chat. Read [references/repo-discovery.md](references/repo-discovery.md), fill the **execute-first** discovery table, then read the references below and open the target scenario file(s). **Refuse** if discovery is incomplete for the requested scope (missing scenarios root, Automated column, or required runner/prep).

## Required reading

1. [references/repo-discovery.md](references/repo-discovery.md) — then discover  
2. [references/run-order.md](references/run-order.md) — including stop policy + `partial`  
3. [references/result-rules.md](references/result-rules.md) — Fail tags + write-back  
4. [references/examples-run.md](references/examples-run.md) — before/after Result  
5. [references/report-template.md](references/report-template.md) — only if user wants a report  

## Workflow

1. Discover testcase root, runbook/prep, and test commands.  
2. **Refuse** if the target has no rows or no Automated column → point to `testcase-authoring`.  
3. Resolve **scope**: files the user named, or every scenario file under a zone folder when the user names a zone (follow catalogue/README order when present).  
4. Prep environment per discovered runbook.  
5. Run in order: lower automated layers → higher → manual ([run-order.md](references/run-order.md)).  
6. Write Results using [result-rules.md](references/result-rules.md). If behavior ≠ Expected → **Fail** (do not edit Expected).  
7. Update Last run + Run summary on each touched file.  
8. Write a report under the repo’s reports path **only if the user asked**.  
9. Restore fixtures if the runbook requires it.  

## Do not

- Author new IDs or change Expected to match implementation  
- Mark Pass because “the code intends this” when Expected/SoT disagree  
- Fix product code (report Fail; user may invoke build/fix)  
- Assume a framework, port, or DB—use discovery  

## Done

- Every in-scope row has Result (or Skip with reason)  
- Last run + Run summary updated  
- Failures listed with ID + short evidence  
- Report written only if requested  
