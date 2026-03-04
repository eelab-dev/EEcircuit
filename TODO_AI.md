# TODO: AI Chat Backend Proxy

## Goal

Allow public EEcircuit users to ask 3 AI-powered circuit questions per 24 hours
without needing their own API key. Rate limiting is enforced server-side.

## Architecture

```
EEcircuit website (GitHub Pages, static)
    ↓ POST /api/chat  (no user key required)
Vercel Edge Function  (eecircuit-api.vercel.app)
    ↓ check rate limit → Vercel KV (Redis)
    ↓ forward to OpenAI with secret key
    ← AI response
EEcircuit website
```

## Rate Limiting

- **3 requests per user per 24 hours** (rolling window)
- Identity: IP address + browser fingerprint (localStorage UUID + user agent hash)
- MAC address is NOT accessible from a browser (network layer only)
- Storage: Vercel KV (free tier: 30MB, sufficient for millions of rate limit entries)
- After 3 requests: show message "Free quota used. Provide your own API key to continue,
  or try again in 24 hours."

## Why Not Expose the Key in the Frontend?

Any API key embedded in browser JS is visible in DevTools / network tab / page source.
Anyone can extract it and make unlimited calls. The proxy keeps the key server-side
as a Vercel environment variable, never sent to the browser.

## Selected Models (OpenAI only for the free tier)

| Model | Use case |
|---|---|
| `gpt-5.2` | Default — latest, best reasoning |
| `gpt-5.2-pro` | Premium option for users with own key |
| `gpt-4o` | Fallback — reliable, lower cost |

## Implementation Steps

### 1. New Vercel project: `eecircuit-api`

Small project (~20 lines), separate from EEcircuit website repo.

**File: `api/chat.ts`** (Vercel Edge Function)
```typescript
import { kv } from "@vercel/kv";

export const config = { runtime: "edge" };

const FREE_QUOTA = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req: Request) {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://gaofeng-fan.github.io",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Rate limit check
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const body = await req.json();
  const fingerprint = body.fingerprint ?? "";
  const key = `rl:${ip}:${fingerprint}`;

  // User providing their own key bypasses rate limit
  const userKey = body.userApiKey;
  const apiKey = userKey || process.env.OPENAI_API_KEY!;

  if (!userKey) {
    const count = (await kv.get<number>(key)) ?? 0;
    if (count >= FREE_QUOTA) {
      return Response.json(
        { error: "Free quota (3/day) exceeded. Provide your own OpenAI API key to continue." },
        { status: 429 }
      );
    }
    await kv.set(key, count + 1, { px: WINDOW_MS });
  }

  // Forward to OpenAI
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model ?? "gpt-5.2",
      messages: body.messages,
      max_tokens: 1024,
    }),
  });

  const data = await openaiRes.json();
  return Response.json(data, {
    headers: { "Access-Control-Allow-Origin": "https://gaofeng-fan.github.io" },
  });
}
```

### 2. Vercel setup

1. Create new repo `eecircuit-api`, push to GitHub
2. Import into Vercel dashboard
3. Add env var: `OPENAI_API_KEY=sk-...`
4. Add Vercel KV store (Storage tab → KV → Create)
5. Deploy → get URL: `https://eecircuit-api.vercel.app`

### 3. EEcircuit frontend changes

In `src/ai/aiClient.ts`:
- Default endpoint: `https://eecircuit-api.vercel.app/api/chat`
- If user provides own key: call OpenAI directly (bypass proxy)
- Send `fingerprint` field: `localStorage.getItem("userId") || crypto.randomUUID()`
  (generate once, persist in localStorage)

In `src/ai/AiChat.tsx`:
- Show remaining free quota: "2 free questions remaining today"
- Show input for own API key (optional, for power users)
- After quota exhausted: show "Provide your own key or wait 24h" message

## Cost Estimate

- gpt-5.2: ~$5/MTok input, ~$20/MTok output
- Per question: ~2000 tokens context + ~500 output ≈ $0.015
- 3 questions/user/day @ 100 users/day = 300 questions = $4.50/day
- Scale to 1000 users/day = $45/day — monitor and add stricter limits if needed

## Notes

- Keep "bring your own key" option in the UI — useful for power users and testing
- The proxy only supports OpenAI for the free tier (simpler, single key to manage)
- Anthropic and Google remain available for users with their own keys
- Add CORS restriction to only allow requests from the EEcircuit GitHub Pages domain

---

## Monetization

The AI feature has two natural revenue angles:

### 1. AI question credits (pay-per-use)

Beyond the 3 free questions/day, sell credit packs:

| Tier | Price | Credits |
|---|---|---|
| Free | $0 | 3/day |
| Starter | $5 | 100 credits |
| Pro | $20 | 500 credits |
| Unlimited | $15/month | Unlimited |

Each "credit" = one AI question. Implementation: Stripe one-time payment or
subscription → store credit balance in Vercel KV keyed by user ID.

### 2. Domain-specific analog AI (premium model)

Fine-tune or prompt-engineer a model specifically for analog circuit design:
- Trained on SPICE netlists, analog design textbooks, application notes
- Understands analogpy syntax natively
- Can suggest component values, explain simulation results, debug convergence

Charge a premium for this specialized model vs. the generic GPT/Claude free tier.
Users who pay get routed to the fine-tuned model; free tier uses the standard model.

### 3. AI-assisted PDK-aware design (long-term)

Combine with the Spectre/PDK cloud compute (see TODO_spectre_PDK.md):
- AI suggests sizing for a specific process node (e.g. TSMC N28)
- Automatically generates a simulation-ready netlist
- Runs the simulation on cloud backend
- Returns results with AI interpretation

This closes the loop: design → simulate → explain, all in one session.
Bundle pricing: AI credits + simulation credits in one subscription.

### Implementation path

1. Add user accounts (Auth0 or Clerk) — prerequisite for all paid tiers
2. Integrate Stripe for credit purchases
3. Store credit balance in Vercel KV
4. Route free vs. paid users to different model endpoints
5. Dashboard: show remaining credits, purchase history
