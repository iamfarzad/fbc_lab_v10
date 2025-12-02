# Admin Feature Comparison Matrix

**Date:** 2025-12-02
**Objective:** Compare admin features across v5, v7, v8, and v10 to guide restoration.

## API Endpoints Comparison

| Endpoint | v5 | v7 | v8 | v10 (Current) | Action |
|----------|----|----|----|---------------|--------|
| `login` | ✅ | ✅ | ✅ | ✅ | Done |
| `logout` | ✅ | ✅ | ✅ | ✅ | Done |
| `sessions` | ✅ | ✅ | ✅ | ✅ | Done |
| `ai-performance` | ✅ | ✅ | ✅ | ✅ | Done |
| `token-costs` | ⚠️ (`token-usage`) | ✅ | ✅ | ✅ | Done |
| `analytics` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `conversations` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `email-campaigns` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `failed-conversations` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `flyio/settings` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `flyio/usage` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `interaction-analytics` | ❌ | ✅ | ✅ | ❌ | **Port** (New in v7) |
| `logs` | ❌ | ✅ | ✅ | ❌ | **Port** (New in v7) |
| `meetings` | ❌ | ✅ | ✅ | ❌ | **Port** (New in v7) |
| `real-time-activity` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `security-audit` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `stats` | ✅ | ✅ | ✅ | ❌ | **Port** |
| `system-health` | ⚠️ (`system-status`) | ✅ | ✅ | ❌ | **Port** |
| `leads` | ✅ | ❌ | ❌ | ❌ | Skip (Likely merged into conversations) |
| `cache-cleanup` | ✅ | ❌ | ❌ | ❌ | Skip (v5 only) |
| `monitoring` | ✅ | ❌ | ❌ | ❌ | Skip (v5 only) |

## UI Components Comparison

| Component | v7/v8 | v10 (Current) | Action |
|-----------|-------|---------------|--------|
| `AdminLayout` | ✅ | ❌ | **Port** |
| `AdminDashboard` | ✅ | ✅ (Basic) | **Upgrade** |
| `OverviewSection` | ✅ | ❌ | **Port** |
| `ConversationsSection` | ✅ | ❌ | **Port** |
| `LeadsSection` | ✅ | ❌ | **Port** |
| `TokenCostAnalyticsSection`| ✅ | ❌ | **Port** |
| `SecurityAuditSection` | ✅ | ❌ | **Port** |
| `MeetingCalendarSection` | ✅ | ❌ | **Port** |
| `FailedConversationsSection`| ✅ | ❌ | **Port** |
| `EmailCampaignSection` | ✅ | ❌ | **Port** |
| `InteractionAnalyticsSection`| ✅ | ❌ | **Port** |
| `AIPerformanceMetricsSection`| ✅ | ❌ | **Port** |
| `RealTimeActivitySection` | ✅ | ❌ | **Port** |
| `FlyIOCostControlsSection` | ✅ | ❌ | **Port** |
| `SystemHealthSection` | ✅ | ❌ | **Port** |
| `LogsSection` | ✅ | ❌ | **Port** |
| `ApiTesterSection` | ✅ | ❌ | **Port** |
| `AdminChatPanel` | ✅ | ❌ | **Port** |
| `AdminChatHistory` | ✅ | ❌ | **Port** |

## Merge Strategy

1. **Target Source:** v8 (appears identical to v7 but newest).
2. **Priority:**
   - 1. API Routes (Backend foundation)
   - 2. UI Components (Frontend visualization)
3. **Process:**
   - Port file from v8.
   - Update imports to `src/...` absolute paths.
   - Verify dependencies (Supabase client, Types).
   - Lint and Fix.

