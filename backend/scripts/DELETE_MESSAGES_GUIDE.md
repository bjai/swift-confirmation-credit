# Delete All Messages - Usage Guide

This guide provides **three methods** to delete all MT910 messages from the database.

---

## Method 1: HTTP API Endpoint (Recommended for UI)

**URL:** `DELETE http://localhost:3000/api/mt910/messages/delete-all`

**Request Body:**
```json
{
  "confirm": "DELETE_ALL"
}
```

**Response (on success):**
```json
{
  "deleted": 42,
  "message": "Successfully deleted 42 message(s) and reset the database sequence."
}
```

**Using curl:**
```bash
curl -X DELETE http://localhost:3000/api/mt910/messages/delete-all \
  -H "Content-Type: application/json" \
  -d '{"confirm":"DELETE_ALL"}'
```

**Using PowerShell:**
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/mt910/messages/delete-all" `
  -Method DELETE `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"confirm":"DELETE_ALL"}'
```

---

## Method 2: Direct SQL Script

**File:** `backend/scripts/delete-all-messages.sql`

Run against PostgreSQL database:

```bash
# Using psql
psql -U postgres -d swift_mt910 -f backend/scripts/delete-all-messages.sql

# Or connect to PostgreSQL and execute:
# \c swift_mt910
# \i backend/scripts/delete-all-messages.sql
```

**What it does:**
- Deletes all records from `mt910_messages` table
- Resets the auto-increment sequence to 1
- Shows the count of remaining records

---

## Method 3: TypeScript Code (For Node/NestJS scripts)

```typescript
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'your-password',
  database: 'swift_mt910',
  entities: ['src/**/*.entity.ts'],
  synchronize: false,
});

async function deleteAllMessages() {
  await dataSource.initialize();
  
  const result = await dataSource
    .createQueryBuilder()
    .delete()
    .from('mt910_messages')
    .execute();
  
  // Reset sequence
  await dataSource.query(
    'ALTER SEQUENCE mt910_messages_id_seq RESTART WITH 1'
  );
  
  console.log(`Deleted ${result.affected} messages`);
  await dataSource.destroy();
}

deleteAllMessages().catch(console.error);
```

---

## ⚠️ Warning

All three methods **permanently delete all message records**. This action **cannot be undone**. Make sure you have a backup if needed before proceeding.

---

## Safety Features

- **HTTP Endpoint:** Requires explicit confirmation token (`confirm: "DELETE_ALL"`) to prevent accidental deletion
- **SQL Script:** Includes warning comments at the top
- **Service Method:** Logs deleted count for audit trail

---

## What Gets Deleted

- ✅ All MT910 message records from `mt910_messages` table
- ✅ Auto-increment sequence reset to 1 (next ID will be 1)
- ✅ All related data: categories, qualifiers, sender info

**Not affected:**
- App settings (folders configuration)
- File watchers or scheduled jobs
