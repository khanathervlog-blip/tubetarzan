-- ── Phase 10: Security hardening ─────────────────────────────────────────────────────────────────────────
-- Run in the Supabase SQL editor AFTER deploying the security-hardening code. Safe to run more than once.
--
-- WHY: the "Users can update own profile" policy allows a signed-in user to change ANY column of their own
-- profile from the browser console - including subscription_plan, subscription_status and is_test_account.
-- That lets anyone unlock paid plans for free (verified on 2026-11-13 with a temporary test account).
--
-- FIX: keep the policy (users can still only touch their own row) but only allow the five columns the app
-- really edits from the browser. Plans, billing, quotas, channels, tokens and test flags can now only be
-- changed by the server (service role), e.g. the payment webhook and admin tools.

-- 1. profiles: column-level update rights for signed-in users
revoke update on table public.profiles from anon, authenticated;
grant update (full_name, youtube_api_key, youtube_api_key_verified, api_key_setup_completed, onboarding_completed)
  on table public.profiles to authenticated;
-- profiles rows are created by the sign-up trigger; users never insert or delete them directly
revoke insert, delete, truncate on table public.profiles from anon, authenticated;

-- 2. Site-wide settings and reference data: anyone may READ (the landing page needs it), nobody may WRITE
--    from the browser. Admin screens write through admin-checked server routes with the service role.
revoke insert, update, delete, truncate on table public.admin_settings from anon, authenticated;
revoke insert, update, delete, truncate on table public.niche_rpm_data from anon, authenticated;

-- 3. Check (optional): list every table that still has RLS switched OFF. Expect no rows.
select schemaname, tablename
  from pg_tables
 where schemaname = 'public' and rowsecurity = false;

-- 4. Check (optional): review every policy in one place.
-- select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2;

-- To undo step 1 (not recommended):  grant update on table public.profiles to authenticated;
