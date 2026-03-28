import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/lib/tokens/engine.ts';
let content = readFileSync(path, 'utf8');

const bad = `};\n    }\n\n    const newBalance = user.tokenBalance - amount;`;

const good = `};
// ─────────────────────────────────────────────────────────────────────────────
// CORE ENGINE FUNCTIONS
// All token mutations go through these functions — never write directly to
// the users.tokenBalance field without also creating a ledger entry.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user has enough tokens for a task.
 * Does NOT deduct — use reserveTokens or burnTokens for that.
 */
export async function hasEnoughTokens(
  userId: string,
  amount: number
): Promise<boolean> {
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { tokenBalance: true },
  });
  return (user?.tokenBalance ?? 0) >= amount;
}

/**
 * Reserve tokens at task creation (non-refundable deposit).
 * Burns TASK_OPEN_COST immediately. Remainder reserved against final burn.
 */
export async function reserveTokens(
  userId: string,
  taskId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true },
    });
    if (!user || user.tokenBalance < amount) {
      return { success: false, newBalance: user?.tokenBalance ?? 0, error: 'Insufficient tokens' };
    }

    const newBalance = user.tokenBalance - amount;`;

if (content.includes(bad)) {
  writeFileSync(path, content.replace(bad, good), 'utf8');
  console.log('SUCCESS');
} else {
  // Debug: show what we actually have around that area
  const idx = content.indexOf('OTHER:                    [5,  50],');
  console.log('MATCH FAILED — chars around join point:');
  console.log(JSON.stringify(content.slice(idx, idx + 80)));
}