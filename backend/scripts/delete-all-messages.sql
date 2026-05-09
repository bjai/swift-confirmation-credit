-- ============================================================================
-- Delete ALL MT910 Messages and Reset Sequence
-- ============================================================================
-- WARNING: This will permanently delete ALL message records from the database.
-- Use with caution in production environments.
-- ============================================================================

-- Delete all records from mt910_messages table
DELETE FROM mt910_messages;

-- Reset the auto-increment sequence to 1
ALTER SEQUENCE mt910_messages_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as remaining_records FROM mt910_messages;
