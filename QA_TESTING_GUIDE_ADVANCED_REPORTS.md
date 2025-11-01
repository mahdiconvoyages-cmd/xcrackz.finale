# 🧪 QA Testing Guide - Advanced Inspection Reports

## Test Environment Setup

### Prerequisites
- Physical Android device or iOS device (emulator not recommended for performance testing)
- Stable internet connection
- Access to test inspections with photos
- Admin account for creating test data

### Test Data Requirements
1. **Inspection with no photos** (edge case)
2. **Inspection with 5-10 photos** (small album)
3. **Inspection with 20-30 photos** (medium album)
4. **Inspection with 50+ photos** (large album)
5. **Inspection with mixed photo types** (front, back, interior, dashboard)
6. **Completed inspection with signatures** (PDF generation eligible)
7. **Incomplete inspection** (no signatures)

---

## 📱 Mobile Testing Scenarios

### 1. **Initial Load Performance**

#### Test Case 1.1: Cold Start (No Cache)
1. Clear app data/cache (Settings → Apps → Finality → Clear Data)
2. Open app and login
3. Navigate to Inspections → Select inspection → Advanced Report
4. **Expected**: 
   - Loading spinner < 2 seconds
   - Thumbnails load first (small images)
   - Full resolution loads on tap
5. **Verify**:
   - Photos grouped by type (front, back, etc.)
   - Departure vs Arrival columns visible
   - Photo count matches database

#### Test Case 1.2: Warm Start (With Cache)
1. Open advanced report (data cached from previous test)
2. Kill app (swipe away from recent apps)
3. Reopen app and navigate to same report
4. **Expected**:
   - Data appears instantly (<500ms)
   - No loading spinner
   - Photos load from cache
5. **Verify**:
   - Same data as before
   - No network request visible

#### Test Case 1.3: Cache Expiration
1. Change device date to +8 days in future
2. Open advanced report
3. **Expected**:
   - Cache expired, fresh data fetched
   - Loading spinner shown briefly
4. **Verify**:
   - Data matches current DB state
   - Reset device date after test

---

### 2. **Photo Gallery & Lightbox**

#### Test Case 2.1: Thumbnail Loading
1. Open report with 30+ photos
2. Scroll through gallery
3. **Expected**:
   - Thumbnails load progressively
   - Smooth scrolling (55-60 FPS)
   - No janky/stuttering
4. **Verify**:
   - All thumbnails visible
   - Correct aspect ratio (no stretching)
   - Photos grouped correctly

#### Test Case 2.2: Lightbox Interaction
1. Tap on any photo thumbnail
2. **Expected**:
   - Lightbox opens with full resolution
   - Gesture support: pinch zoom, swipe left/right, double-tap
3. **Verify**:
   - Image sharp (full resolution, not thumbnail)
   - Close button works (tap X or swipe down)
   - Navigate between photos in same group

#### Test Case 2.3: Large Album Performance
1. Open report with 50+ photos
2. Scroll from top to bottom rapidly
3. **Expected**:
   - No memory errors
   - Smooth scrolling maintained
   - Only visible photos rendered (check with React DevTools)
4. **Verify**:
   - App doesn't crash
   - Memory usage stable (<150MB)

---

### 3. **PDF Generation**

#### Test Case 3.1: First-Time Generation
1. Open completed inspection (with signatures)
2. Check header - no "PDF ✓" badge
3. Tap "Générer PDF" button
4. **Expected**:
   - Button text changes to "Génération..."
   - Button disabled during generation
   - Alert shows "Succès" after ~5-10 seconds
   - "PDF ✓" badge appears
5. **Verify**:
   - PDF URL saved to cache
   - Badge persists on refresh

#### Test Case 3.2: Cached PDF
1. Open same inspection (PDF already generated)
2. Check header - "PDF ✓" badge visible
3. Tap "PDF disponible" button
4. **Expected**:
   - Immediate alert: "Le PDF est déjà généré et prêt"
   - No network request
5. **Verify**:
   - Same PDF URL as before
   - No duplicate generation

#### Test Case 3.3: PDF Generation Failure
1. Open completed inspection
2. Turn on airplane mode (offline)
3. Tap "Générer PDF"
4. **Expected**:
   - Alert shows "Erreur réseau" after timeout
   - Button re-enabled
5. **Verify**:
   - No crash
   - Can retry after reconnecting

---

### 4. **Pull-to-Refresh**

#### Test Case 4.1: Refresh PDF Status
1. Open inspection (no PDF generated yet)
2. Generate PDF from web interface
3. Pull down on mobile screen to refresh
4. **Expected**:
   - Refreshing indicator shown
   - "PDF ✓" badge appears after refresh
5. **Verify**:
   - PDF URL fetched from cache
   - No unnecessary re-render of photos

#### Test Case 4.2: Refresh During Load
1. Navigate to advanced report
2. Immediately pull-to-refresh before load completes
3. **Expected**:
   - No crash or error
   - Refresh indicator overlays loading spinner
4. **Verify**:
   - Data loads correctly after refresh

---

### 5. **Offline Mode**

#### Test Case 5.1: Cached Data Offline
1. Open advanced report (ensure cached)
2. Turn on airplane mode
3. Kill app and reopen
4. Navigate to same report
5. **Expected**:
   - Data loads from cache instantly
   - Photos visible (if cached by FastImage)
6. **Verify**:
   - No "No internet" error
   - Graceful degradation

#### Test Case 5.2: Fresh Data Offline
1. Clear app cache
2. Turn on airplane mode
3. Try to open advanced report
4. **Expected**:
   - Loading spinner indefinitely OR
   - Error message: "Erreur réseau"
5. **Verify**:
   - No crash
   - Clear feedback to user

---

### 6. **Edge Cases**

#### Test Case 6.1: No Photos
1. Create inspection with no photos uploaded
2. Open advanced report
3. **Expected**:
   - Empty state message: "Aucune photo disponible"
   - No crash or blank screen
4. **Verify**:
   - Header and PDF button still visible
   - Pull-to-refresh works

#### Test Case 6.2: Missing Thumbnails
1. Upload photos without thumbnail generation (old data)
2. Open advanced report
3. **Expected**:
   - Falls back to full URL
   - Photos still load (slower)
4. **Verify**:
   - No broken image placeholders
   - All photos visible

#### Test Case 6.3: Mixed Photo Types
1. Inspection with custom photo types (e.g., "custom_damage_1")
2. Open advanced report
3. **Expected**:
   - Custom types appear in correct sort order
   - Grouped correctly
4. **Verify**:
   - All 8 standard types appear first
   - Custom types sorted alphabetically after

#### Test Case 6.4: Very Long Mission Reference
1. Inspection with mission ref > 30 characters
2. Open advanced report
3. **Expected**:
   - Header text truncates or wraps gracefully
   - No layout overflow
4. **Verify**:
   - Badge still visible
   - Title readable

---

### 7. **Memory & Performance**

#### Test Case 7.1: Memory Leak Check
1. Open 5 different inspections sequentially
2. Navigate back and forth between them
3. Check memory usage in DevTools
4. **Expected**:
   - Memory stabilizes after each navigation
   - No continuous growth
5. **Verify**:
   - Memory < 200MB after 5 navigations
   - No app crash

#### Test Case 7.2: Battery Drain
1. Open advanced report
2. Leave screen open for 5 minutes
3. Check battery usage in device settings
4. **Expected**:
   - Minimal battery drain
   - No excessive CPU usage
5. **Verify**:
   - App not in "high battery usage" list

#### Test Case 7.3: Scroll Performance
1. Open report with 50+ photos
2. Scroll rapidly from top to bottom 10 times
3. Use React Native Performance Monitor (Dev Menu → Perf Monitor)
4. **Expected**:
   - JS frame rate: 55-60 FPS
   - UI frame rate: 55-60 FPS
5. **Verify**:
   - No dropped frames
   - Smooth scroll motion

---

## 🌐 Web Testing Scenarios

### 1. **Advanced View Toggle**

#### Test Case W1.1: Switch Views
1. Open Rapports Inspection page
2. Toggle "Vue avancée" switch
3. **Expected**:
   - Advanced gallery appears
   - Photos grouped by type
   - Lightbox functional
4. **Verify**:
   - Toggle state persists on refresh (if implemented)

### 2. **PDF Actions (Web)**

#### Test Case W2.1: Server PDF Generation
1. Click "PDF serveur" button
2. **Expected**:
   - Button disabled during generation
   - Badge appears on success
   - Download link functional
4. **Verify**:
   - Matches mobile PDF URL

---

## 🐛 Known Issues to Verify

### Issue 1: FastImage Android Placeholder
**Description**: Some Android devices show gray placeholder briefly  
**Severity**: Low (cosmetic)  
**Workaround**: None (expected behavior)  
**Test**: Verify it disappears within 500ms

### Issue 2: AsyncStorage Size Limit
**Description**: ~10MB limit on some devices  
**Severity**: Medium  
**Test**: Cache 20+ inspections, monitor storage

### Issue 3: Thumbnail Missing Fallback
**Description**: Old photos without thumbnail_url  
**Severity**: Low (gracefully handled)  
**Test**: Verify full URL fallback works

---

## ✅ Acceptance Criteria

All tests must pass before deployment:

- [ ] All 7 mobile test scenarios pass
- [ ] No crashes or errors in any test case
- [ ] Performance metrics meet targets (FPS, memory, load time)
- [ ] Edge cases handled gracefully
- [ ] Offline mode works with cached data
- [ ] PDF generation works end-to-end
- [ ] No memory leaks detected
- [ ] Web parity (advanced view matches mobile features)

---

## 📊 Performance Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Cold Start Load | < 2s | ___s | ⏳ |
| Warm Start Load | < 500ms | ___ms | ⏳ |
| Scroll FPS (50 photos) | > 55 FPS | ___ FPS | ⏳ |
| Memory Usage | < 150MB | ___MB | ⏳ |
| Cache Hit Rate | > 80% | ___% | ⏳ |

---

## 🛠️ Testing Tools

1. **React Native Debugger** - Memory profiling
2. **Flipper** - Network inspector, layout inspector
3. **Expo Go** - Quick testing on physical device
4. **Chrome DevTools** - Web testing
5. **Device Settings** - Battery usage, storage

---

## 📝 Bug Report Template

```
**Title**: [Component] Brief description

**Environment**:
- Device: [e.g., Samsung Galaxy S10]
- OS: [e.g., Android 12]
- App Version: [e.g., 1.2.0]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**:


**Actual**:


**Screenshots**:


**Logs**:


**Severity**: [Critical / High / Medium / Low]
```

---

## 🎯 Next Steps After QA

1. Fix all critical and high-severity bugs
2. Document medium/low bugs for future sprints
3. Update performance metrics in MOBILE_PERFORMANCE_OPTIMIZATIONS.md
4. Deploy to production if all tests pass
5. Monitor crash analytics (Sentry, Crashlytics)
6. Collect user feedback

---

**Last Updated**: 2024-11-01  
**Tested By**: [Name]  
**Test Duration**: [Hours]  
**Bugs Found**: [Count]  
**Status**: ⏳ In Progress
