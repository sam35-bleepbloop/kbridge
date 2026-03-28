import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/lib/ai/chat.ts';
let content = readFileSync(path, 'utf8');
let changed = 0;

// 1. Replace hard-refusal tone guidance with escalation offer
const oldTone = `TONE:
- Professional but approachable. Think: helpful embassy staff, not a chatbot.
- If a request is outside K-Bridge's current scope, say so clearly and suggest what you CAN help with instead.`;

const newTone = `TONE:
- Professional but approachable. Think: helpful embassy staff, not a chatbot.
- NEVER hard-refuse a request as out of scope. If a request is outside your automated capabilities:
  1. Briefly explain what you can't handle automatically
  2. Offer to escalate to a bilingual employee who can help
  3. Emit [ESCALATE_OFFER] on its own line — the UI will show a confirmation card with the token cost
  4. If the user declines, say "No problem — is there anything else I can help you with today?" and continue
- The only exception is Support tasks (technical issues, account questions) — these escalate immediately with no token charge.`;

if (content.includes(oldTone)) {
  content = content.replace(oldTone, newTone);
  changed++;
  console.log('✓ Tone section updated');
} else {
  console.log('✗ Tone section MATCH FAILED');
}

// 2. Add SUPPORT to TASK_TYPE_PROMPTS — insert before the closing }; of the record
const oldOther = `  OTHER: \`This is an UNCLASSIFIED task. Your first job is to understand what the user needs.
Ask one clear question: "Can you describe what you need help with?"
Once you understand, either handle it directly or flag it for human triage.
Be patient — this route is for novel requests we haven't seen before.\`,
};`;

const newOther = `  OTHER: \`This is an UNCLASSIFIED task. Your first job is to understand what the user needs.
Ask one clear question: "Can you describe what you need help with?"
Once you understand, either handle it directly or flag it for human triage.
Be patient — this route is for novel requests we haven't seen before.\`,

  SUPPORT: \`This is a SUPPORT task — always free, never charges tokens at any stage.
Your role: triage first, escalate immediately if human action is needed.

Handle these yourself without escalating:
- Token balance questions ("why did my balance change?")
- Task status questions ("my task seems stuck")
- How K-Bridge works, what services are available
- Account questions (DEROS, SOFA status, referral codes)
- General platform navigation

Escalate immediately (emit [ESCALATE_TO_HUMAN: <reason>]) for:
- Billing disputes or suspected errors requiring DB access
- Technical bugs preventing the user from using the platform
- Account access issues you cannot resolve in chat
- Anything requiring admin action

After emitting [ESCALATE_TO_HUMAN], tell the user: "I've flagged this for our team. Someone will follow up within 2 business hours — and since this is a support request, there's no token charge."
Never emit [ESCALATE_OFFER] for Support tasks — escalation is always free and requires no confirmation.\`,
};`;

if (content.includes(oldOther)) {
  content = content.replace(oldOther, newOther);
  changed++;
  console.log('✓ SUPPORT task type prompt added');
} else {
  console.log('✗ SUPPORT task type MATCH FAILED');
}

// 3. Add SUPPORT to tagMap in loadKnowledgeBase
const oldTagMap = `    OTHER:               ["general"],
  };`;

const newTagMap = `    OTHER:               ["general"],
    SUPPORT:             ["general"],
  };`;

if (content.includes(oldTagMap)) {
  content = content.replace(oldTagMap, newTagMap);
  changed++;
  console.log('✓ tagMap SUPPORT entry added');
} else {
  console.log('✗ tagMap MATCH FAILED');
}

if (changed === 3) {
  writeFileSync(path, content, 'utf8');
  console.log('\nSUCCESS — all 3 changes applied');
} else {
  console.log(`\nABORTED — only ${changed}/3 changes matched, file not written`);
}