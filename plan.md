## Plan: MT910 Folder Ingestion + Table/Detail MVP

Deliver an MVP where NestJS automatically scans a configured inbound folder for MT910 TXT files, parses and stores data in PostgreSQL, then moves handled files to processed/error folders. Angular (Bootstrap) consumes APIs to show searchable/filterable table and detail views.

**Steps**
1. Phase 1 - Config and data model
2. Define folder-processing config via environment: INBOUND_DIR, PROCESSED_DIR, ERROR_DIR, POLL_INTERVAL_SEC, FILE_STABLE_WAIT_MS.
3. Finalize persisted MT910 fields from parser (references, sender/receiver BIC, amount/currency/date, raw payload, parse status).
4. Create migrations for file lifecycle tracking and parsed message tables plus search/filter indexes.
5. Phase 2 - Backend folder reader and lifecycle
6. Implement scheduled folder scanner service to detect new .txt files and ignore files still being written (stability check).
7. For each discovered file: create file-processing row, read content, split/parse MT910 message(s), persist records transactionally.
8. On successful processing, move file to processed folder; on failure, move to error folder with failure reason logged.
9. Add idempotency using file hash + file name + size + processed timestamp guard.
10. Add safe recovery for restart/retry (status-based reprocessing rules).
11. Phase 3 - APIs for frontend (explicit contract)
12. Build POST /api/mt910/uploads to support manual TXT upload (upload, parse, persist), in addition to folder auto-ingestion.
13. Build GET /api/mt910/messages with query params: page, pageSize, sortBy, sortDir, search, status, dateFrom, dateTo, currency, amountMin, amountMax, trn, senderBic, receiverBic.
14. Build GET /api/mt910/messages/:id returning normalized fields + raw_message + tags + validation_errors + file metadata.
15. Build GET /api/mt910/filters/meta returning status list, currency list, and min/max date bounds for filter UI.
16. Phase 4 - Angular Bootstrap UI (explicit pages)
17. Build Upload page (Bootstrap) wired to POST /api/mt910/uploads.
18. Build Table page (Bootstrap) with server-side pagination, filter panel, sort headers, and global search.
19. Build Detail page (Bootstrap cards/tabs) with header, financial fields, parties, raw text, and parse errors/warnings.
20. Optional: file-processing monitor page for inbound/processed/error lifecycle.
19. Phase 5 - Verification
20. Validate scanner behavior: inbound -> DB insert -> move to processed.
21. Validate failure behavior: parse/read failure -> error log -> move to error folder.
22. Validate list/detail APIs with combined filters and search.
23. Validate FE table/detail behavior against real seeded files.

**Relevant files**
- d:/uae/swift-confirmation-credit/backend/src/modules/folder-reader/folder-reader.service.ts - polling and file stability logic.
- d:/uae/swift-confirmation-credit/backend/src/modules/mt910/mt910-ingest.service.ts - parse + DB persistence pipeline.
- d:/uae/swift-confirmation-credit/backend/src/modules/mt910/mt910-query.service.ts - search/filter list and detail retrieval.
- d:/uae/swift-confirmation-credit/backend/src/modules/files/file-lifecycle.service.ts - move to processed/error and lifecycle statuses.
- d:/uae/swift-confirmation-credit/backend/src/database/migrations/* - schema and indexes.
- d:/uae/swift-confirmation-credit/frontend/src/app/features/mt910-table/* - Bootstrap table/filter/search.
- d:/uae/swift-confirmation-credit/frontend/src/app/features/mt910-detail/* - detail view.

**Verification**
1. Place sample TXT into inbound folder and confirm auto-processing without API upload.
2. Confirm file moves to processed folder after successful DB commit.
3. Inject malformed TXT and confirm move to error folder with failure reason.
4. Confirm list/detail APIs and frontend render expected data/filters/search.

**Decisions**
- Included: folder-based auto-ingestion, optional manual upload API, DB persistence, file move on completion, table/detail/search/filter APIs, Bootstrap FE upload/table/detail pages.
- Excluded: auth, external SWIFT gateway integration, notifications.
- Processing policy: successful parse+persist => processed folder; any terminal failure => error folder.

**Further Considerations**
1. Polling vs file watcher: start with polling for reliability on shared/network drives.
2. Concurrency: process one file at a time initially; scale to worker queue when volume grows.
3. Retention: define cleanup policy for processed/error folders and DB lifecycle logs.