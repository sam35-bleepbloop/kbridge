import { db } from '@/lib/db'

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
  let code = 'KB-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function getUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode()
  let exists = await db.user.findUnique({ where: { referralCode: code } })
  while (exists) {
    code = generateReferralCode()
    exists = await db.user.findUnique({ where: { referralCode: code } })
  }
  return code
}