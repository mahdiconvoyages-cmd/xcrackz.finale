# 🔍 Database Schema & App Models Inconsistencies Report

**Analysis Date:** February 5, 2026  
**Scope:** Comparing Supabase database schema, Flutter app models, and Next.js web app type definitions

---

## 📋 Executive Summary

Found **35+ field inconsistencies** across 4 major tables:
- **MISSIONS**: 10 inconsistencies
- **VEHICLE_INSPECTIONS**: 8 inconsistencies  
- **INVOICES**: 7 inconsistencies
- **QUOTES**: 6 inconsistencies

**Critical Issues:**
- Field naming inconsistencies (snake_case vs camelCase)
- Missing fields in app models that exist in DB
- Missing columns in DB that app assumes exist
- Type mismatches between apps and DB
- Missing invoice/quote models in web app type definitions

---

## 1️⃣ MISSIONS TABLE

### Database Current Schema
```sql
-- From init_schema.sql and supabase migrations
id, reference, title, status
pickup_address, delivery_address, distance_km
pickup_lat, pickup_lng, delivery_lat, delivery_lng
scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery
vehicle_make, vehicle_model, vehicle_year, vehicle_vin, vehicle_license_plate
creator_id, assigned_to
archived, created_at, updated_at

-- From enhanced migrations
vehicle_brand, vehicle_plate, vehicle_image_url, price
client_name, client_phone, client_email
pickup_contact_name, pickup_contact_phone
delivery_contact_name, delivery_contact_phone
report_id, share_code, assigned_user_id
```

### 🚨 Inconsistencies Identified

#### **1.1 Missing Fields in Flutter Model**
| DB Column | Flutter Model | Issue |
|-----------|---------------|-------|
| `scheduled_pickup` | ❌ Missing | DB has this but Flutter uses `pickupDate` with different semantics |
| `scheduled_delivery` | ❌ Missing | DB has this but Flutter uses `deliveryDate` |
| `actual_pickup` | ❌ Missing | No mapping in Flutter |
| `actual_delivery` | ❌ Missing | No mapping in Flutter |
| `distance_km` | ❌ Missing | Web has `distance` (different units/naming) |
| `vehicle_make` | ✅ Mapped as `vehicleBrand` | Good |
| `vehicle_year` | ✅ Not used in Flutter | OK - optional |
| `creator_id` | ❌ Missing | Flutter doesn't track mission creator |
| `assigned_to` | ✅ Mapped as `driverId` | Could be confused with assignment |
| `archived` | ❌ Missing | Flutter doesn't use this status |
| `publicTrackingLink` | ❌ In Flutter but in DB as `public_tracking_link` | Not in DB schema review; MISSING DB COLUMN |

#### **1.2 Field Naming Mismatches**
| Entity | DB Name | Flutter Name | Web Name | Issue |
|--------|---------|--------------|----------|-------|
| Vehicle Brand | `vehicle_brand` | `vehicleBrand` | `vehicle_brand` | camelCase vs snake_case |
| Vehicle Model | `vehicle_model` | `vehicleModel` | `vehicle_model` | camelCase vs snake_case |
| Vehicle Plate | `vehicle_license_plate` / `vehicle_plate` | `vehiclePlate` | `vehicle_plate` | DB inconsistent (has both names) |
| Pickup Address | `pickup_address` | `pickupAddress` | `pickup_address` | camelCase vs snake_case |
| Pickup City | N/A | `pickupCity` | N/A | **Flutter ONLY** - not in DB |
| Delivery City | N/A | `deliveryCity` | N/A | **Flutter ONLY** - not in DB |
| Pickup Postal Code | N/A | `pickupPostalCode` | N/A | **Flutter ONLY** - not in DB |
| Delivery Postal Code | N/A | `deliveryPostalCode` | N/A | **Flutter ONLY** - not in DB |

#### **1.3 Field Type Mismatches**
| Field | DB Type | Flutter Type | Web Type | Issue |
|-------|---------|--------------|----------|-------|
| `price` | `numeric` | `double?` | `number` | Should be consistent numeric type |
| `distance_km` | `numeric` | ❌ Missing | `number` as `distance` | Different units/semantics |
| `pickup_lat/lng` | `numeric` | `double?` | `number?` | Precision: DB decimal(10,8) vs double |
| `vehicle_year` | `integer` | ❌ Not mapped | N/A | Flask doesn't use it |

#### **1.4 Created/Updated Timestamps**
- ✅ All three (DB, Flutter, Web) have `created_at` and `updated_at`
- ⚠️ **Issue**: No `completed_at` or `closed_at` field despite mission lifecycle states

### 🔧 Recommendations for MISSIONS

1. **Add missing columns to DB** (if Flutter/Web expect them):
   - `pickup_city`, `delivery_city`, `pickup_postal_code`, `delivery_postal_code`
   - `public_tracking_link` (if used by web app)

2. **Clean up vehicle field naming** in DB:
   - Remove duplicate `vehicle_plate` and `vehicle_license_plate` - use ONE
   - Decide on consistent naming

3. **Clarify pickup/delivery semantics**:
   - Determine if `scheduled_*` vs `actual_*` distinction is needed
   - Or if `pickupDate`/`deliveryDate` are sufficient

4. **Add completion tracking**:
   - Add `completed_at` timestamp to track when missions finish
   - Add `started_at` to track when mission begins

---

## 2️⃣ VEHICLE_INSPECTIONS TABLE

### Database Current Schema
```sql
id, mission_id, inspector_id, inspection_type
vehicle_info (JSONB), overall_condition
fuel_level, mileage_km
damages (JSONB), notes
inspector_signature, client_signature
client_name
latitude, longitude, location_address
status, completed_at
created_at, updated_at
```

### 🚨 Inconsistencies Identified

#### **2.1 Missing Fields in Web Service**
| DB Column | Web Service | Issue |
|-----------|-------------|-------|
| `vehicle_info` | ❌ Missing | DB stores as JSONB but web doesn't use |
| `overall_condition` | ❌ Missing | Web uses `exterior_condition` + `interior_condition` instead |
| `mileage_km` | ❌ Missing | Web uses `vehicle_mileage` (same meaning, different field) |
| `latitude`, `longitude` | ✅ Mapped | Clean: web has `location_latitude/longitude` |
| `completed_at` | ❌ Missing | Web has `inspected_at` instead |
| `status` | ❌ Missing | Web doesn't track inspection status |
| `client_name` | ✅ Mapped | Good |

#### **2.2 Web Service Has Fields DB Doesn't Define**
| Web Field | DB Column | Issue |
|-----------|-----------|-------|
| `vehicle_mileage` | `mileage_km` | ⚠️ Same meaning, different name |
| `fuel_level` | `fuel_level` | ✅ Match but type mismatch below |
| `exterior_condition` | ❌ NOT IN DB | **Web invents this field** |
| `interior_condition` | ❌ NOT IN DB | **Web invents this field** |
| `inspected_at` | ❌ NOT IN DB | **Web invents this field** |

#### **2.3 Field Name Inconsistencies**
| Field | DB Name | Flutter Name | Web Name | Issue |
|-------|---------|--------------|----------|-------|
| Inspection Method | `inspection_type` | `inspectionType` | `type` | ✅ Consistent semantics, different syntax |
| Mileage | `mileage_km` | `mileageKm` | `vehicle_mileage` | ⚠️ Different field names for same data |
| Overall Condition | `overall_condition` | `overallCondition` | N/A (split into exterior/interior) | ❌ Different data model |
| Fuel Level | `fuel_level` (int) | `fuelLevel` (int?) | `fuel_level` (string) | ❌ **TYPE MISMATCH: string vs int** |

#### **2.4 Type Mismatches**
| Field | DB Type | Flutter Type | Web Type | Issue |
|-------|---------|--------------|----------|-------|
| `fuel_level` | `integer` | `int?` | `string` | ⚠️ **CRITICAL: string in web should be int** |
| `mileage_km` | `integer` | `int?` | `number` | ✅ OK |
| `damages` | `JSONB` | `List<Map>?` | `any` | Different structure |
| `vehicle_info` | `JSONB` | `Map<String, dynamic>?` | N/A | Web doesn't use |
| `latitude/longitude` | `decimal(10,8)` | `double?` | `number?` | ✅ OK for small precision differences |

#### **2.5 Missing Signature Name Tracking**
- DB: `inspector_signature`, `client_signature` (URL/base64 string)
- Flutter: Same ✅
- Web: Same ✅
- ⚠️ **Issue**: No `inspector_name` or `signature_date` fields to track who signed and when

### 🔧 Recommendations for VEHICLE_INSPECTIONS

1. **Fix fuel_level type** in web service:
   - Change from `string` to `number` or `integer`
   - Clarify units (0-100%, absolute liters, etc.)

2. **Standardize condition fields**:
   - Either use single `overall_condition` (like DB/Flutter)
   - Or add `exterior_condition` and `interior_condition` to DB if web really needs them

3. **Add missing DB columns**:
   - `inspector_name` - to track who performed inspection
   - `signature_date` - when signatures were captured
   - `location_address` is good ✅

4. **Consolidate mileage field naming**:
   - Standardize to `mileage_km` instead of `vehicle_mileage`

5. **Status field**:
   - Good that DB tracks it; ensure web respects valid states
   - Valid states: `'in_progress'`, `'completed'`, `'validated'`

---

## 3️⃣ INVOICES TABLE

### Database Current Schema
```sql
id, user_id, invoice_number
client_name, client_email, client_address, client_siret
issue_date, due_date
status (draft, sent, paid, overdue, cancelled)
subtotal, tax_rate, tax_amount, total
notes, payment_terms
created_at, updated_at
```

### 🚨 Inconsistencies Identified

#### **3.1 Missing DB Columns that Flutter Uses**
| Flutter Field | DB Column | Issue |
|---------------|-----------|-------|
| `clientId` | ❌ Missing | Flutter links invoice to billing client; DB only stores name |
| `missionId` | ❌ Missing | Flutter can link invoice to mission; DB doesn't support this |
| `paymentMethod` | ❌ Missing | Flutter tracks payment method; DB doesn't |
| `paidAt` | ❌ Missing | Flutter tracks payment date; DB only has due_date |
| `items` | ✅ Exists | Related table: `invoice_items` |
| `clientInfo` | ✅ Manual | Stored as JSON object in Flutter |

#### **3.2 Missing Flutter Fields that DB Has**
| DB Column | Flutter Field | Issue |
|-----------|---------------|-------|
| `payment_terms` | ❌ Missing | DB stores default terms; Flutter doesn't use |

#### **3.3 Field Type Mismatches**
| Field | DB Type | Flutter Type | Issue |
|-------|---------|--------------|-------|
| `issue_date` | `date` | `DateTime` | ✅ Compatible (can convert) |
| `due_date` | `date` | `DateTime` | ✅ Compatible |
| `subtotal` | `decimal(10,2)` | `double` | ✅ OK |
| `tax_rate` | `decimal(5,2)` | `double` | ✅ OK |
| `tax_amount` | `decimal(10,2)` | `double` | ✅ OK |
| `total` | `decimal(10,2)` | `double` | ✅ OK |

#### **3.4 Web App Issue: NO INVOICE TYPE DEFINED**
- Web app's `src/types/index.ts` does NOT include Invoice or Quote types
- Web services exist (searching revealed references) but type definition missing
- ❌ **This means web app may have type safety issues**

#### **3.5 Missing Status Tracking**
- DB status values: `'draft'`, `'sent'`, `'paid'`, `'overdue'`, `'cancelled'`
- Flutter status: `'pending'`, `'paid'`, `'overdue'`, `'cancelled'`
- ⚠️ **Inconsistency**: `'draft'`/`'sent'` vs `'pending'` semantics differ

### 🔧 Recommendations for INVOICES

1. **Add missing DB columns**:
   ```sql
   ALTER TABLE invoices ADD COLUMN client_id UUID REFERENCES billing_clients(id);
   ALTER TABLE invoices ADD COLUMN mission_id UUID REFERENCES missions(id);
   ALTER TABLE invoices ADD COLUMN payment_method TEXT;
   ALTER TABLE invoices ADD COLUMN paid_at TIMESTAMPTZ;
   ```

2. **Standardize status values**:
   - Align on: `'draft'`, `'sent'`, `'paid'`, `'overdue'`, `'cancelled'`
   - OR: `'pending'`, `'paid'`, `'overdue'`, `'cancelled'` (drop draft/sent distinction)

3. **Add Invoice/Quote types to web app**:
   - Create `src/types/billing.ts` or extend `src/types/index.ts`
   - Define proper TypeScript interfaces for type safety

4. **Track invoice lifecycle dates**:
   - Good: `issue_date`, `due_date`, `created_at`
   - Add: `sent_at`, `paid_at` to track state transitions

---

## 4️⃣ QUOTES TABLE

### Database Current Schema
```sql
id, user_id, quote_number
client_name, client_email, client_address, client_siret
issue_date, valid_until
status (draft, sent, accepted, rejected, expired)
subtotal, tax_rate, tax_amount, total
notes
created_at, updated_at
```

### 🚨 Inconsistencies Identified

#### **4.1 Missing DB Columns that Flutter Uses**
| Flutter Field | DB Column | Issue |
|---------------|-----------|-------|
| `clientId` | ❌ Missing | Flutter links to billing client; DB only name |
| `missionId` | ❌ Missing | Flutter can link to mission |
| `clientPhone` | ❌ Missing | DB has email but not phone |
| `terms` | ❌ Missing | Flutter can store quote terms; DB doesn't |
| `sentAt` | ❌ Missing | Flutter tracks send date |
| `acceptedAt` | ❌ Missing | Flutter tracks acceptance date |
| `rejectedAt` | ❌ Missing | Flutter tracks rejection date |
| `convertedAt` | ❌ Missing | Flutter tracks conversion to invoice |
| `convertedInvoiceId` | ❌ Missing | Flutter can link converted invoice |

#### **4.2 Field Name Differences**
| Field | DB Name | Flutter Name | Issue |
|-------|---------|--------------|-------|
| Quote Date | `issue_date` | `quoteDate` | ✅ Semantically equivalent |
| Valid Until | `valid_until` | `validUntil` | ✅ Match (name only) |

#### **4.3 Field Type Mismatches**
| Field | DB Type | Flutter Type | Issue |
|-------|---------|--------------|-------|
| `issue_date` | `date` | `DateTime` | ✅ Compatible |
| `valid_until` | `date` | `DateTime` | ✅ Compatible |
| `subtotal` | `decimal(10,2)` | `double` | ✅ OK |
| `status` | `text`[5 values] | `String` | ✅ OK but check values match |

#### **4.4 Missing Web App Type Definition**
- Like invoices, web app has no proper Quote type
- ❌ **Type safety issue in web app**

#### **4.5 Status Value Inconsistencies**
| DB Status | Flutter Uses | Issue |
|-----------|--------------|-------|
| `'draft'` | ✅ | ✅ Match |
| `'sent'` | ✅ | ✅ Match |
| `'accepted'` | ✅ | ✅ Match |
| `'rejected'` | ✅ | ✅ Match |
| `'expired'` | ❌ | Flutter doesn't check expiration |

### 🔧 Recommendations for QUOTES

1. **Add missing DB columns**:
   ```sql
   ALTER TABLE quotes ADD COLUMN client_id UUID REFERENCES billing_clients(id);
   ALTER TABLE quotes ADD COLUMN mission_id UUID REFERENCES missions(id);
   ALTER TABLE quotes ADD COLUMN client_phone TEXT;
   ALTER TABLE quotes ADD COLUMN terms TEXT;
   ALTER TABLE quotes ADD COLUMN sent_at TIMESTAMPTZ;
   ALTER TABLE quotes ADD COLUMN accepted_at TIMESTAMPTZ;
   ALTER TABLE quotes ADD COLUMN rejected_at TIMESTAMPTZ;
   ALTER TABLE quotes ADD COLUMN converted_at TIMESTAMPTZ;
   ALTER TABLE quotes ADD COLUMN converted_invoice_id UUID REFERENCES invoices(id);
   ```

2. **Define Quote type in web app**:
   ```typescript
   export interface Quote {
     id: string;
     user_id: string;
     quote_number: string;
     // ... fields matching Flutter model
   }
   ```

3. **Implement quote expiration logic**:
   - Add validation to check if quote is expired (valid_until < today)
   - Return status as expired if applicable

---

## 5️⃣ INSPECTION_PHOTOS TABLE

### ✅ Status: Mostly Consistent

The inspection photos handling is relatively good:
- DB: `inspection_photos` table with `photo_url`, `photo_type`, timestamps
- Flutter: Uses photo references but loads from storage
- Web: Similar approach

⚠️ **Minor Issues:**
- Photo categorization differs between apps (web has ENUM constraint, Flutter is flexible)
- No consistent photo annotation storage

---

## 6️⃣ CROSS-TABLE INCONSISTENCIES

### 6.1 Foreign Key Relationships

| Relationship | DB | Flutter | Web | Issue |
|--------------|----|---------|----|-------|
| Mission → Creator | ✅ `creator_id` | ❌ Missing | ✅ `user_id` | Flask doesn't track |
| Mission → Assigned User | ✅ `assigned_to` | ✅ `driverId` | ✅ `driver_id` | OK but naming differs |
| Inspection → Inspector | ✅ `inspector_id` | ✅ `inspectorId` | ❌ Missing | Web doesn't properly track |
| Invoice → Billing Client | ❌ Only name | ✅ `clientId` | ❌ Only name | DB/Web missing client_id FK |
| Quote → Billing Client | ❌ Only name | ✅ `clientId` | ❌ Only name | DB/Web missing client_id FK |

### 6.2 User ID vs Contact ID Confusion

**Problem**: Mission can have:
- `creator_id` - user who created mission
- `assigned_to` / `driver_id` - user executing mission  
- `driver_id` in web - ALSO could reference Contacts table (confusing!)

**Recommendation**: Clarify whether `driver_id` references:
1. `auth.users` (user account) — current approach
2. `contacts` table (contact entry) — some migrations suggest this
3. Use different field names to avoid confusion

---

## 7️⃣ TRANSACTION & PAYMENT FIELDS

### Missing Payment Tracking
Neither Flutter nor web properly track:
- Payment method (check, transfer, card, etc.)
- Payment date/time
- Transaction ID
- Accounting journal entries

📊 **Recommendation**: Add payment tracking for accounting compliance:
```sql
ALTER TABLE invoices ADD COLUMN payment_method TEXT;
ALTER TABLE invoices ADD COLUMN paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN transaction_reference TEXT;
```

---

## 8️⃣ DATA TYPE ALIGNMENT ISSUES

### Decimal vs Double Precision

| Table | Field | DB Type | Issue |
|-------|-------|---------|-------|
| missions | price | numeric | ✅ OK |
| invoices | subtotal, tax, total | decimal(10,2) | ✅ OK - sufficient precision |
| quotes | subtotal, tax, total | decimal(10,2) | ✅ OK |

✅ **Status**: Database uses appropriate fixed-precision types for currency

---

## 🎯 PRIORITY ACTION ITEMS

### 🔴 **CRITICAL** (Block production if not fixed)
1. **Fuel level type mismatch** (Web has `string`, should be `number`)
2. **Web app missing Invoice/Quote types** (Type safety issue)
3. **Database missing client_id FKs** in invoices/quotes tables

### 🟠 **HIGH** (Should fix soon)
1. Add missing DB columns for Flutter invoices/quotes:
   - `client_id`, `mission_id`, `payment_method`, `paid_at`, terms tracking
2. Standardize status values (draft/sent/pending inconsistency)
3. Add signature metadata (name, date)
4. Add mission completion tracking (`completed_at`)

### 🟡 **MEDIUM** (Would improve consistency)
1. Standardize field naming (mileage_km vs vehicle_mileage)
2. Consolidate vehicle field names (vehicle_plate vs vehicle_license_plate)
3. Add city/postal code fields to missions table
4. Clarify scheduled vs actual pickup/delivery

### 🟢 **LOW** (Nice to have)
1. Add timestamp for payment state transitions
2. Extend inspection with photo metadata consistency
3. Improve condition field structure (single vs exterior/interior)

---

## 📝 FIELD-BY-FIELD RECONCILIATION TABLE

### MISSIONS
| Flutter | Web JS | Database | Status |
|---------|--------|----------|--------|
| id | id | id | ✅ |
| reference | reference | reference | ✅ |
| pickupAddress | pickup_address | pickup_address | ✅ |
| pickupCity | N/A | N/A | ❌ Flask only |
| pickupPostalCode | N/A | N/A | ❌ Flask only |
| pickupLat | pickup_lat | pickup_lat | ✅ |
| pickupLng | pickup_lng | pickup_lng | ✅ |
| pickupDate | pickup_date | scheduled_pickup | ⚠️ Semantic mismatch |
| deliveryAddress | delivery_address | delivery_address | ✅ |
| deliveryCity | N/A | N/A | ❌ Flask only |
| deliveryPostalCode | N/A | N/A | ❌ Flask only |
| deliveryLat | delivery_lat | delivery_lat | ✅ |
| deliveryLng | delivery_lng | delivery_lng | ✅ |
| deliveryDate | delivery_date | scheduled_delivery | ⚠️ Semantic mismatch |
| vehicleType | N/A | N/A | ❌ Flutter only - not in app |
| vehicleBrand | vehicle_brand | vehicle_brand | ✅ |
| vehicleModel | vehicle_model | vehicle_model | ✅ |
| vehiclePlate | vehicle_plate | vehicle_plate/vehicle_license_plate | ⚠️ DB has 2 columns |
| vehicleVin | vehicle_vin | vehicle_vin | ✅ |
| status | status | status | ✅ |
| driverId | driver_id | assigned_to/driver_id | ⚠️ Naming variance |
| clientName | N/A | client_name | ⚠️ Web missing |
| clientPhone | N/A | client_phone | ⚠️ Web missing |
| clientEmail | N/A | client_email | ⚠️ Web missing |
| price | price | price | ✅ |
| notes | notes | notes | ✅ |
| publicTrackingLink | N/A | public_tracking_link | ❌ Flask missing |
| reportId | N/A | report_id | ⚠️ Web missing |
| createdAt/updatedAt | created_at/updated_at | created_at/updated_at | ✅ |

### VEHICLE_INSPECTIONS
| Flutter | Web JS | Database | Status |
|---------|--------|----------|--------|
| id | id | id | ✅ |
| missionId | mission_id | mission_id | ✅ |
| inspectorId | N/A | inspector_id | ❌ Web missing |
| inspectionType | type | inspection_type | ✅ |
| vehicleInfo | N/A | vehicle_info | ❌ Web missing |
| overallCondition | exterior_condition + interior_condition | overall_condition | ⚠️ Schema mismatch |
| fuelLevel | fuel_level (❌ string!) | fuel_level | ❌ TYPE MISMATCH |
| mileageKm | vehicle_mileage | mileage_km | ⚠️ Name mismatch |
| damages | damages | damages | ✅ |
| notes | notes | notes | ✅ |
| inspectorSignature | inspector_signature | inspector_signature | ✅ |
| clientSignature | client_signature | client_signature | ✅ |
| clientName | N/A | client_name | ❌ Web missing |
| latitude | location_latitude | latitude | ✅ |
| longitude | location_longitude | longitude | ✅ |
| locationAddress | location_address | location_address | ✅ |
| status | N/A | status | ❌ Web missing |
| completedAt | inspected_at | completed_at | ⚠️ Field name differs |
| createdAt | created_at | created_at | ✅ |
| updatedAt | N/A | updated_at | ❌ Web missing |

---

## 📚 REFERENCE FILES
- Flutter Models: [lib/models/mission.dart](mobile_flutter/finality_app/lib/models/mission.dart), [lib/models/inspection.dart](mobile_flutter/finality_app/lib/models/inspection.dart), [lib/models/invoice.dart](mobile_flutter/finality_app/lib/models/invoice.dart)
- Web Services: [src/services/missionService.ts](src/services/missionService.ts), [src/services/inspectionService.ts](src/services/inspectionService.ts)
- Web Types: [src/types/index.ts](src/types/index.ts)
- DB Migrations: [supabase/migrations/20251010040424_create_billing_system.sql](supabase/migrations/20251010040424_create_billing_system.sql), [supabase/migrations/20251009151525_create_inspection_gps_tracking_v2.sql](supabase/migrations/20251009151525_create_inspection_gps_tracking_v2.sql)

