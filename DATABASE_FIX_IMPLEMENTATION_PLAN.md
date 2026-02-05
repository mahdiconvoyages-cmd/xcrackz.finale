# 🔧 Database Inconsistencies - Fix Implementation Plan

**Status:** Ready for Implementation  
**Target Completion:** Should be done before next production release  
**Risk Level:** Medium (changes affect API contracts)

---

## 📋 Implementation Order

### Phase 1: Database Schema Fixes (CRITICAL)
### Phase 2: Type Definition Updates (Web App)
### Phase 3: Model/Service Updates (Flutter & Web)
### Phase 4: Testing & Validation

---

## ⚡ Phase 1: Database Schema Migrations

### 1.1 Fix INVOICES Table

**Current Issue**: Missing columns for payment tracking and relationships

```sql
-- File: supabase/migrations/20250205_fix_invoices_schema.sql

BEGIN;

-- Add missing columns to invoices
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_mission_id ON invoices(mission_id);

-- Update existing invoices to use sent_at = created_at for backwards compatibility
UPDATE invoices SET sent_at = created_at WHERE sent_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN invoices.client_id IS 'Reference to billing client (denormalized from client_name)';
COMMENT ON COLUMN invoices.mission_id IS 'Optional link to associated mission';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method used: check, transfer, card, cash, etc.';
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when payment was received';
COMMENT ON COLUMN invoices.sent_at IS 'Timestamp when invoice was sent to client';

COMMIT;
```

**Backend Compatibility**:
- New columns are nullable - won't break existing code
- Add application logic to populate `client_id` when setting client_name
- Add `sent_at` when status changes to 'sent'

---

### 1.2 Fix QUOTES Table

**Current Issue**: Same as invoices - missing relationships and tracking fields

```sql
-- File: supabase/migrations/20250205_fix_quotes_schema.sql

BEGIN;

-- Add missing columns to quotes
ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mission_id ON quotes(mission_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice ON quotes(converted_invoice_id);

-- Update existing quotes: set sent_at = created_at for backwards compatibility
UPDATE quotes SET sent_at = created_at WHERE sent_at IS NULL;

-- Add documentation
COMMENT ON COLUMN quotes.client_id IS 'Reference to billing client';
COMMENT ON COLUMN quotes.mission_id IS 'Optional link to associated mission';
COMMENT ON COLUMN quotes.client_phone IS 'Client phone number';
COMMENT ON COLUMN quotes.terms IS 'Quote terms and conditions';
COMMENT ON COLUMN quotes.sent_at IS 'When quote was sent to client';
COMMENT ON COLUMN quotes.accepted_at IS 'When quote was accepted by client';
COMMENT ON COLUMN quotes.rejected_at IS 'When quote was rejected by client';
COMMENT ON COLUMN quotes.converted_at IS 'When quote was converted to invoice';
COMMENT ON COLUMN quotes.converted_invoice_id IS 'ID of invoice created from this quote';

COMMIT;
```

---

### 1.3 Fix MISSIONS Table

**Current Issues**:
- Missing city/postal code fields
- Duplicate vehicle_plate columns
- Missing completion tracking
- Missing public_tracking_link column
- scheduler vs actual time confusion

```sql
-- File: supabase/migrations/20250205_fix_missions_schema.sql

BEGIN;

-- Step 1: Add missing location fields
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS pickup_city TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city TEXT,
  ADD COLUMN IF NOT EXISTS pickup_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS public_tracking_link TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Step 2: Standardize vehicle_plate field
-- If vehicle_license_plate exists, migrate data to vehicle_plate
DO $$ 
BEGIN
  -- Check if column exists and migrate if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'vehicle_license_plate'
  ) THEN
    UPDATE missions 
    SET vehicle_plate = vehicle_license_plate 
    WHERE vehicle_plate IS NULL AND vehicle_license_plate IS NOT NULL;
    
    -- Drop the duplicate column after migration
    ALTER TABLE missions DROP COLUMN vehicle_license_plate;
  END IF;
END $$;

-- Step 3: Add missing timestamp for when mission starts
-- Default to pickup date if available
UPDATE missions 
SET started_at = scheduled_pickup 
WHERE started_at IS NULL AND scheduled_pickup IS NOT NULL;

-- Step 4: Add missing completion timestamp
-- For completed missions, use updated_at if exists
UPDATE missions 
SET completed_at = updated_at 
WHERE completed_at IS NULL AND status = 'completed';

-- Step 5: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_missions_public_tracking_link ON missions(public_tracking_link);
CREATE INDEX IF NOT EXISTS idx_missions_completed_at ON missions(completed_at);

-- Step 6: Documentation
COMMENT ON COLUMN missions.pickup_city IS 'City name for pickup location (denormalized from address)';
COMMENT ON COLUMN missions.delivery_city IS 'City name for delivery location (denormalized from address)';
COMMENT ON COLUMN missions.pickup_postal_code IS 'Postal code for pickup location (denormalized)';
COMMENT ON COLUMN missions.delivery_postal_code IS 'Postal code for delivery location (denormalized)';
COMMENT ON COLUMN missions.public_tracking_link IS 'Sharable link for public mission tracking';
COMMENT ON COLUMN missions.completed_at IS 'Timestamp when mission was marked complete';
COMMENT ON COLUMN missions.started_at IS 'Timestamp when mission actually started';

COMMIT;
```

---

### 1.4 Fix VEHICLE_INSPECTIONS Table

**Current Issues**:
- Missing signature metadata (name, date)
- Web app incorrectly uses `fuel_level` as string
- Inconsistent naming for mileage

```sql
-- File: supabase/migrations/20250205_fix_vehicle_inspections.sql

BEGIN;

-- Step 1: Add missing signature tracking fields
ALTER TABLE vehicle_inspections
  ADD COLUMN IF NOT EXISTS inspector_name TEXT,
  ADD COLUMN IF NOT EXISTS inspector_signature_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS client_signature_date TIMESTAMPTZ;

-- Step 2: Validate fuel_level is integer, not string
-- This is already correct in DB, but web service has a bug
-- (Web service should be fixed in Phase 3)

-- Step 3: Add documentation
COMMENT ON COLUMN vehicle_inspections.inspector_name IS 'Name of person who performed inspection';
COMMENT ON COLUMN vehicle_inspections.inspector_signature_date IS 'Timestamp when inspector signed';
COMMENT ON COLUMN vehicle_inspections.client_signature_name IS 'Name of client who signed';
COMMENT ON COLUMN vehicle_inspections.client_signature_date IS 'Timestamp when client signed';

COMMIT;
```

---

### 1.5 Standardize Status Values

Create enum types for status fields to ensure consistency across all tables:

```sql
-- File: supabase/migrations/20250205_create_status_enums.sql

BEGIN;

-- Create ENUM types for status fields
-- MISSION_STATUS
DO $$ 
BEGIN
  CREATE TYPE mission_status AS ENUM (
    'draft',
    'pending',
    'in_progress',
    'completed',
    'cancelled',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- INSPECTION_STATUS
DO $$ 
BEGIN
  CREATE TYPE inspection_status AS ENUM (
    'in_progress',
    'completed',
    'validated'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- INVOICE_STATUS
DO $$ 
BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- QUOTE_STATUS
DO $$ 
BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;
```

---

## 🔧 Phase 2: Web App Type Definitions

### 2.1 Create billing.ts Types

**File**: `src/types/billing.ts`

```typescript
// Invoice type matching both database and Flutter model
export interface Invoice {
  id?: string;
  user_id: string;
  client_id?: string | null;
  mission_id?: string | null;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  client_siret?: string;
  issue_date: string; // ISO date
  due_date: string;   // ISO date
  sent_at?: string;   // ISO timestamp
  paid_at?: string;   // ISO timestamp
  payment_method?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  items: InvoiceItem[];
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  amount: number;
}

export interface Quote {
  id?: string;
  user_id: string;
  client_id?: string | null;
  mission_id?: string | null;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  client_siret?: string;
  issue_date: string;
  valid_until: string;
  sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  converted_at?: string;
  converted_invoice_id?: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  terms?: string;
  items: QuoteItem[];
  created_at?: string;
  updated_at?: string;
}

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  amount: number;
}
```

**Update**: `src/types/index.ts`

```typescript
// Add to existing file
export * from './billing';

// Update Inspection interface - fix fuel_level type
export interface Inspection {
  id: string;
  mission_id: string;
  type: 'departure' | 'arrival';
  vehicle_mileage: number;
  fuel_level: number; // ✅ CHANGED: was string, now number
  exterior_condition?: string;
  interior_condition?: string;
  notes?: string;
  damages?: any;
  inspector_signature?: string;
  inspector_name?: string;
  inspector_signature_date?: string;
  client_signature?: string;
  client_signature_name?: string;
  client_signature_date?: string;
  location_latitude?: number;
  location_longitude?: number;
  location_address?: string;
  inspected_at: string;
  created_at: string;
  updated_at?: string;
  status?: 'in_progress' | 'completed' | 'validated';
}
```

---

## 🎯 Phase 3: Code Updates

### 3.1 Flutter Model Updates

**File**: [mobile_flutter/finality_app/lib/models/mission.dart](mobile_flutter/finality_app/lib/models/mission.dart)

**Changes**: Already mostly correct, add these:
- Add `pickupCity`, `deliveryCity` (already in model ✅)
- Update serialization to map these if present

```dart
// Already correct in Mission model
// No changes needed - Flutter model properly handles these

// But ensure toJson() includes them if they come from DB:
final Map<String, dynamic> json = {
  // ... existing fields
  'public_tracking_link': publicTrackingLink,  // ✅ Add this
  'completed_at': completedAt?.toIso8601String(), // ✅ Add this if used
};
```

**File**: [mobile_flutter/finality_app/lib/models/invoice.dart](mobile_flutter/finality_app/lib/models/invoice.dart)

```dart
// Update to include new fields
class Invoice {
  final String? id;
  final String userId;
  final String? clientId;    // ✅ Add: now maps to DB
  final String? missionId;   // ✅ Add: now maps to DB
  final String invoiceNumber;
  final DateTime invoiceDate;
  final DateTime? dueDate;
  final DateTime? sentAt;    // ✅ Add: new DB column
  final DateTime? paidAt;    // ✅ Add: new DB column
  final String status;
  final String? paymentMethod; // ✅ Add: new tracking field
  final double subtotal;
  final double taxRate;
  final double taxAmount;
  final double total;
  final String? notes;
  final List<InvoiceItem> items;
  final Map<String, dynamic>? clientInfo;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // ... constructor, fromJson, toJson methods update accordingly
}
```

**File**: [mobile_flutter/finality_app/lib/models/quote.dart](mobile_flutter/finality_app/lib/models/quote.dart)

```dart
// Update similar to Invoice
class Quote {
  final String? id;
  final String quoteNumber;
  final String userId;
  final String? clientId;           // ✅ Add
  final String? missionId;          // ✅ Add
  final String? clientName;
  final String? clientEmail;
  final String? clientPhone;        // ✅ Add: now in DB
  final String? clientAddress;
  final DateTime quoteDate;
  final DateTime? validUntil;
  final DateTime? sentAt;           // ✅ Add
  final DateTime? acceptedAt;       // ✅ Add
  final DateTime? rejectedAt;       // ✅ Add
  final DateTime? convertedAt;      // ✅ Add
  final String? convertedInvoiceId; // ✅ Add
  final List<QuoteItem> items;
  final double subtotal;
  final double taxRate;
  final double taxAmount;
  final double total;
  final String? notes;
  final String? terms;              // ✅ Add: now in DB
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // ... update fromJson/toJson
}
```

---

### 3.2 Web Service Updates

**File**: `src/services/missionService.ts`

```typescript
// Update Inspection interface
export interface Inspection {
  id: string;
  mission_id: string;
  type: 'departure' | 'arrival';
  vehicle_mileage: number;
  fuel_level: number; // ✅ CRITICAL: was string, change to number
  exterior_condition?: string;
  interior_condition?: string;
  notes?: string;
  damages?: any;
  inspector_signature?: string;
  inspector_name?: string;           // ✅ Add
  inspector_signature_date?: string; // ✅ Add
  client_signature?: string;
  client_signature_name?: string;    // ✅ Add
  client_signature_date?: string;    // ✅ Add
  location_latitude?: number;
  location_longitude?: number;
  location_address?: string;
  inspected_at: string;
  created_at: string;
  updated_at?: string;
  status?: 'in_progress' | 'completed' | 'validated'; // ✅ Add
  completion_at?: string; // Make sure this is mapped from DB
}

// When fetching inspections, ensure fuel_level is parsed as number:
const { data, error } = await supabase
  .from('vehicle_inspections')
  .select('*')
  .eq('mission_id', missionId);

if (data) {
  data.forEach(inspection => {
    // ✅ Ensure fuel_level is number, not string
    if (typeof inspection.fuel_level === 'string') {
      inspection.fuel_level = parseInt(inspection.fuel_level, 10);
    }
  });
}
```

**File**: `src/services/invoiceService.ts` (NEW FILE if doesn't exist)

```typescript
import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceItem } from '../types/billing';

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoiceData])
    .select()
    .single();

  if (error) {
    console.error('Error creating invoice:', error);
    return null;
  }
  return data;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  paidAt?: Date
): Promise<boolean> {
  const updates: any = { status };
  
  if (status === 'sent') {
    updates.sent_at = new Date().toISOString();
  } else if (status === 'paid' && paidAt) {
    updates.paid_at = paidAt.toISOString();
  }

  const { error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId);

  return !error;
}
```

---

### 3.3 Data Validation & Mapping

**Create**: `src/utils/dataMappers.ts`

```typescript
// Handle the conversion between app models and database schema

export interface FieldMapping {
  [appName: string]: string; // appName -> dbColumnName
}

// Mission field mappings
export const missionMapping: FieldMapping = {
  pickupAddress: 'pickup_address',
  deliveryAddress: 'delivery_address',
  pickupCity: 'pickup_city',
  deliveryCity: 'delivery_city',
  pickupPostalCode: 'pickup_postal_code',
  deliveryPostalCode: 'delivery_postal_code',
  pickupLat: 'pickup_lat',
  pickupLng: 'pickup_lng',
  deliveryLat: 'delivery_lat',
  deliveryLng: 'delivery_lng',
  vehicleBrand: 'vehicle_brand',
  vehicleModel: 'vehicle_model',
  vehiclePlate: 'vehicle_plate',
  vehicleVin: 'vehicle_vin',
  driverId: 'driver_id',
  publicTrackingLink: 'public_tracking_link',
  completedAt: 'completed_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Inspection field mappings
export const inspectionMapping: FieldMapping = {
  missionId: 'mission_id',
  inspectorId: 'inspector_id',
  inspectionType: 'inspection_type',
  overallCondition: 'overall_condition',
  fuelLevel: 'fuel_level',
  mileageKm: 'mileage_km',
  clientName: 'client_name',
  inspectorSignature: 'inspector_signature',
  clientSignature: 'client_signature',
  locationAddress: 'location_address',
  completedAt: 'completed_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Utility functions
export function mapToDatabase<T>(
  appData: any,
  mapping: FieldMapping
): Partial<T> {
  const dbData: any = {};
  for (const [appKey, dbKey] of Object.entries(mapping)) {
    if (appKey in appData) {
      dbData[dbKey] = appData[appKey];
    }
  }
  return dbData;
}

export function mapFromDatabase<T>(
  dbData: any,
  mapping: FieldMapping
): Partial<T> {
  const appData: any = {};
  for (const [appKey, dbKey] of Object.entries(mapping)) {
    if (dbKey in dbData) {
      appData[appKey] = dbData[dbKey];
    }
  }
  return appData;
}
```

---

## ✅ Phase 4: Testing Checklist

### 4.1 Database Tests

- [ ] All migrations apply cleanly:
  ```sql
  SELECT * FROM pg_stat_statements WHERE query LIKE '%ALTER TABLE%';
  ```

- [ ] Backwards compatibility - old code still works:
  - [ ] Invoices created without `client_id` work
  - [ ] Quotes created without conversion fields work
  - [ ] Missions work without city/postal code fields

- [ ] New fields properly indexed for performance

### 4.2 Flutter App Tests

- [ ] Invoice model correctly serializes new fields
- [ ] Quote model correctly serializes new fields
- [ ] Mission model handles city/postal code fields
- [ ] All optional fields handled gracefully

```dart
// Test case example
test('Invoice serialization includes new fields', () {
  final invoice = Invoice(
    id: 'test-id',
    userId: 'user-id',
    clientId: 'client-id',  // New field
    missionId: 'mission-id', // New field
    // ... other fields
  );
  
  final json = invoice.toJson();
  expect(json['client_id'], 'client-id');
  expect(json['mission_id'], 'mission-id');
});
```

### 4.3 Web App Tests

- [ ] `fuel_level` parsed as number, not string
- [ ] Invoice/Quote types properly defined
- [ ] All inspections handled with new fields
- [ ] Type checking passes with new types

```typescript
// Test case example
test('Inspection fuel level is number', () => {
  const inspection: Inspection = {
    id: 'test',
    mission_id: 'mission-id',
    type: 'departure',
    vehicle_mileage: 50000,
    fuel_level: 75, // Must be number
    // ...
  };
  
  expect(typeof inspection.fuel_level).toBe('number');
});
```

### 4.4 API Contract Tests

- [ ] Existing API endpoints return new fields
- [ ] New fields have correct types
- [ ] Backwards compatibility maintained (old clients still work)

```bash
# Test retrieving mission with new fields
curl 'http://localhost:3000/api/missions/mission-id' \
  -H 'Authorization: Bearer $TOKEN'

# Should include:
# ✅ pickup_city, delivery_city, pickup_postal_code, delivery_postal_code
# ✅ public_tracking_link, completed_at, started_at
```

### 4.5 Cross-App Sync Tests

- [ ] Flutter reads invoice with all new fields
- [ ] Web reads inspection with all new fields
- [ ] Both apps handle missing (null) optional fields
- [ ] Data created in Flutter displays correctly in Web

---

## ⚠️ Rollback Strategy

If issues occur after deployment:

### 1. Quick Rollback (Database only)
```sql
-- Revert last migration
DROP MIGRATION 20250205_fix_invoices_schema;
DROP MIGRATION 20250205_fix_quotes_schema;
-- etc...
```

### 2. Soft Rollback (App level)
- Deploy previous app version that doesn't use new fields
- Leave database columns in place (they'll be NULL)
- Gradually migrate data once issues resolved

### 3. Full Rollback
- Restore from backup
- Redeploy previous app version
- Investigation and retry

---

## 📊 Implementation Metrics

| Metric | Target | Status |
|--------|--------|--------|
| SQL migrations pass | 100% | 🔄 Pending |
| TypeScript compilation errors | 0 | 🔄 Pending |
| Flutter build warnings | 0 | 🔄 Pending |
| API contract maintained | Yes | 🔄 Pending |
| Test coverage | >90% | 🔄 Pending |

---

## 📝 Sign-Off Checklist

- [ ] Database migrations reviewed by DBA
- [ ] Flutter models tested on device
- [ ] Web app TypeScript errors cleared
- [ ] All tests passing (unit, integration, E2E)
- [ ] Deployment plan documented
- [ ] Rollback procedure tested
- [ ] Team trained on new fields/changes

---

## 🚀 Deployment Steps

1. **Pre-deployment** (t-0)
   - Backup production database
   - Review migration files
   - Prepare rollback scripts

2. **Deployment Window** (t+0)
   - Run database migrations
   - Deploy web app with new types
   - Deploy Flutter app update

3. **Post-deployment** (t+5min)
   - Verify new fields appear in API
   - Check web app loads without errors
   - Monitor error logs

4. **Validation** (t+1hr)
   - Test invoice/quote creation
   - Test mission updates
   - Test inspection data flow

