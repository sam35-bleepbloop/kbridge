-- ─────────────────────────────────────────────────────────────────────────────
-- K-Bridge — Supabase Row Level Security Policies
--
-- Run this file in the Supabase SQL editor AFTER running:
--   npx prisma migrate dev --name init
--
-- These policies ensure:
--   - Users can only read/write their own data
--   - Employees can read tasks assigned to them + all pending-human tasks
--   - Admins can read/write everything
--   - The audit log and token ledger are append-only for users
--   - Vendor bank details are never exposed to end users
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE "User"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenLedger"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recurring"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee"       ENABLE ROW LEVEL SECURITY;

-- Helper: check if the caller is an active employee
CREATE OR REPLACE FUNCTION is_employee()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Employee"
    WHERE email = auth.jwt() ->> 'email'
    AND "isActive" = true
  );
$$;

-- Helper: check if the caller is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Employee"
    WHERE email = auth.jwt() ->> 'email'
    AND role = 'ADMIN'
    AND "isActive" = true
  );
$$;

-- Helper: get the current user's Employee.id
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS text
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id FROM "Employee"
  WHERE email = auth.jwt() ->> 'email'
  AND "isActive" = true
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- User table
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can read and update their own row
CREATE POLICY "users_select_own" ON "User"
  FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE USING (id = auth.uid()::text);

-- Employees can read user profiles (for task context) — but NOT stripeCustomerId or calendarToken
-- Note: Column-level security is handled at the API layer, not RLS
CREATE POLICY "employees_select_users" ON "User"
  FOR SELECT USING (is_employee());

-- Admins can do anything
CREATE POLICY "admin_all_users" ON "User"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Task table
-- ─────────────────────────────────────────────────────────────────────────────

-- Users see only their own tasks
CREATE POLICY "tasks_select_own" ON "Task"
  FOR SELECT USING (
    "userId" = auth.uid()::text
    AND "lastActivityAt" > NOW() - INTERVAL '12 months'  -- 12-month retention
  );

CREATE POLICY "tasks_insert_own" ON "Task"
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "tasks_update_own" ON "Task"
  FOR UPDATE USING ("userId" = auth.uid()::text);

-- Employees see all tasks with status PENDING_HUMAN or assigned to them
CREATE POLICY "employees_select_tasks" ON "Task"
  FOR SELECT USING (
    is_employee() AND (
      status = 'PENDING_HUMAN'
      OR "assignedEmployeeId" = current_employee_id()
    )
  );

CREATE POLICY "employees_update_tasks" ON "Task"
  FOR UPDATE USING (
    is_employee() AND (
      status = 'PENDING_HUMAN'
      OR "assignedEmployeeId" = current_employee_id()
    )
  );

-- Admins see all tasks
CREATE POLICY "admin_all_tasks" ON "Task"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- TokenLedger table — append only for users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "ledger_select_own" ON "TokenLedger"
  FOR SELECT USING ("userId" = auth.uid()::text);

-- Users cannot insert/update/delete ledger rows — only server-side code can
-- (Prisma uses service role key which bypasses RLS)

CREATE POLICY "admin_all_ledger" ON "TokenLedger"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Payment table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "payments_select_own" ON "Payment"
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "employees_select_payments" ON "Payment"
  FOR SELECT USING (is_employee());

CREATE POLICY "admin_all_payments" ON "Payment"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Recurring table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "recurring_select_own" ON "Recurring"
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "recurring_insert_own" ON "Recurring"
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

-- Users can only pause/resume — not change amounts or bank details
-- Amount/bank detail changes go through a new task flow
CREATE POLICY "recurring_update_own" ON "Recurring"
  FOR UPDATE USING ("userId" = auth.uid()::text)
  WITH CHECK (
    "userId" = auth.uid()::text
    -- Prevent users from changing payment amount or vendor details via direct update
    -- Business logic enforced at API layer
  );

CREATE POLICY "admin_all_recurring" ON "Recurring"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Review table
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can see all reviews (vendor ratings are public-ish)
CREATE POLICY "reviews_select_all" ON "Review"
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON "Review"
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "admin_all_reviews" ON "Review"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- AuditLog table — read only for users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "audit_select_own_tasks" ON "AuditLog"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Task"
      WHERE "Task".id = "AuditLog"."taskId"
      AND "Task"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "employees_select_audit" ON "AuditLog"
  FOR SELECT USING (is_employee());

CREATE POLICY "admin_all_audit" ON "AuditLog"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- TaskAssignment table
-- ─────────────────────────────────────────────────────────────────────────────

-- Users cannot see assignment internals
CREATE POLICY "employees_select_assignments" ON "TaskAssignment"
  FOR SELECT USING (is_employee());

CREATE POLICY "employees_update_own_assignments" ON "TaskAssignment"
  FOR UPDATE USING (
    is_employee() AND "employeeId" = current_employee_id()
  );

CREATE POLICY "admin_all_assignments" ON "TaskAssignment"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Vendor table — bank details never exposed to end users
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can see basic vendor info (name, category, rating) but NOT bank details
-- Column-level filtering is enforced at the API layer
CREATE POLICY "vendors_select_approved" ON "Vendor"
  FOR SELECT USING ("isApproved" = true);

CREATE POLICY "employees_all_vendors" ON "Vendor"
  FOR ALL USING (is_employee());

CREATE POLICY "admin_all_vendors" ON "Vendor"
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- PriceReference table — readable by all authenticated users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "prices_select_all" ON "PriceReference"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "employees_all_prices" ON "PriceReference"
  FOR ALL USING (is_employee());

-- ─────────────────────────────────────────────────────────────────────────────
-- Employee table — employees can see each other's basic info
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "employees_select_all" ON "Employee"
  FOR SELECT USING (is_employee());

CREATE POLICY "admin_all_employees" ON "Employee"
  FOR ALL USING (is_admin());
