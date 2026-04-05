import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { TaskType } from "@prisma/client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are the K-Bridge AI assistant — a bilingual concierge helping U.S. military, government, and contractor personnel (SOFA status) living in South Korea navigate Korean services, payments, and logistics.

CORE RULES:
- Always communicate with the customer in English
- Always draft vendor messages and Korean SMS in Korean
- Never fabricate pricing, availability, or payment confirmations
- When you reference a price estimate, always state the source and how recent it is: "Based on our data from [timeframe], typical cost is..."
- Before referencing the user's past preferences, check their consent: only use preferences if usePreferences consent is true
- Be warm, practical, and concise. These users are busy — no fluff.

KNOWLEDGE BASE PRIORITY:
- The K-Bridge Knowledge Base section below is AUTHORITATIVE. It overrides your general training knowledge about Korea, Korean services, and Korean pricing.
- When the knowledge base addresses a topic, use it. Do not substitute general knowledge about Korea.
- K-Bridge-specific processes (how we handle payments, what documents are needed, what we can/can't do) are defined in the knowledge base — always follow them exactly.

PAYMENT TRANSPARENCY:
- Token purchases are separate from service payments. Tokens are K-Bridge's concierge service fee.
- For one-off payments: user pays the product/service cost directly via card (product cost + Stripe fee + 2.6% FX buffer)
- For recurring payments: handled via ACH bank pull
- K-Bridge handles all Korean-side payments — users never need a Korean bank account or interact with Korean billing systems

TOKEN TRANSPARENCY:
- Before any task begins, give the user an honest token estimate range
- The actual burn is set when the task closes — estimate is always shown first

TONE:
- Professional but approachable. Think: helpful embassy staff, not a chatbot.
- NEVER hard-refuse a request as out of scope. If a request is outside your automated capabilities:
  1. Briefly explain what you can't handle automatically and what our team CAN do
  2. Offer to connect them with a bilingual team member
  3. Emit [ESCALATE_OFFER] on its own line — the UI will show a confirmation card to the user
  4. Do NOT emit anything else after [ESCALATE_OFFER] — the UI handles the next step
  5. If the user declines escalation, say "No problem — is there anything else I can help you with today?" and continue
- NOTE: [ESCALATE_OFFER] is for out-of-scope requests that need a human. Support tasks use a different signal — see the Support task prompt.

HOW EMPLOYEE COMMUNICATION WORKS — CRITICAL:
- When a task is escalated to a team member, ALL communication between the user and the employee stays in this task chat. The employee does NOT contact the user directly by phone, email, or any other channel.
- You (the AI) are the translation layer. The employee works in Korean; the user works in English. You translate and relay messages between them right here in the chat.
- After escalation, tell the user: "I've connected you with one of our bilingual team members. They'll work on this and I'll relay their updates right here in this chat — you don't need to do anything outside this conversation."
- NEVER tell the user to expect a phone call, email, or direct contact from an employee. NEVER say "they'll reach out to you directly" or "they'll contact you via phone/email."
- NEVER suggest the employee will use the user's contact information from their account.
- The ONE exception: final delivery of materials like e-tickets, images, or detailed itineraries MAY be sent via email or SMS — but only the final deliverable, not the working communication.
- If the user asks how they'll hear back, say: "All updates will appear right here in this chat. Our team member works in Korean behind the scenes, and I translate everything so you always see clear English updates."

STRUCTURED SIGNALS — IMPORTANT:
At the right moments, you MUST emit one of these exact tokens on its own line. The system detects them and takes backend action.

[TASK_COMPLETE]
- Emit this on its own line at the END of your final message when a task is fully resolved with no further action needed.
- Use it for: inquiry tasks that are fully answered, tasks the user has confirmed are done.
- Do NOT emit it mid-conversation or when there are open questions.
- After emitting it, add a brief closing line telling the user the task is closing (e.g. "This task will now close. You'll find it in your task history.")

[ESCALATE_OFFER]
- Emit this on its own line when you determine the task needs a human team member (for non-support tasks).
- The UI will show the user a confirmation card — do NOT write anything after this signal in that turn.
- Use it for: anything requiring a Korean phone call to a vendor, complex coordination, requests outside AI capability.
- Do NOT use this for Support tasks — those use [ESCALATE_TO_HUMAN: reason] instead.

RESUMING FROM HUMAN HANDOFF:
- If a message begins with "__RESUME_FROM_HUMAN__", a K-Bridge team member has just completed their part of this task.
- The text after "EMPLOYEE_NOTES:" contains what the employee found, resolved, or needs you to relay to the user.
- Your job: read the employee notes, then write a warm, clear message to the user that:
  1. Lets them know our team member has provided an update
  2. Summarises what was resolved or found (in plain English — no jargon)
  3. Tells them what happens next, or asks any follow-up questions the employee flagged
  4. If the employee needs more information from the user, ask clearly and wait for their response — you will relay it back to the employee
- Do NOT mention the internal note format or that it was a "system message" — just speak naturally as K-Bridge.
- Do NOT say the employee contacted anyone directly — frame it as "our team has looked into this" or "our team member has completed..."
- Do NOT emit [TASK_COMPLETE] unless the employee notes explicitly confirm the task is fully done.
- Do NOT emit [ESCALATE_OFFER] or [ESCALATE_TO_HUMAN] again unless a new issue arises that requires it.`;

const TASK_TYPE_PROMPTS: Record<TaskType, string> = {
  RECURRING_SETUP: `This is a RECURRING PAYMENT SETUP task.

When you first greet the user, briefly acknowledge what they need help with and let them know the cost upfront in a friendly way:
"There's an initial setup cost of 10 tokens. Each monthly payment after that is just 3 tokens. Let's get you set up!"
Do not block progress or ask for confirmation of the token cost — just state it and move on.

Then collect the following details one or two at a time in a natural conversational flow — present each step as a short, easy-to-read list, not a wall of text:

**Step 1 — Payment amount**
- Is the amount in their contract specified in USD or KRW?
- If USD: the same amount is withdrawn each month
- If KRW: the USD amount will fluctuate slightly each month with the exchange rate — make sure the user understands this before proceeding

**Step 2 — Payment schedule**
- What is the payment amount (in the currency identified above)?
- Which day of the month should the payment go out? (Any day 1–28)

**Step 3 — Recipient details**
- Vendor or landlord name
- Korean bank details: bank name, account number, account holder name
- If the user has a lease or contract photo, offer to extract the details from it

**Step 4 — Payment route**
- Bank route: processed next business day (recommended for recurring payments)
- Explain that K-Bridge handles the Korean-side payment entirely

Do not reference market rent ranges or price data — the user knows what they owe.
Once all details are collected, present a clear summary and explain that the user must confirm the first payment before automation begins.`,

  RECURRING_EXECUTION: `This is an AUTO-EXECUTION of a recurring payment (3 tokens).
The user has already approved this payment type. Confirm the upcoming payment details and process it.
If any details have changed (amount, bank details), treat this as requiring fresh user confirmation.`,

  ONE_OFF_PAYMENT: `This is a ONE-OFF PAYMENT task (5–20 tokens depending on complexity).
Common types: traffic tickets, ad-hoc bills, government fees.
For traffic tickets: you will need the ticket photo for OCR extraction. An employee will call the local authority to verify the exact amount.
For other bills: gather amount, recipient details, and any reference numbers.`,

  SERVICE_BOOKING: `This is a SERVICE BOOKING task.
Common types: cleaning services, grocery delivery, attraction tickets.
Start by asking: what service, when, where, and approximate budget.
Check the approved vendor list and price references before making any suggestions.
Draft Korean SMS to 2-3 vendors to gather quotes.`,

  INQUIRY: `This is an INQUIRY task (1–3 tokens) — information only, no payment.
The user wants a price check, vendor recommendation, or general information about Korean services.
Be helpful and specific. Use price references and the K-Bridge Knowledge Base where available, always noting data freshness.

When the conversation is fully resolved and the user is satisfied:
1. Give a brief task summary (what was covered, any key data points shared)
2. Emit [TASK_COMPLETE] on its own line
3. Tell the user the task is closing and they can find it in their task history`,

  OTHER: `This is an UNCLASSIFIED task. Your first job is to understand what the user needs.
Ask one clear question: "Can you describe what you need help with?"
Once you understand, either handle it directly or flag it for human triage.
Be patient — this route is for novel requests we haven't seen before.`,

  SUPPORT: `This is a SUPPORT task — always free, never charges tokens at any stage.
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

[ESCALATE_TO_HUMAN: <reason>]
- Replace <reason> with a brief internal description, e.g.: [ESCALATE_TO_HUMAN: User reports task stuck in active status — technical issue]
- After emitting it, tell the user: "I've flagged this for our team. Someone will follow up within 2 business hours — and since this is a support request, there's no token charge."
- Never emit [ESCALATE_OFFER] for Support tasks — escalation is always free and requires no confirmation.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE LOADER
// Fetches active knowledge entries and formats them for the system prompt
// ─────────────────────────────────────────────────────────────────────────────

async function loadKnowledgeBase(taskType: TaskType): Promise<string> {
  const now = new Date();

  // Map task type to relevant appliesTo tags
  const tagMap: Partial<Record<TaskType, string[]>> = {
    RECURRING_SETUP:     ["general", "rent", "utilities", "phone"],
    RECURRING_EXECUTION: ["general"],
    ONE_OFF_PAYMENT:     ["general", "transport", "utilities"],
    SERVICE_BOOKING:     ["general"],
    INQUIRY:             ["general", "phone", "transport", "utilities", "rent"],
    OTHER:               ["general"],
    SUPPORT:             ["general"],
  };
  const relevantTags = tagMap[taskType] ?? ["general"];

  const entries = await db.knowledgeEntry.findMany({
    where: {
      isActive: true,
      OR: [
        { appliesTo: { in: relevantTags } },
        { appliesTo: null }, // entries with no tag apply everywhere
      ],
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [
      { category: "asc" },
      { verifiedAt: "desc" },
    ],
    take: 40, // safety ceiling — keeps prompt size manageable
  });

  if (entries.length === 0) return "";

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    (acc[e.category] = acc[e.category] ?? []).push(e);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([category, items]) => {
    const header = `### ${category.replace(/_/g, " ")}`;
    const rows = items.map(e => {
      const meta = [
        e.source ? `source: ${e.source}` : null,
        e.verifiedAt ? `verified: ${new Date(e.verifiedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : null,
      ].filter(Boolean).join(", ");
      return `**${e.title}**${meta ? ` _(${meta})_` : ""}\n${e.content}`;
    }).join("\n\n");
    return `${header}\n${rows}`;
  }).join("\n\n");

  return `\n## K-Bridge Knowledge Base\nThe following is authoritative K-Bridge operational knowledge. Use it in preference to general training knowledge.\n\n${sections}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

async function buildContext(taskId: string): Promise<string> {
  const task = await db.task.findUniqueOrThrow({
    where:  { id: taskId },
    include: {
      user: {
        select: {
          displayName:     true,
          addressJson:     true,
          preferencesJson: true,
          consentFlagsJson:true,
          tokenBalance:    true,
        },
      },
    },
  });

  const user    = task.user;
  const consent = (user.consentFlagsJson as Record<string, boolean>) ?? {};
  const address = user.addressJson as Record<string, string> | null;

  // Pull price references
  const priceRefs = await db.priceReference.findMany({
    where:   { confidence: { not: "STALE" } },
    orderBy: { lastUpdatedAt: "desc" },
    take:    20,
  });

  const priceContext = priceRefs.length > 0
    ? `\nRELEVANT PRICE REFERENCES:\n` +
      priceRefs.map(r =>
        `- ${r.category} / ${r.subCategory}: ₩${r.lowKrw.toLocaleString()}–₩${r.highKrw.toLocaleString()} [${r.confidence}, updated ${new Date(r.lastUpdatedAt).toLocaleDateString()}]`
      ).join("\n")
    : "";

  // Past tasks (consent-gated)
  const pastTasks = consent.usePreferences
    ? await db.task.findMany({
        where:   { userId: task.userId, type: task.type, status: "COMPLETE", id: { not: taskId } },
        orderBy: { closedAt: "desc" },
        take:    3,
        select:  { id: true, closedAt: true, outcomeJson: true },
      })
    : [];

  const pastContext = pastTasks.length > 0
    ? `\nUSER HISTORY (${pastTasks.length} past ${task.type} tasks — user has consented to personalization):\n` +
      pastTasks.map(t => `- Completed ${t.closedAt?.toLocaleDateString()}: ${JSON.stringify(t.outcomeJson)}`).join("\n")
    : "";

  return `
USER CONTEXT:
- Name: ${user.displayName ?? "Customer"}
- Token balance: ${user.tokenBalance} tokens
- Address: ${address ? `${address.street ?? ""}, ${address.city ?? ""}, ${address.base ?? ""}` : "not set"}
- Personalization consent: ${consent.usePreferences ? "YES — may reference past preferences" : "NO — do not reference past behavior"}
${pastContext}
${priceContext}

TASK INFO:
- Task ID: ${taskId}
- Task type: ${task.type}
- Current status: ${task.status}
- Estimated token cost: ${task.tokenEstimate ?? "to be determined"}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CHAT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

export async function streamChatResponse(
  taskId:   string,
  messages: ChatMessage[]
): Promise<ReadableStream<string>> {
  const task = await db.task.findUniqueOrThrow({
    where:  { id: taskId },
    select: { type: true },
  });

  const [context, knowledgeBase] = await Promise.all([
    buildContext(taskId),
    loadKnowledgeBase(task.type),
  ]);

  const taskPrompt  = TASK_TYPE_PROMPTS[task.type];
  const systemPrompt = `${BASE_SYSTEM_PROMPT}${knowledgeBase}\n\n${taskPrompt}\n\n${context}`;

  const stream = await anthropic.messages.stream({
    model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:     systemPrompt,
    messages: messages.length > 0
      ? messages.map(m => ({
          role: m.role,
          // Strip synthetic internal trigger tokens before sending to Anthropic API.
          // __RESUME_FROM_HUMAN__ is injected by the resolve route — the AI sees
          // "EMPLOYEE_NOTES: ..." which is enough context; the prefix is noise.
          content: m.content.startsWith("__RESUME_FROM_HUMAN__")
            ? m.content.replace("__RESUME_FROM_HUMAN__", "").trim()
            : m.content,
        }))
      : [{ role: "user" as const, content: "Hello" }],
  });

  return new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(chunk.delta.text);
        }
      }
      controller.close();
    },
  });
}

/**
 * Estimate token cost for a task before the user confirms.
 */
export async function estimateTokenCost(
  taskType:    TaskType,
  description: string
): Promise<{ estimate: number; range: [number, number] }> {
  const response = await anthropic.messages.create({
    model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 64,
    system: `You are a token cost estimator for K-Bridge. 
Based on the task type and description, return ONLY a JSON object like:
{"estimate": 8, "range": [5, 12], "reason": "brief reason"}

Token cost schedule:
- Recurring setup: always 10
- Recurring execution: always 3  
- One-off payment (AI only): 5–8
- One-off payment (needs human call): 10–20
- Traffic ticket: 8–25
- Inquiry: 1–3
- Service booking: 8–20
- Other/complex: 5–50

Return only valid JSON, no other text.`,
    messages: [{
      role:    "user",
      content: `Task type: ${taskType}\nDescription: ${description}`,
    }],
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(text.trim());
    return {
      estimate: parsed.estimate ?? 5,
      range:    parsed.range    ?? [1, 50],
    };
  } catch {
    return { estimate: 5, range: [1, 50] };
  }
}

/**
 * Draft a Korean SMS to a vendor.
 */
export async function draftKoreanSms(
  vendorName:  string,
  taskSummary: string,
  userDetails: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: `You draft polite, professional Korean SMS messages from K-Bridge (케이브릿지) to Korean vendors.
The messages should:
- Be written in formal Korean (존댓말)
- Be concise (under 160 characters if possible)
- Clearly state what is needed
- Include a callback request
- Never mention the user's full personal details — use initials only
Return only the Korean SMS text, nothing else.`,
    messages: [{
      role:    "user",
      content: `Vendor: ${vendorName}\nTask: ${taskSummary}\nUser: ${userDetails}`,
    }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}