import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/lib/tokens/engine.ts';
let content = readFileSync(path, 'utf8');

const marker = 'export const TOKEN_COSTS = {';
const endMarker = '};';

// Find the block from TOKEN_COSTS through TOKEN_ESTIMATE_RANGES closing brace
const startIdx = content.indexOf('// TOKEN BURN SCHEDULE');
// Find the second }; after that point (closes TOKEN_ESTIMATE_RANGES)
let closingCount = 0;
let endIdx = startIdx;
for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '}' && content[i+1] === ';') {
    closingCount++;
    if (closingCount === 2) { endIdx = i + 2; break; }
  }
}

const replacement = `// ─────────────────────────────────────────────────────────────────────────────
// TOKEN BURN SCHEDULE — REVISED v31
// Authoritative cost definitions — always reference these, never hardcode.
//
// MODEL: 1 token deducted at task creation (non-refundable deposit, credited
// toward final service fee). SUPPORT tasks are always free (0 tokens).
// Escalation to a human employee costs ESCALATION_UPLIFT additional tokens,
// shown to user via confirmation card before deduction.
//
// Completion costs below are ADDITIONAL tokens burned at task close,
// after the opening deposit has already been deducted.
// Total cost = TASK_OPEN_COST + completion cost shown here.
// ─────────────────────────────────────────────────────────────────────────────

/** Non-refundable deposit burned at task creation. Credited toward service fee.
 *  Exception: SUPPORT tasks cost 0 tokens to open. */
export const TASK_OPEN_COST = 1;

/** Additional tokens charged when user confirms escalation to a human employee.
 *  Shown on confirmation card before deduction.
 *  Total deposit on escalation = TASK_OPEN_COST + ESCALATION_UPLIFT = 4. */
export const ESCALATION_UPLIFT = 3;

export const TOKEN_COSTS = {
  // Recurring payments
  // Total: 1 (open) + 9 (completion) = 10
  RECURRING_SETUP:              9,   // Additional tokens at completion (opener already burned)
  RECURRING_EXECUTION:          3,   // Each subsequent auto-run (no opener — system-initiated)
  // One-off payments — total = 1 (open) + value below
  ONE_OFF_AI_ONLY:              4,   // AI handles fully, no human call (total: 5)
  ONE_OFF_WITH_HUMAN_CALL:      11,  // Employee makes one call (total: 12)
  // Traffic tickets
  TRAFFIC_TICKET_STANDARD:      7,   // OCR + employee verify (total: 8)
  TRAFFIC_TICKET_MULTIPLE:      17,  // Multiple tickets found (total: 18)
  // Inquiries — opener covers simple inquiry, no additional burn
  INQUIRY_SIMPLE:               0,   // No additional burn (total: 1)
  INQUIRY_RESEARCHED:           2,   // Multi-source research (total: 3)
  // Support — always free at every stage
  SUPPORT:                      0,   // Never charges tokens
  // Complex coordination
  COMPLEX_MULTI_VENDOR:         24,  // Multiple vendors, one domain (total: 25)
  COMPLEX_MULTI_DOMAIN:         39,  // Multiple vendors, multiple domains (total: 40)
  // Rare maximum
  EXCEPTIONAL:                  49,  // Extreme coordination effort (total: 50)
} as const;

// Estimate ranges shown to user (min, max) — TOTAL costs including opener
export const TOKEN_ESTIMATE_RANGES: Record<string, [number, number]> = {
  RECURRING_SETUP:          [10, 10],
  RECURRING_EXECUTION:      [3,  3],
  ONE_OFF_PAYMENT:          [5,  20],
  TRAFFIC_TICKET:           [8,  25],
  INQUIRY:                  [1,  3],
  SERVICE_BOOKING:          [8,  20],
  SUPPORT:                  [0,  0],
  OTHER:                    [5,  50],
};`;

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);
writeFileSync(path, before + replacement + after, 'utf8');
console.log('SUCCESS — lines replaced from TOKEN BURN SCHEDULE through TOKEN_ESTIMATE_RANGES closing brace');