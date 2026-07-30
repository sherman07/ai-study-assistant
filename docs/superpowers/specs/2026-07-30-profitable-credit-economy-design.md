# Synapse Profitable Credit Economy

**Status:** Approved product direction

**Date:** 30 July 2026

**Currency:** United States dollars unless stated otherwise

**Commercial objective:** Give students a generous, understandable daily experience while keeping AI usage measurable, controllable, and profitable.

## Executive decision

Synapse will use a cost-indexed credit economy rather than treating every raw token or every feature click as equal.

The internal conversion is:

> **1 Synapse credit represents US$0.0001 of direct wholesale AI usage.**

This is an internal metering unit, not stored cash, a security, or an amount redeemable by the customer. Customers buy access to Synapse services. Credits measure how much AI processing that access can consume.

The launch offer is:

| Offer | Price | Credit allocation |
|---|---:|---:|
| Free | $0 | 500 one-time welcome credits, then 50 fresh credits daily |
| Pro Monthly | $9.99/month | 1,000 fresh credits daily |
| Pro Annual | $99.99/year | 1,000 fresh credits daily |
| Small Boost | $4.99 | 10,000 purchased credits |
| Standard Boost | $9.99 | 25,000 purchased credits |
| Plus Boost | $24.99 | 70,000 purchased credits |
| Max Boost | $49.99 | 150,000 purchased credits |

Daily subscription credits reset and do not roll over. Purchased Boost Credits stay in the account until used. Synapse always spends the expiring daily balance before the purchased balance.

This design intentionally separates three ideas:

1. **Customer value:** A Pro student sees a meaningful 1,000-credit daily allowance and can complete several ordinary study activities without anxiety.
2. **Economic accuracy:** Every model, modality, and token direction is charged in proportion to its real provider cost.
3. **Profit protection:** The retail price of access and Boost Credits remains substantially higher than the wholesale AI capacity they fund.

## Product principles

### Make the allowance feel useful

A normal text upload must not routinely consume an entire Pro day. At launch, a typical Standard Notes workflow should usually cost approximately 150–350 credits. A Pro student should therefore receive roughly three to six normal text-based note generations per day, or an equivalent mixture of notes and tutor conversations.

Large visual documents, Deep Study, multi-source synthesis, generated images, broadcast audio, and realtime voice may cost considerably more because they cause materially more provider work. Synapse must explain this before starting the operation.

### Charge for work, not clicks

Two files can have very different costs. A four-page text document and a 150-slide visual presentation should not receive the same charge merely because each involved one upload. Similarly, 1,000 output tokens can cost many times more than 1,000 input tokens.

Synapse will therefore calculate credits from provider-reported usage across the complete workflow, including auxiliary calls such as visual classification, mind-map generation, translation, or title generation.

### Be predictable before being exact

Exact cost is available only after a model responds. Before an operation starts, Synapse will show:

- an expected credit range;
- a clear maximum charge;
- the balance that will be used;
- a lower-cost alternative when one is available.

Synapse reserves the displayed maximum, completes the work, settles the actual charge, and immediately releases unused reserved credits. It never takes more than the confirmed maximum from purchased Boost Credits without a new confirmation.

### Never make failure feel like theft

If Synapse does not deliver a usable result because of a platform or provider failure, reserved credits are returned automatically. Provider retries caused by Synapse infrastructure are a platform operating cost, not a surprise customer charge. A user-requested regeneration is a new billable operation and must display a new estimate.

## Why a flat token rule is unsuitable

A rule such as “one credit equals 1,000 tokens” appears simple but produces incorrect economics:

- Models have different input prices.
- Output and reasoning tokens usually cost substantially more than input tokens.
- Cached input is cheaper than uncached input.
- Images can have per-image and token-based charges.
- Realtime audio has separate text, audio input, cached input, and audio output rates.
- Transcription and speech generation use modality-specific meters.
- Some tools have per-call charges in addition to model tokens.

For example, GPT-5.4 mini is currently listed at $0.75 per million input tokens, $0.075 per million cached-input tokens, and $4.50 per million output tokens. Its output is six times the price of its uncached input. GPT-5 mini is cheaper at $0.25 input, $0.025 cached input, and $2.00 output per million tokens. A single raw-token conversion would either overcharge efficient work or lose money on expensive work.

A fixed “Generate Notes costs 200 credits” rule is easier to market but also unsafe as the only meter. Synapse may show typical action ranges for clarity, but the authoritative settlement must remain cost-indexed.

## Authoritative credit formula

For a completed workflow:

```text
direct_ai_cost_usd =
    Σ(uncached_input_tokens / 1,000,000 × input_rate)
  + Σ(cached_input_tokens / 1,000,000 × cached_input_rate)
  + Σ(output_and_reasoning_tokens / 1,000,000 × output_rate)
  + Σ(audio_usage × applicable_audio_rate)
  + Σ(image_usage × applicable_image_rate)
  + Σ(tool_calls × applicable_tool_rate)
  + Σ(other_provider_meter × applicable_rate)

raw_credits = direct_ai_cost_usd / 0.0001

charged_credits = ceiling(maximum(1, raw_credits))
```

Rules:

- Sum the full workflow before rounding. Do not round every internal call separately.
- Apply a one-credit minimum only when an external billable AI operation succeeds.
- A deterministic local operation costs zero credits.
- A cache hit that makes no new paid provider call costs zero credits.
- Count hidden reasoning tokens when the provider reports or bills them.
- Use the rate that was effective when the provider operation started.
- Record the price-book version with every settlement.
- Do not permit a negative available balance.

The markup is created when Synapse sells subscription access or Boost Credits. The metering calculation itself remains tied to direct provider cost so that product teams can compare features and providers honestly.

## Launch price book

The following rate card reflects published provider pricing reviewed on 30 July 2026. It must be stored as versioned configuration and reviewed monthly. Provider invoices remain the final authority.

### Text models used by Synapse

| Provider route | Input / 1M | Cached input / 1M | Output or reasoning / 1M | Credits / 1K input | Credits / 1K output |
|---|---:|---:|---:|---:|---:|
| OpenAI GPT-5.4 mini | $0.75 | $0.075 | $4.50 | 7.5 | 45 |
| OpenAI GPT-5 mini | $0.25 | $0.025 | $2.00 | 2.5 | 20 |
| Gemini 2.5 Flash, Developer API | $0.30 | $0.03 | $2.50 | 3 | 25 |
| Gemini 2.5 Flash, Vertex AI, no-thinking output | $0.15 | $0.0375 | $0.60 | 1.5 | 6 |
| Gemini 2.5 Flash, Vertex AI, thinking output | $0.15 | $0.0375 | $3.50 | 1.5 | 35 |

Gemini Developer API and Vertex AI are separate billable routes. The ledger must use the route actually called rather than inferring a rate from the model family name.

### Media models currently configured in Synapse

| Operation | Published wholesale price | Synapse-credit equivalent |
|---|---:|---:|
| GPT Image 1.5, medium, 1024×1536 | $0.05/image | 500 credits/image |
| GPT Image 1.5, high, 1024×1536 | $0.20/image | 2,000 credits/image |
| GPT-4o mini Transcribe, audio input | $1.25/1M audio tokens | 12.5 credits/1K audio tokens |
| GPT-4o mini Transcribe, output | $5.00/1M tokens | 50 credits/1K tokens |
| GPT-4o mini TTS, text input | $0.60/1M tokens | 6 credits/1K tokens |
| GPT-4o mini TTS, audio output | $12.00/1M audio tokens | 120 credits/1K audio tokens |
| GPT-Realtime-2, text input | $4.00/1M tokens | 40 credits/1K tokens |
| GPT-Realtime-2, text output | $24.00/1M tokens | 240 credits/1K tokens |
| GPT-Realtime-2, audio input | $32.00/1M audio tokens | 320 credits/1K audio tokens |
| GPT-Realtime-2, audio output | $64.00/1M audio tokens | 640 credits/1K audio tokens |

Realtime voice is materially more expensive than ordinary text. It must display a live balance meter and a hard spending stop. Synapse must not market realtime voice as equivalent to unlimited text tutoring.

The currently configured GPT-4o mini TTS model is marked deprecated in OpenAI's model catalogue. Migration should be planned separately before its retirement. A replacement model receives its own price-book entry; historical usage retains the old rate and model identifier.

## Expected feature costs

These are customer-facing planning ranges, not guaranteed fixed charges. They are based on the current Synapse pipeline, current model routes, present note-length targets, and representative rather than production-observed token distributions.

| Customer action | Launch estimate | Experience expectation |
|---|---:|---|
| Short typed tutor question | 5–25 credits | Many interactions per day |
| Quick Review from a small text file | 60–150 credits | Approximately 6–16 per Pro day |
| Standard Notes from a normal text file | 150–350 credits | Approximately 3–6 per Pro day |
| Deep Study from a normal text file | 350–700 credits | Approximately 1–2 per Pro day |
| Large PDF or presentation with visual analysis | 400–900 credits | Usually one complete generation plus some chat |
| Extremely large multi-source synthesis | 800–2,000 credits | May require Boost Credits or a reduced-depth option |
| Medium 1024×1536 generated study image | approximately 500 credits | Half of one Pro daily allowance |
| Cached generation with no paid provider call | 0 credits | Reuse is rewarded |
| Local parsing, navigation, or deterministic formatting | 0 credits | Non-AI product behavior is not metered |

Broadcast TTS, transcription, and realtime voice should not use a generic fixed estimate. Synapse can calculate a preflight range from the audio duration or script length, then display live consumption during long sessions.

The estimates must be recalibrated after launch from real distributions. The product should publish rounded, stable ranges based on the trailing 30 days while the ledger continues to settle exact cost.

## Example settlement

Assume a Standard Notes workflow uses GPT-5.4 mini for the main generation and GPT-5 mini for a compact mind map:

```text
Main notes
10,000 GPT-5.4 mini input tokens  = $0.00750
 2,000 GPT-5.4 mini output tokens = $0.00900

Mind map and title
 6,000 GPT-5 mini input tokens    = $0.00150
 2,000 GPT-5 mini output tokens   = $0.00400

Total direct AI cost              = $0.02200
Credits at $0.0001 each           = 220 credits
```

A Pro user begins with 1,000 daily credits and finishes with 780 daily credits. Purchased credits are untouched.

If a conditional expansion doubles part of the workflow, the preflight maximum protects the user. Synapse either remains within the confirmed maximum, skips an optional stage, offers an efficient model, or asks the user to approve a higher maximum.

## Wallet and reset policy

### Wallet buckets

Each account has separately auditable buckets:

1. **Daily credits:** granted by the active plan, expire at the daily reset, and never convert to cash.
2. **Welcome or promotional credits:** granted once or through a campaign; may have a clearly disclosed expiry.
3. **Purchased Boost Credits:** acquired through a successful payment and remain available until used.
4. **Reserved credits:** temporarily unavailable while an approved operation is running.

The spending priority is:

```text
daily credits → expiring promotional credits → non-expiring purchased credits
```

This gives the customer the greatest practical value and minimizes complaints about expiring balances.

### Daily reset

Daily credits reset at midnight in the account timezone selected during onboarding. The interface shows the exact next-reset time. To prevent timezone-reset abuse, an account timezone may be changed no more than once every 30 days and changes take effect at the following reset.

The daily allowance does not accumulate. A student who does not study on Monday still receives the normal fresh allowance on Tuesday, not two days of allowance. This makes subscription cost predictable and discourages large stored liabilities.

### Subscription changes

- An upgrade activates the higher allowance immediately.
- A cancellation keeps daily benefits through the paid entitlement period.
- At entitlement end, daily credits stop refreshing.
- Purchased Boost Credits remain in the account after a downgrade or cancellation.
- Boost Credits can fund eligible AI usage on a Free account but do not unlock separately gated Pro features.
- Annual access receives the same daily allowance throughout the paid year.

## Quote, reserve, settle, and refund experience

### Preflight quote

After local file extraction but before paid model generation, Synapse estimates:

- likely input tokens;
- selected model tier;
- expected output cap;
- optional stages;
- likely credits;
- maximum credits.

Example:

> **Estimated cost: 180–320 credits**
>
> Maximum charge: 360 credits. You have 1,000 daily credits available. We will release any unused reserved credits as soon as your notes are ready.

For an expensive workflow:

> **This multi-source Deep Study may use up to 1,600 credits.**
>
> Use 1,000 daily credits plus up to 600 Boost Credits, or switch to Standard Notes for an estimated 550–850 credits.

### Reservation

The maximum confirmed amount is reserved atomically before model calls begin. Reservation prevents concurrent browser tabs from spending the same balance.

### Settlement

All successful provider calls belonging to the workflow are aggregated. Synapse rounds once, writes an immutable settlement, and releases the unused reservation.

### Failure and cancellation

- No usable result due to a provider or Synapse failure: full reservation released.
- User cancels before a billable provider call: full reservation released.
- User cancels after a successful partial result: settle only if the partial result is clearly usable and retained; otherwise release the reservation.
- Synapse-controlled compatibility or availability retries: do not create duplicate customer charges.
- User explicitly presses Regenerate: new quote and new charge.
- Duplicate client request with the same idempotency key: return the original result or state; never charge twice.

## Subscription unit economics

### Modeling assumptions

The following model is deliberately conservative:

- Customer prices are in USD.
- One credit funds at most $0.0001 of direct AI usage.
- Pro grants 1,000 daily credits.
- Monthly worst-case period uses 31 days.
- Annual period uses 365 days.
- Conservative processing assumption: 5.5% of revenue plus approximately $0.18 fixed.
- The 5.5% combines Stripe's currently published 3.5% New Zealand international-card rate and a possible 2% currency-conversion fee.
- The fixed estimate converts NZ$0.30 to approximately US$0.18 and must be refreshed with the actual settlement currency.
- Refunds, disputes, GST/sales tax, hosting, storage, support, and company overhead are excluded from the table.

These figures describe contribution after modeled AI usage and payment processing, not guaranteed company profit.

### Maximum AI capacity

```text
Monthly maximum direct AI cost = 31 × 1,000 × $0.0001 = $3.10
Annual maximum direct AI cost  = 365 × 1,000 × $0.0001 = $36.50
```

### Contribution by average credit redemption

| Plan | Average daily redemption | Modeled AI cost | Modeled processing | Contribution | Contribution margin |
|---|---:|---:|---:|---:|---:|
| Monthly $9.99 | 30% | $0.93 | $0.73 | $8.33 | 83.4% |
| Monthly $9.99 | 50% | $1.55 | $0.73 | $7.71 | 77.2% |
| Monthly $9.99 | 70% | $2.17 | $0.73 | $7.09 | 71.0% |
| Monthly $9.99 | 100% | $3.10 | $0.73 | $6.16 | 61.7% |
| Annual $99.99 | 30% | $10.95 | $5.68 | $83.36 | 83.4% |
| Annual $99.99 | 50% | $18.25 | $5.68 | $76.06 | 76.1% |
| Annual $99.99 | 70% | $25.55 | $5.68 | $68.76 | 68.8% |
| Annual $99.99 | 100% | $36.50 | $5.68 | $57.81 | 57.8% |

The economy is attractive when average paid utilization remains around 50–70%. It becomes materially tighter when every subscriber consumes every daily credit. Therefore Synapse must monitor cohort usage, optimize routing, and keep daily credits non-rollover.

### Daily allowance formula

When prices, fees, or target margins change:

```text
daily_credits =
  floor(
    (
      plan_revenue × (1 - percentage_processing_fee - target_contribution_margin)
      - fixed_processing_fee
      - allocated_variable_non_ai_cost
    )
    /
    (
      billing_days
      × expected_redemption_rate
      × credit_value_usd
    )
  )
```

The launch allocation of 1,000 is commercially reasonable around a 70% expected redemption rate. Synapse should not increase it merely to make the pricing card look larger. A larger displayed number can instead be created by changing the unit scale while preserving the same economic capacity, but that adds credit inflation without giving students more work.

## Boost Credit economics

| Pack | Price | Credits | Maximum AI capacity | Modeled processing | Contribution | Contribution margin |
|---|---:|---:|---:|---:|---:|---:|
| Small Boost | $4.99 | 10,000 | $1.00 | $0.45 | $3.54 | 70.9% |
| Standard Boost | $9.99 | 25,000 | $2.50 | $0.73 | $6.76 | 67.7% |
| Plus Boost | $24.99 | 70,000 | $7.00 | $1.55 | $16.44 | 65.8% |
| Max Boost | $49.99 | 150,000 | $15.00 | $2.93 | $32.06 | 64.1% |

The larger packs grant better value while retaining a healthy maximum-redemption contribution. Because purchased credits do not expire, finance must treat unredeemed purchased capacity consistently and must not rely on breakage as profit.

Top-ups should be available to every verified account. Buying Boost Credits does not unlock Pro-only product features; it only supplies eligible usage. This creates a pay-as-you-go revenue path without weakening the subscription's feature and daily-value proposition.

## Profitability controls

### Model routing

Use the least expensive model that reliably satisfies the learning objective:

- Quick chat, classification, titles, and compact structured data: GPT-5 mini or an equivalently efficient route.
- Standard Notes and ordinary tutor responses: efficient model by default, with quality evaluation and automatic escalation when necessary.
- Deep Study, complex source synthesis, difficult reasoning, and premium visual interpretation: GPT-5.4 mini or the validated advanced route.
- Realtime voice: explicitly premium and live-metered.
- Repeated identical work: application cache before provider call.

The user should choose an understandable quality tier such as **Efficient**, **Balanced**, or **Advanced**, rather than needing to understand provider model names. The quote shows the cost difference.

### Context and output discipline

- Retrieve only relevant source sections for tutor questions.
- Summarize long conversation history rather than resending it indefinitely.
- Preserve stable prompt prefixes to improve provider caching.
- Cap optional output and reasoning based on the requested note depth.
- Stop optional title, mind-map, translation, or enrichment stages when the confirmed maximum is nearly exhausted.
- Cache deterministic outputs and successful identical source fingerprints.
- Track cost by feature, model, user cohort, document type, and workflow stage.

### Commercial guardrails

The operating targets are:

- Average paid AI cost at or below 22–25% of recognized plan revenue.
- Payment processing at or below 8%.
- AI plus payment contribution margin above 65%.
- No individual workflow may spend beyond its confirmed maximum.
- No purchased-credit pack may have less than a 60% modeled contribution margin at full redemption without executive approval.

Alert levels:

- **Green:** Average paid daily redemption at or below 700 credits and AI plus payment contribution at or above 65%.
- **Amber:** Average paid daily redemption above 750 for 14 days, any feature's actual p95 cost above its advertised maximum, or contribution below 60%.
- **Red:** AI plus payment contribution below 55%, unexplained provider-versus-ledger variance above 2%, or any double-charge incident.

Respond first with routing, caching, context reduction, and quote recalibration. If economics still fail, change future plan allocations or prices with clear customer notice. Do not silently devalue already purchased balances.

## System ownership and ledger design

Synapse currently creates AI usage in FastAPI while Express, Stripe, and Supabase own account and billing behavior. The credit system must preserve a single financial authority.

### Ownership

- **Supabase/Postgres:** canonical wallet balances, immutable credit ledger, reservations, price-book versions, and usage settlements.
- **Express service:** authenticated credit API, entitlements, Stripe Checkout, webhook fulfillment, balance reads, and account history.
- **FastAPI service:** AI workflow orchestration, preflight estimation, provider usage capture, and signed internal reserve/settle/refund calls.
- **Browser:** presentation only. It never calculates an authoritative balance or grants credits.
- **Stripe:** payment collection and webhook evidence, not the source of per-generation usage truth.

### Required records

`credit_price_books`

- version;
- provider;
- endpoint route;
- model;
- modality and meter;
- USD rate;
- effective timestamp;
- retired timestamp;
- source URL and review timestamp.

`credit_grants`

- grant ID;
- user ID;
- source: daily, welcome, promotional, purchase, adjustment, or refund;
- granted credits;
- remaining credits;
- effective and expiry timestamps;
- Stripe event/payment reference when applicable;
- status.

`credit_reservations`

- reservation ID and idempotency key;
- user and workflow ID;
- feature;
- maximum credits;
- credits reserved by grant;
- state: active, settled, released, or expired;
- timestamps.

`ai_usage_events`

- workflow and internal call ID;
- provider route and model;
- prompt, cached, output, reasoning, image, and audio meters;
- tool-call meters;
- provider request ID;
- direct cost in USD micros;
- price-book version;
- success and usability status;
- timestamps.

`credit_ledger`

- append-only entry ID;
- user and grant;
- type: grant, reserve, release, settle, expire, refund, or manual adjustment;
- signed credit amount;
- workflow, payment, and idempotency references;
- balance after entry;
- actor and reason;
- timestamp.

Balance mutation must occur through an atomic database function or transaction. A cached balance in the browser or application server is never authoritative.

### Purchase fulfillment

Stripe webhook processing:

1. Verify the webhook signature.
2. Resolve the exact configured pack from the trusted Stripe Price ID.
3. Reject client-supplied credit quantities.
4. Insert the payment event with a unique Stripe event ID.
5. Atomically grant the corresponding purchased credits once.
6. Return success for safe webhook retries without issuing another grant.
7. Display the receipt and updated balance.

## Anti-abuse and financial safety

- Welcome credits require verified email and one eligible account per person or risk profile.
- Apply IP, device, velocity, and payment-risk controls without blocking legitimate shared-campus networks solely by IP.
- Maintain request-rate and concurrency limits even when the user has credits.
- Prevent timezone cycling and overlapping daily grants.
- Do not allow credit transfer, sale, withdrawal, or cash redemption.
- Use idempotency for every reservation, settlement, refund, and Stripe fulfillment.
- Reconcile provider usage, the credit ledger, and Stripe grants daily.
- Route manual credit adjustments through an auditable support tool with reason codes.
- Set a short automatic expiry on abandoned reservations, then reconcile late provider completions before releasing funds.
- Protect against client cancellation that hides a still-running server workflow.
- Treat chargebacks and refunded purchases according to a published policy; never create an unexplained negative balance.

## Customer experience specification

### Persistent balance display

The account menu shows:

```text
780 / 1,000 daily credits
25,000 Boost Credits
Daily credits refresh in 6h 14m
```

The primary interface emphasizes remaining study capacity. Detailed token and model information is available in a usage drawer for users who want transparency.

### Low-balance behavior

At 20% daily balance:

> **200 daily credits left.** You still have enough for a Quick Review or several tutor questions. Deep Study may use Boost Credits.

At zero daily balance with Boost Credits:

> **Today's credits are used. Keep studying with your Boost Credits, or wait 3h 12m for 1,000 fresh credits.**

At zero total balance:

> **Your daily credits refresh in 3h 12m.** Add Boost Credits to continue now, or choose a free local study activity.

Synapse should always offer a useful next step: lower depth, efficient model, cached material, local flashcards, or waiting for reset.

### Usage receipt

After completion:

```text
Standard Notes completed
Actual cost: 220 credits
Reserved: 320 credits
Returned: 100 credits
Paid from: Daily credits
Remaining today: 780 credits
```

An expanded receipt shows the model tier, token categories, media operations, and timestamp. It does not expose private system prompts.

## Customer-facing pricing copy

### Pricing-page introduction

> **AI study power that refreshes every day**
>
> Synapse credits measure the AI work behind your notes, tutoring, visuals, and voice sessions. Short questions use fewer credits. Long documents, Deep Study, generated images, and live voice use more. You will always see an estimate before a paid AI action starts.

### Free plan

> **Free — $0**
>
> Start with 500 welcome credits, then receive 50 fresh credits every day for quick questions and lightweight study support.
>
> - 500 welcome AI credits
> - 50 fresh credits daily
> - Upload and understand your own learning materials
> - Create core notes and practice
> - No credit card required

### Pro Monthly

> **Pro Monthly — $9.99 USD/month**
>
> Build a consistent study habit with 1,000 fresh AI credits every day.
>
> - 1,000 daily AI credits
> - Usually enough for 3–6 Standard Notes generations, or an equivalent mix of study tools
> - Deep Study and advanced learning workflows
> - Clear credit estimate before generation
> - Add non-expiring Boost Credits whenever you need more
> - Cancel through your account billing portal

### Pro Annual

> **Pro Annual — $99.99 USD/year**
>
> The same 1,000-credit daily study allowance at the best annual value. Save $19.89 compared with paying monthly for 12 months.
>
> - 1,000 fresh AI credits every day
> - All Pro learning features
> - Annual savings of approximately 16.6%
> - Purchased Boost Credits remain available until used

### Boost Credits

> **Need more today? Keep studying with Boost Credits.**
>
> Boost Credits let you continue beyond the daily allowance. They stay in your balance until you use them, and Synapse always spends your daily credits first.

### Credit-estimate tooltip

> Credit use depends on the amount of source material, selected study depth, model tier, response length, and media features. The estimate appears before generation. You are charged the settled amount, never more than the maximum you approve.

### Customer FAQ

**Why do different actions use different numbers of credits?**

Credits reflect the actual AI processing required. A short tutor answer needs far less work than analyzing a large visual presentation, producing Deep Study notes, generating an image, or running a live voice conversation.

**Do my daily credits roll over?**

No. Your plan gives you a fresh allowance every day so you can study consistently. The balance refreshes at the time shown in your account.

**Do purchased Boost Credits expire?**

No. Purchased Boost Credits remain in your account until used, subject to the account and refund terms presented at purchase.

**Which credits are used first?**

Synapse uses your daily credits first, then any expiring promotional credits, and finally your purchased Boost Credits.

**What happens if a generation fails?**

If Synapse cannot deliver a usable result because of a platform or provider failure, the reserved credits are returned automatically.

**Can an action cost more than the estimate?**

Synapse shows both an expected range and a maximum. It will not take more purchased Boost Credits than the maximum you approved without asking again.

**Are credits money?**

No. Credits are units for eligible AI usage within Synapse. They cannot be transferred, withdrawn, traded, or redeemed for cash.

## Reporting and management dashboard

The internal dashboard should show:

- revenue and recognized revenue by plan and pack;
- granted, reserved, settled, refunded, expired, and outstanding credits;
- direct AI cost by provider, model, modality, feature, and user cohort;
- daily redemption rate and balance exhaustion rate;
- p50, p90, and p95 credits by feature;
- provider-invoice-to-ledger variance;
- payment processing, refunds, disputes, and tax;
- contribution margin by plan and pack;
- percentage of users reaching 20%, 0%, and Boost purchase;
- conversion from Free to Pro and from low balance to Boost;
- cache savings and model-routing savings;
- failed-workflow refund rate;
- support contacts about unclear or incorrect credit charges.

Do not optimize only for credit exhaustion or Boost conversion. A profitable system that makes students afraid to use the product will reduce retention. Track learning activation, weekly retained students, successful note generations, tutor-session completion, and customer satisfaction beside revenue metrics.

## Launch and calibration plan

### Phase 1: shadow metering

For at least two weeks, calculate credits without deducting them. Compare:

- quoted range versus actual;
- actual ledger cost versus provider invoice;
- p50/p90/p95 by feature and file type;
- likely monthly and annual margins at observed redemption.

Do not launch paid deduction until provider-versus-ledger variance is below 2% and at least 95% of ordinary workflows finish below their displayed maximum.

### Phase 2: visible receipts, no hard stop

Show users what the action would have cost, collect comprehension feedback, and refine language and ranges. Continue honoring existing access.

### Phase 3: enforced daily wallet

Enable reservations and deduction for a small cohort. Monitor failures, refunds, balance confusion, conversion, retention, and margins daily.

### Phase 4: Boost Credits

Enable one pack first, validate webhook idempotency and accounting, then add volume packs. Do not launch all packs before the basic purchase, grant, use, refund, and reconciliation journey is proven.

### Phase 5: optimization

Use observed data to improve model routing, caching, estimates, pack positioning, and plan economics. Review the provider price book monthly and immediately after provider pricing or model changes.

## Acceptance criteria

The credit economy is ready for general availability only when:

- every paid provider route has a versioned rate;
- cached, reasoning, image, audio, and tool usage are captured when applicable;
- quotes show a range and maximum;
- reservations and settlements are atomic and idempotent;
- simultaneous requests cannot overspend;
- failed unusable results release credits automatically;
- Stripe webhook retries cannot double-grant Boost Credits;
- daily, promotional, and purchased balances remain separately auditable;
- purchased credits survive daily reset, downgrade, and cancellation;
- plan resets cannot be multiplied through timezone changes;
- the usage receipt explains every customer-visible debit;
- provider invoice variance is below 2%;
- ordinary-workflow p95 stays within the advertised maximum;
- modeled and observed contribution margins meet the commercial guardrails;
- pricing, renewal, cancellation, reset, expiry, refund, and no-cash-value terms are prominently disclosed.

## Tax, accounting, and consumer-law review

This design is a commercial model, not legal or tax advice. Before accepting real payments, Synapse should obtain professional advice covering:

- New Zealand GST and zero-rating evidence for overseas customers;
- the treatment and recognition of subscription and prepaid-credit revenue;
- outstanding purchased-credit obligations;
- refunds, chargebacks, and account closure;
- subscription renewal and cancellation notices;
- clear presentation of daily expiry and purchased-credit persistence;
- regional consumer, stored-value, gift-card, and unclaimed-property rules where Synapse sells.

New Zealand Inland Revenue states that GST is generally 15% for online services supplied by a New Zealand entity to New Zealand customers, while qualifying services supplied to non-residents are generally zero-rated when sufficient evidence is retained. The Commerce Commission requires standard consumer terms to be fair and pricing and material limits to be clear and prominent. These requirements should shape checkout, receipts, terms, and renewal communication rather than being left to hidden legal text.

## Sources reviewed

- [OpenAI GPT-5.4 mini model pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [OpenAI GPT-5 mini model pricing](https://developers.openai.com/api/docs/models/gpt-5-mini)
- [OpenAI GPT Image 1.5 model pricing](https://developers.openai.com/api/docs/models/gpt-image-1.5)
- [OpenAI GPT-Realtime-2 model pricing](https://developers.openai.com/api/docs/models/gpt-realtime-2)
- [OpenAI GPT-4o mini Transcribe model pricing](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe)
- [OpenAI GPT-4o mini TTS model pricing](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Cloud Vertex AI generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [GitHub AI-credit usage-based billing](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises)
- [Stripe credit-based pricing model](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)
- [Stripe billing credits and immutable credit ledger](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits)
- [Stripe New Zealand processing pricing](https://stripe.com/nz/pricing)
- [New Zealand Inland Revenue: zero-rated online services](https://www.ird.govt.nz/en/gst/charging-gst/zero-rated-supplies)
- [New Zealand Commerce Commission: unfair contract terms](https://www.comcom.govt.nz/business/your-obligations-as-a-business/unfair-contract-terms/)
