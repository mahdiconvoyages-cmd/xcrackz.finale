# ChecksFleet — Comprehensive Bug / UX / Feature Report

> **Scope**: Planning Network, Covoiturage (Carpooling), Contacts (CRM), Documents, Tracking, Settings, Support, Shop  
> **Platforms**: Web (React/TypeScript) + Mobile (Flutter/Dart)  
> **Date**: Auto-generated analysis

---

## Table of Contents

1. [Critical Bugs](#1-critical-bugs)
2. [UX Issues](#2-ux-issues)
3. [Missing Features & Feature-Parity Gaps](#3-missing-features--feature-parity-gaps)
4. [Performance Issues](#4-performance-issues)
5. [Error Handling Gaps](#5-error-handling-gaps)
6. [Accessibility Issues](#6-accessibility-issues)
7. [Code Quality & Maintenance](#7-code-quality--maintenance)

---

## 1. Critical Bugs

### 1.1 [BUG] Direct State Mutation in Planning Form Submit
- **File**: `src/pages/PlanningNetwork.tsx` (lines 1358–1367)
- **Platform**: Web
- **Severity**: High
- **Description**: In `CreatePlanningModal.handleSubmit`, the `form` state object is mutated directly instead of going through `setForm`:
  ```tsx
  form.origin_lat = geo[0].lat;
  form.origin_lng = geo[0].lng;
  form.origin_postal_code = geo[0].postcode;
  ```
  React will not re-render on direct mutation. While the insert still sends the mutated values, this breaks React's immutability contract and can cause stale closures if the component re-renders before `insert` completes.
- **Fix**: Use `setForm(f => ({ ...f, origin_lat: geo[0].lat, ... }))` or use a local copy.

### 1.2 [BUG] Realtime Channel Subscribes to ALL Missions When User Is Null
- **File**: `src/pages/PublicTracking.tsx` (lines 60–65)
- **Platform**: Web
- **Severity**: High
- **Description**: The Supabase realtime filter uses `filter: user ? \`user_id=eq.${user.id}\` : undefined`. When `user` is falsy, the filter is `undefined` — meaning the channel subscribes to **every** mission change in the entire `missions` table, leaking data and wasting bandwidth.
- **Fix**: Guard the subscription setup behind `if (!user) return;` or provide a never-matching filter.

### 1.3 [BUG] `loadClientStats` Has No `user_id` Filter — Data Leak Risk
- **File**: `src/pages/Clients.tsx` (lines 136–149)
- **Platform**: Web
- **Severity**: High
- **Description**: The `loadClientStats` function queries `invoices` and `quotes` by `client_id` only, without filtering by `user_id`. If RLS is misconfigured or disabled for admin, a user could see invoice/quote totals belonging to another user who shares the same client record.
- **Fix**: Add `.eq('user_id', user.id)` to both queries.

### 1.4 [BUG] `filterClients` Crashes on Null Phone
- **File**: `src/pages/Clients.tsx` (line 130)
- **Platform**: Web
- **Severity**: Medium
- **Description**: The `filterClients` callback calls `client.email.toLowerCase()` and `client.siret?.toLowerCase()` but never checks if `email` is empty/null before `toLowerCase()`. If a client has a null email, this throws a runtime error.
- **Fix**: Use optional chaining: `client.email?.toLowerCase()`.

### 1.5 [BUG] `_respondToMatch` Type Mismatch in Flutter
- **File**: `mobile_flutter/finality_app/lib/screens/planning/planning_network_screen.dart` (~line 1010)
- **Platform**: Flutter
- **Severity**: Medium
- **Description**: Uses `orElse: () => {}` which returns an empty `Map<dynamic, dynamic>` (or `Set` depending on context) when the match is not found. The return type likely doesn't match the expected `Match` type, causing a silent type coercion issue at runtime.
- **Fix**: Use `orElse: () => null` with a null check, or throw an explicit error.

### 1.6 [BUG] Bot Messages Created With User's Own `sender_id`
- **File**: `src/pages/Support.tsx` (~lines 135–145)
- **Platform**: Web
- **Severity**: Medium
- **Description**: When the automated bot responds, the message is inserted with `sender_id: user.id` and `sender_type: 'bot'`. This means the user appears as both the sender and recipient. The conversations list logic may incorrectly attribute bot messages to the user, and the message bubble alignment will be wrong.
- **Fix**: Use a dedicated system/bot UUID for `sender_id`.

### 1.7 [BUG] `profile.subscription_plan` Referenced But Doesn't Exist
- **File**: `src/pages/Settings.tsx` (line ~355)
- **Platform**: Web
- **Severity**: Medium
- **Description**: The settings page renders `{profile.subscription_plan}` inside a "Plan actuel" section, but the `Profile` interface defined in the `useAuth` context has no `subscription_plan` field. With `@ts-nocheck` active, TypeScript won't catch this; it renders `undefined` to the user.
- **Fix**: Use `subscription.plan` from the `useSubscription` hook instead.

### 1.8 [BUG] Duplicate CSS Border Classes
- **File**: `src/pages/Settings.tsx` (line ~244)
- **Platform**: Web
- **Severity**: Low
- **Description**: The email input has the class `border border-slate-200 border border-slate-200` — the border classes are duplicated. While Tailwind deduplicates at runtime, this is a copy-paste error indicating the code wasn't reviewed.
- **Fix**: Remove the duplicated `border border-slate-200`.

---

## 2. UX Issues

### 2.1 [UX] `alert()` and `confirm()` Used Instead of Proper Modals
- **Files**:
  - `src/pages/Clients.tsx` (line ~161): `alert('Le nom et l\'email sont obligatoires')`
  - `src/pages/PlanningNetwork.tsx` (line ~1408): `alert('Erreur lors de la création du planning')`
  - `src/pages/TrackingList.tsx` (line ~231): `alert('✅ Lien de tracking copié !')`
  - `src/pages/Settings.tsx` — `handleDeleteAccount` uses `window.confirm` + `window.prompt`
- **Platform**: Web
- **Description**: Native `alert()` and `confirm()` blocks the UI thread, cannot be styled, and breaks the design language. The project already has a `toast` utility (used in Shop.tsx) and a `showToast` component.
- **Fix**: Replace all `alert()`/`confirm()` with toast notifications or styled modal dialogs.

### 2.2 [UX] Fake "Typing" Indicator in Support Chat
- **File**: `src/pages/Support.tsx` (lines 135–139)
- **Platform**: Web
- **Description**: After the user sends a message, a `setTimeout` simulates the admin "typing" for 2 seconds. This is deceptive — no admin is actually typing. Users may wait expecting a response that never arrives.
- **Fix**: Either implement real typing indicators via realtime presence, or remove the fake indicator entirely.

### 2.3 [UX] Geocode Dropdown Doesn't Close on Outside Click
- **File**: `src/pages/PlanningNetwork.tsx` (lines 1490–1550)
- **Platform**: Web
- **Description**: The `CreatePlanningModal` origin/destination city dropdowns appear when results are available, but there is no outside-click handler to dismiss them. Users must select an option or clear the field.
- **Fix**: Add a `useRef` + `useEffect` with a `mousedown` listener to close the dropdown when clicking outside.

### 2.4 [UX] No Date Validation — Can Create Plannings in the Past
- **File**: `src/pages/PlanningNetwork.tsx` (line ~1470)
- **Platform**: Web & Flutter
- **Description**: The date input for creating a new planning has no `min` attribute and no validation. Users can create a planning for yesterday, which will never be matched.
- **Fix**: Set `min={new Date().toISOString().split('T')[0]}` on the date input, and add server-side validation.

### 2.5 [UX] No Time Range Validation (End Before Start)
- **File**: `src/pages/PlanningNetwork.tsx` (lines 1475–1490)
- **Platform**: Web & Flutter
- **Description**: Users can set `end_time` earlier than `start_time` without any validation or warning.
- **Fix**: Validate that `end_time > start_time` before submission.

### 2.6 [UX] Tracking "Share" Button Uses `alert()`
- **File**: `src/pages/TrackingList.tsx` (line ~231)
- **Platform**: Web
- **Description**: `copyTrackingLink` calls `alert('✅ Lien de tracking copié !')` — a raw alert with an emoji as the only user feedback.
- **Fix**: Use `toast.success('Lien de tracking copié')`.

### 2.7 [UX] No Unsaved Changes Warning in Settings/Profile
- **Files**:
  - `src/pages/Settings.tsx`
  - `src/pages/Profile.tsx`
- **Platform**: Web
- **Description**: Users can navigate away from partially filled profile/settings forms without any "unsaved changes" warning.
- **Fix**: Use `beforeunload` event or a route-guard prompt.

### 2.8 [UX] No Form Validation on Phone/SIRET in Settings
- **File**: `src/pages/Settings.tsx` (lines 250–300)
- **Platform**: Web
- **Description**: Phone and SIRET fields accept any text with no format validation. The Clients page has SIRET validation via `isValidSiret()` from the INSEE service, but Settings does not.
- **Fix**: Apply phone regex (`/^(\+33|0)[1-9]\d{8}$/`) and SIRET format checks.

### 2.9 [UX] Flutter Tracking List "onTap" Only Shows a SnackBar
- **File**: `mobile_flutter/finality_app/lib/screens/tracking/tracking_list_screen.dart` (~line 300)
- **Platform**: Flutter
- **Description**: Tapping a tracking mission card only shows a SnackBar message instead of navigating to a tracking detail view. There is no map or detail screen opened.
- **Fix**: Navigate to a full tracking/map detail screen on tap.

### 2.10 [UX] Flutter Chat Support Shows "En cours de développement"
- **File**: `mobile_flutter/finality_app/lib/screens/settings/settings_screen.dart` (line ~500)
- **Platform**: Flutter
- **Description**: The "Chat en direct" support option (labeled "Disponible 24/7") just shows a SnackBar saying the feature is under development. This is misleading.
- **Fix**: Either implement the chat feature or remove the "Disponible 24/7" label and disable the option.

### 2.11 [UX] Flutter Data Export is Faked
- **File**: `mobile_flutter/finality_app/lib/screens/settings/settings_screen.dart` (lines 415–440)
- **Platform**: Flutter
- **Description**: `_exportData()` uses `Future.delayed(2 seconds)` and shows "Données exportées par email" without actually exporting anything. This is a fake GDPR feature.
- **Fix**: Implement actual data export, or show "Fonctionnalité bientôt disponible".

### 2.12 [UX] Flutter Delete Account is Faked
- **File**: `mobile_flutter/finality_app/lib/screens/settings/settings_screen.dart` (lines 370–405)
- **Platform**: Flutter
- **Description**: `_deleteAccount()` shows a confirmation dialog, but on confirmation it only shows a SnackBar saying "Un email de confirmation vous a été envoyé" without actually sending an email or initiating any deletion process.
- **Fix**: Implement actual account deletion flow or RPC call.

### 2.13 [UX] Duplicate Subscription Section in Settings (Web)
- **File**: `src/pages/Settings.tsx` (lines 180–200 + 340–360)
- **Platform**: Web
- **Description**: There are two subscription display sections: one using the `useSubscription` hook at the top, and a second hardcoded section at the bottom referencing `profile.subscription_plan`. These show different data.
- **Fix**: Remove the duplicate section and use only the `useSubscription` hook data.

---

## 3. Missing Features & Feature-Parity Gaps

### 3.1 [PARITY] Flutter Has No Map View for Planning Network
- **Web**: `src/pages/PlanningNetwork.tsx` (lines 1000–1100) — Full Leaflet map showing all published plannings with markers, polylines, and popups.
- **Flutter**: `mobile_flutter/finality_app/lib/screens/planning/planning_network_screen.dart` — Uses a `_NetworkListTab` (simple scrollable list) instead of a map tab.
- **Gap**: Mobile users cannot visualize the convoy network geographically.
- **Recommendation**: Integrate `flutter_map` or `google_maps_flutter` for the network tab.

### 3.2 [PARITY] Flutter Has No Map for Mission Tracking
- **Web**: `src/pages/TrackingList.tsx` — Full Leaflet map with real-time driver position, pickup/delivery markers, and route.
- **Flutter**: `mobile_flutter/finality_app/lib/screens/tracking/tracking_list_screen.dart` — List only; tapping shows a SnackBar, not a map.
- **Gap**: Mobile users cannot see real-time GPS positions on a map.

### 3.3 [PARITY] Flutter Has No Support/Chat Feature
- **Web**: `src/pages/Support.tsx` — Full support ticket system with real-time chat, conversation list, automated responses.
- **Flutter**: No support screen exists. Settings only has a contact bottom sheet with phone/email/fake chat.
- **Gap**: Mobile users cannot file support tickets or chat.

### 3.4 [PARITY] Flutter CRM Is Minimal
- **Web**: `src/pages/Clients.tsx` — Full CRUD, SIRET/INSEE autocomplete, pricing grids, client stats, detail modal.
- **Flutter**: `mobile_flutter/finality_app/lib/screens/crm/crm_screen.dart` — Just a tab hub linking to sub-screens. No SIRET autocomplete, no pricing grid management.
- **Gap**: Mobile CRM is significantly less capable.

### 3.5 [PARITY] Flutter Has No Document Scanner OCR on Web
- **Web**: `src/pages/MyDocuments.tsx` — Viewing, sharing, deleting documents.
- **Flutter**: `mobile_flutter/finality_app/lib/screens/scanned_documents/scanned_documents_screen_new.dart` — Scanning, OCR, grid/list, filters.
- **Gap**: Inverse parity — Flutter has richer document scanning. Web has no scan capability (expected, since it's a browser).

### 3.6 [MISSING] No Pagination on Any List (Both Platforms)
- **Affected Files**:
  - `src/pages/PlanningNetwork.tsx` — All plannings loaded at once
  - `src/pages/Clients.tsx` — All clients loaded at once
  - `src/pages/MyDocuments.tsx` — Limited to 200 but no paginator
  - `src/pages/TrackingList.tsx` — All active missions loaded at once
  - Flutter equivalents — Same pattern
- **Description**: No infinite scroll, load-more buttons, or page controls on any list. With hundreds of items, performance will degrade.

### 3.7 [MISSING] No Chat Read Receipts
- **Files**: 
  - `src/pages/PlanningNetwork.tsx` (MatchesTab chat)
  - `mobile_flutter/finality_app/lib/screens/planning/planning_network_screen.dart` (chat)
- **Platform**: Both
- **Description**: Messages have an `is_read` field in the database, but neither platform displays read status or marks messages as read when viewed.

### 3.8 [MISSING] No Offline Mode (Web)
- **Platform**: Web
- **Description**: The web app has no service worker or offline data caching. If the network drops, all functionality stops. Flutter has an offline mode toggle in settings, but it's just a preference—no actual offline data sync is implemented.

### 3.9 [MISSING] No 2FA Support
- **File**: `mobile_flutter/finality_app/lib/screens/settings/settings_screen.dart` (line ~740)
- **Platform**: Both
- **Description**: The Flutter settings page shows a "2FA" option labeled "Bientôt" (Coming Soon). No web equivalent exists. 2FA is not implemented anywhere.

### 3.10 [MISSING] No Route Distance Calculation (Road Distance)
- **Files**:
  - `src/pages/PublicTracking.tsx` (lines 200–215) — uses `calculateDistance` (Haversine)
  - `src/pages/TrackingList.tsx` (lines 200–215) — same Haversine formula
  - `mobile_flutter/finality_app/lib/services/planning_location_service.dart` (line ~160) — same Haversine
- **Platform**: Both
- **Description**: All distance calculations use straight-line Haversine. Paris→Marseille is shown as ~660km but the actual road distance is ~775km. ETA is calculated assuming constant 80km/h over straight-line distance.
- **Fix**: Integrate a routing API (e.g., OSRM, GraphHopper, or Google Directions) for accurate road distances and ETAs.

### 3.11 [MISSING] QuoteGenerator Commented Out in Clients
- **File**: `src/pages/Clients.tsx` (line 9)
- **Platform**: Web
- **Description**: The `QuoteGenerator` import is commented out: `// import QuoteGenerator from '../components/QuoteGenerator';`. Quote generation from the client detail view is disabled.

### 3.12 [MISSING] No Real Notification Delivery in Flutter
- **File**: `mobile_flutter/finality_app/lib/services/planning_location_service.dart`
- **Platform**: Flutter
- **Description**: The `PlanningLocationService` initializes `flutter_local_notifications` plugin but the notification display is conditional and only triggers for proximity alerts. There's no FCM/push notification integration for match alerts, new messages, or mission updates.

---

## 4. Performance Issues

### 4.1 [PERF] N+1 Query in Match Enrichment — Web
- **File**: `src/pages/PlanningNetwork.tsx` (lines 206–222)
- **Platform**: Web
- **Severity**: Critical
- **Description**: After loading all matches, the code loops through each match and makes **2 sequential Supabase queries** per match (profile + planning):
  ```tsx
  for (const m of rawMatches) {
    const [profileRes, planningRes] = await Promise.all([
      supabase.from('profiles').select(...).eq('id', otherUserId).maybeSingle(),
      supabase.from('convoy_plannings').select(...).eq('id', otherPlanningId).maybeSingle(),
    ]);
    enrichedMatches.push({ ...m, other_user: profileRes.data, other_planning: planningRes.data });
  }
  ```
  With 50 matches, this fires **100 sequential HTTP requests**. The `Promise.all` inside the loop only parallelizes the 2 per-match queries, not across matches.
- **Fix**: Collect all `otherUserId`s and `otherPlanningId`s, then do 2 bulk queries with `.in('id', ids)`.

### 4.2 [PERF] N+1 Query in Match Enrichment — Flutter
- **File**: `mobile_flutter/finality_app/lib/screens/planning/planning_network_screen.dart` (~line 1000)
- **Platform**: Flutter
- **Severity**: Critical
- **Description**: Identical N+1 pattern as the web — individual profile + planning queries per match inside a loop.
- **Fix**: Same batch-query approach.

### 4.3 [PERF] N+1 Query in `loadClientPricingGrids`
- **File**: `src/pages/Clients.tsx` (lines 97–110)
- **Platform**: Web
- **Severity**: High
- **Description**: Pricing grids are loaded one-by-one in a `for` loop:
  ```tsx
  for (const clientId of clientIds) {
    const grid = await getClientPricingGrid(user.id, clientId);
    gridsMap[clientId] = grid;
  }
  ```
  With 100 clients, this fires 100 sequential requests.
- **Fix**: Use `Promise.all(clientIds.map(id => getClientPricingGrid(...)))` or a batch RPC.

### 4.4 [PERF] N+1 in `loadRawFiles` Storage Listing
- **File**: `src/pages/MyDocuments.tsx` (lines 100–120)
- **Platform**: Web
- **Severity**: Medium
- **Description**: `loadRawFiles` lists the top-level folder, then for each subfolder does another `listStorage()` call, creating an N+1 pattern over the storage API.
- **Fix**: Use a recursive listing endpoint or restructure storage to avoid nested traversal.

### 4.5 [PERF] N+1 in Flutter Tracking GPS Data Fetch
- **File**: `mobile_flutter/finality_app/lib/screens/tracking/tracking_list_screen.dart` (~lines 80–120)
- **Platform**: Flutter
- **Severity**: Medium
- **Description**: GPS tracking data is fetched per-mission in a loop using individual Supabase queries.
- **Fix**: Batch the mission IDs into a single `.in()` query.

### 4.6 [PERF] `getPublicUrl` Called Inline During Render
- **File**: `src/pages/MyDocuments.tsx` (line ~306)
- **Platform**: Web
- **Severity**: Medium
- **Description**: In the "Brouillons" tab render loop, `supabase.storage.from('inspection-documents').getPublicUrl(file.path)` is called synchronously during each render cycle. While Supabase's `getPublicUrl` is not an HTTP call (it just constructs a URL), this pattern is fragile and would be catastrophic if the implementation changed.
- **Fix**: Pre-compute URLs during `loadRawFiles()` and store them with the file items.

### 4.7 [PERF] Realtime Triggers Full Data Reload
- **File**: `src/pages/PlanningNetwork.tsx` (lines 234–248)
- **Platform**: Web
- **Severity**: Medium
- **Description**: Every realtime event on `convoy_plannings`, `planning_matches`, or `planning_notifications` triggers a full `loadData()` which re-fetches everything including the N+1 match enrichment. A single new match triggers 4 parallel queries + N*2 enrichment queries.
- **Fix**: Handle realtime events granularly — append/update individual items instead of full reload.

### 4.8 [PERF] Location Uploaded Every 30 Seconds Even When Stationary
- **File**: `mobile_flutter/finality_app/lib/services/planning_location_service.dart` (~line 70)
- **Platform**: Flutter
- **Severity**: Low
- **Description**: `_uploadLocation` runs on a fixed timer regardless of whether the user has moved. This wastes battery and bandwidth.
- **Fix**: Check distance from last uploaded position; skip upload if < threshold (e.g., 50m).

### 4.9 [PERF] Tailwind JIT Dynamic Class Names Won't Purge
- **File**: `src/pages/PlanningNetwork.tsx` (multiple locations)
- **Platform**: Web
- **Severity**: Low (visual)
- **Description**: Dynamic class names like `` bg-${matchInfo.color}-100 `` won't work with Tailwind JIT purging because the full class string is never present in the source code. These classes will be silently dropped in production builds.
- **Fix**: Use a lookup map: `const colorMap = { emerald: 'bg-emerald-100', blue: 'bg-blue-100', ... }`.

---

## 5. Error Handling Gaps

### 5.1 [ERR] Silent Failures in Flutter Match Enrichment
- **File**: `mobile_flutter/finality_app/lib/screens/planning/planning_network_screen.dart` (~line 1020)
- **Platform**: Flutter
- **Description**: `_enrichMatches` has no per-item error handling. If one profile fetch fails, the entire enrichment may fail silently or throw an unhandled exception, leaving all matches un-enriched.
- **Fix**: Wrap each match enrichment in try/catch and provide fallback "Unknown User" data.

### 5.2 [ERR] Silent Location Permission Denial
- **File**: `mobile_flutter/finality_app/lib/services/planning_location_service.dart` (~line 40)
- **Platform**: Flutter
- **Description**: `startTracking()` silently returns if location permission is denied — no user feedback:
  ```dart
  if (!permission.isGranted) return;
  ```
- **Fix**: Return a result enum or throw so the caller can display a permission prompt.

### 5.3 [ERR] Silent `_uploadLocation` Failure
- **File**: `mobile_flutter/finality_app/lib/services/planning_location_service.dart` (~line 90)
- **Platform**: Flutter
- **Description**: `_uploadLocation` wraps the entire function in `try { ... } catch (e) { }` — errors are completely swallowed. Location data may silently fail to upload without any retry mechanism.
- **Fix**: Add logging, retry logic, and offline queue for failed uploads.

### 5.4 [ERR] `loadOfficialDocs` Has No `user_id` Filter
- **File**: `src/pages/MyDocuments.tsx` (lines 72–83)
- **Platform**: Web
- **Description**: The query `supabase.from('inspection_documents').select('*').order(...)` has no `.eq('user_id', user.id)` — it relies entirely on RLS. If RLS is misconfigured, ALL documents from ALL users would be returned. The code even has a comment acknowledging this.
- **Fix**: Add an explicit `user_id` filter as defense-in-depth.

### 5.5 [ERR] No Error Boundary for Document Viewer
- **File**: `src/pages/MyDocuments.tsx` (lines 330–365)
- **Platform**: Web
- **Description**: The viewer modal renders images and PDFs directly via `<img>` and `<iframe>` with no error handling. A CORS error on the image, a broken PDF, or a blocked iframe will show a blank viewer or browser error.
- **Fix**: Add `onError` handlers on `<img>`, wrap `<iframe>` in an error boundary, show a "Document unavailable" fallback.

### 5.6 [ERR] Fragile Old Avatar Deletion
- **File**: `src/pages/Profile.tsx` (lines 183–186)
- **Platform**: Web
- **Description**: Old avatar deletion extracts the path with `profile.avatar_url.split('/').slice(-2).join('/')`. If the URL format changes (e.g., different CDN, versioned paths), this will silently fail to delete the old file, orphaning storage.
- **Fix**: Store the storage path separately from the public URL.

### 5.7 [ERR] Flutter Document Delete Path Extraction is Brittle
- **File**: `mobile_flutter/finality_app/lib/screens/scanned_documents/scanned_documents_screen_new.dart` (~line 270)
- **Platform**: Flutter
- **Description**: Delete implementation extracts the storage path by skipping the first 3 URL segments. If the Supabase storage URL structure changes, deletions will fail.
- **Fix**: Store the relative storage path in the document record.

### 5.8 [ERR] `subscribeToMessages` Cleanup is Fragile
- **File**: `src/pages/Support.tsx` (lines 148–165)
- **Platform**: Web
- **Description**: The function returns `() => { supabase.removeChannel(channel); }` but the calling code wraps unsubscription in try/catch, suggesting it has previously thrown. If `removeChannel` throws, the channel leaks.
- **Fix**: Use the channel's own `unsubscribe()` and handle errors gracefully.

---

## 6. Accessibility Issues

### 6.1 [A11Y] No ARIA Labels on Icon-Only Buttons
- **Files**: All web pages
- **Platform**: Web
- **Description**: Many buttons contain only icons (Leaflet zoom, share, delete, refresh, notification bell) without `aria-label`. Screen readers will announce empty or generic text.
- **Examples**:
  - `src/pages/PlanningNetwork.tsx` — Bell icon button (line ~330) has `title="Notifications"` but no `aria-label`
  - `src/pages/MyDocuments.tsx` — Refresh button (line ~190) — no label
  - `src/pages/TrackingList.tsx` — Share/View buttons in mission cards
- **Fix**: Add `aria-label="Notifications"`, `aria-label="Rafraîchir"`, etc.

### 6.2 [A11Y] No Keyboard Navigation for Modals
- **Files**:
  - `src/pages/PlanningNetwork.tsx` — `CreatePlanningModal` (line ~1420)
  - `src/pages/Clients.tsx` — Client CRUD modals
  - `src/pages/MyDocuments.tsx` — Viewer modal
- **Platform**: Web
- **Description**: Modals don't trap focus. Users can tab behind the modal into the background page. ESC key handling is inconsistent (some modals support it, some don't).
- **Fix**: Use `role="dialog"`, `aria-modal="true"`, and a focus-trap library or React Portal with focus management.

### 6.3 [A11Y] No Focus Management After Actions
- **Platform**: Web (all pages)
- **Description**: After creating a client, deleting a document, or sending a message, focus is not moved to the relevant UI element (e.g., the new item or the list). Screen reader users have no indication the action completed.

### 6.4 [A11Y] Color-Only Status Indicators
- **Files**:
  - `src/pages/TrackingList.tsx` — Status badges use only color (green/amber/red)
  - `src/pages/PlanningNetwork.tsx` — Match type badges
- **Platform**: Web
- **Description**: Status is conveyed primarily through color. Color-blind users may not distinguish between "En cours" (blue), "En attente" (amber), and "Terminée" (green).
- **Fix**: Always include text labels (which exist) but ensure sufficient contrast. Add supplementary icons inside badges. Consider patterns for color-blind modes.

### 6.5 [A11Y] Animations Cannot Be Reduced
- **Platform**: Both
- **Description**: Many elements use `animate-pulse`, `animate-spin`, `animate-bounce` without respecting `prefers-reduced-motion`. Users with vestibular disorders may experience discomfort.
- **Web Fix**: Add `motion-reduce:animate-none` Tailwind utilities.
- **Flutter Fix**: Check `MediaQuery.disableAnimations` and skip animations accordingly.

### 6.6 [A11Y] No Semantic HTML for Chat Messages
- **File**: `src/pages/Support.tsx` — Chat section  
  `src/pages/PlanningNetwork.tsx` — MatchesTab chat
- **Platform**: Web
- **Description**: Chat messages are rendered as `<div>` elements without any semantic roles (`role="log"`, `role="listitem"`, `aria-live`). New messages are not announced to screen readers.
- **Fix**: Wrap the message container in `role="log"` with `aria-live="polite"`.

### 6.7 [A11Y] Flutter Uses `Semantics` Sparingly
- **Platform**: Flutter
- **Description**: Custom widgets like `_buildMissionCard`, `_buildMenuCard`, `_gridCard` don't use `Semantics` widgets to describe their purpose to TalkBack/VoiceOver. The rich visual cards are opaque to screen readers.
- **Fix**: Wrap interactive cards in `Semantics(label: 'Mission xyz, status en cours', ...)`.

---

## 7. Code Quality & Maintenance

### 7.1 [CODE] `@ts-nocheck` Used Extensively
- **Files**:
  - `src/pages/PlanningNetwork.tsx` (line 1)
  - `src/pages/Clients.tsx` (line 1)
  - `src/pages/Settings.tsx` (line 1)
  - `src/pages/Support.tsx` (line 1)
  - `src/pages/Shop.tsx` (line 1)
- **Platform**: Web
- **Description**: Five major pages disable TypeScript checking entirely. This hides real type errors (like the `subscription_plan` bug in Settings.tsx) and defeats the purpose of using TypeScript.
- **Fix**: Remove `@ts-nocheck` and fix the actual type errors. Generate proper Supabase types with `supabase gen types typescript`.

### 7.2 [CODE] Dynamic Leaflet Loading via `window` Global
- **File**: `src/pages/PlanningNetwork.tsx` — MapTab (~line 1000)
- **Platform**: Web
- **Description**: The map tab dynamically loads Leaflet via a `<script>` tag injected into `<head>` and accesses it via `(window as any).L`. This is fragile, races with rendering, and duplicates loads across page navigations.
- **Fix**: Use `import L from 'leaflet'` with tree-shaking, or the `react-leaflet` library.

### 7.3 [CODE] `console.log` Left in Production Code
- **Files**: Almost all files contain `console.log`, `console.error`, and emoji-prefixed debug logs (e.g., `console.log('📄 Documents officiels:', ...)`, `console.log('🚗 GPS update received:', ...)`).
- **Platform**: Both
- **Fix**: Use a proper logger with log levels. Strip debug logs in production builds.

### 7.4 [CODE] `print()` Used for Debugging in Flutter
- **File**: `mobile_flutter/finality_app/lib/screens/tracking/tracking_list_screen.dart`
- **Platform**: Flutter
- **Description**: Uses `print()` which outputs to the system console. In release mode, these are stripped, but `debugPrint()` is preferred as it throttles output and avoids log buffer overflow.
- **Fix**: Replace all `print()` with `debugPrint()` or use the `logger` package.

### 7.5 [CODE] `onKeyPress` is Deprecated
- **File**: `src/pages/Support.tsx` (message input)
- **Platform**: Web
- **Description**: Uses `onKeyPress` which is deprecated in favor of `onKeyDown`. MDN marks it as officially deprecated.
- **Fix**: Replace with `onKeyDown` and check `e.key === 'Enter'`.

### 7.6 [CODE] Inconsistent Status Values Between Platforms
- **Files**:
  - `src/pages/TrackingList.tsx` — Filters for `['pending', 'in_progress']`
  - `mobile_flutter/finality_app/lib/screens/tracking/tracking_list_screen.dart` — Filters for `['active', 'in_progress']`
- **Platform**: Cross-platform
- **Description**: Web uses `pending` + `in_progress`, Flutter uses `active` + `in_progress`. The `_buildStatusChip` in Flutter treats both `active` and `in_progress` as "En cours". This inconsistency suggests the mobile and web codebases have diverged on status naming.
- **Fix**: Standardize status enums across both platforms and the database schema.

### 7.7 [CODE] Singleton Without Thread Safety (Flutter)
- **File**: `mobile_flutter/finality_app/lib/services/planning_location_service.dart` (line ~10)
- **Platform**: Flutter
- **Description**: Uses a manual singleton pattern (`static final instance = PlanningLocationService._()`) which is fine in Dart's single-threaded model, but `dispose()` is a standalone method not overriding anything. If the singleton is "disposed" and then its tracking methods are called, the timer/stream may be null.
- **Fix**: Add a `_disposed` flag and guard all public methods.

### 7.8 [CODE] Settings Saved to SharedPreferences But Not Applied
- **File**: `mobile_flutter/finality_app/lib/screens/settings/settings_screen.dart` (lines 900–1100)
- **Platform**: Flutter
- **Description**: GPS accuracy, update interval, and battery saver mode are saved to SharedPreferences, but `PlanningLocationService` doesn't read these settings. The service hardcodes a 30-second interval and doesn't respect the user's accuracy preference.
- **Fix**: Have `PlanningLocationService` read settings from SharedPreferences on startup and when they change.

### 7.9 [CODE] `_calculateCacheSize` Is an Estimate
- **File**: `mobile_flutter/finality_app/lib/screens/settings/settings_screen.dart` (~line 200)
- **Platform**: Flutter
- **Description**: Cache size is estimated as `numberOfKeys * 100 bytes` which is wildly inaccurate. A single cached image URL could be 200+ characters, while a boolean flag is 1 byte.
- **Fix**: Use actual file system cache size via `getTemporaryDirectory()` and sum file sizes.

---

## Summary Matrix

| Category | Web | Flutter | Total |
|----------|-----|---------|-------|
| Critical Bugs | 5 | 3 | **8** |
| UX Issues | 8 | 5 | **13** |
| Missing Features / Parity Gaps | 8 | 4 | **12** |
| Performance Issues | 7 | 2 | **9** |
| Error Handling Gaps | 5 | 3 | **8** |
| Accessibility Issues | 5 | 2 | **7** |
| Code Quality | 5 | 4 | **9** |
| **Total** | **43** | **23** | **66** |

---

## Priority Recommendations

### P0 — Fix Immediately (Security / Data Integrity)
1. Fix realtime channel unfiltered subscription (`PublicTracking.tsx:60`)
2. Add `user_id` filter to `loadClientStats` (`Clients.tsx:136`)
3. Fix direct state mutation in planning form (`PlanningNetwork.tsx:1358`)
4. Fix `subscription_plan` ghost reference (`Settings.tsx:355`)

### P1 — Fix This Sprint (Performance / UX)
5. Batch match enrichment queries (both platforms)
6. Batch pricing grid loading (`Clients.tsx:97`)
7. Replace all `alert()`/`confirm()` with toast/modal
8. Remove fake typing indicator and fake data export
9. Add date/time validation to planning creation

### P2 — Fix This Quarter (Feature Gaps / Accessibility)
10. Add map views to Flutter (network + tracking)
11. Implement Flutter support chat
12. Add pagination to all lists
13. Add ARIA labels and focus management
14. Remove `@ts-nocheck` and fix TypeScript types
15. Standardize status codes across platforms

### P3 — Backlog (Nice to Have)
16. Integrate road-distance routing API
17. Implement real 2FA
18. Add offline mode with sync
19. Implement chat read receipts
20. Add `prefers-reduced-motion` support
