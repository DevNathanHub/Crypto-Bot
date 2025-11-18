# Implementation Roadmap — Crypto Hub Bot

## Overview

This roadmap outlines the implementation path from MVP to Growth to Enterprise variants, with sprint breakdowns, time estimates, and prioritized tasks.

---

## Development Phases

### Phase 1: MVP (Weeks 1-3)
Focus: Core functionality, manual operations acceptable

### Phase 2: Growth (Weeks 4-10)
Focus: Automation, scalability, monetization

### Phase 3: Enterprise (Weeks 11-24)
Focus: Multi-tenant, compliance, SLA guarantees

---

## Sprint Structure

Each sprint = 1 week (5 working days)

**Sprint ceremonies:**
- Planning (Monday)
- Daily standups
- Review & Retro (Friday)

---

## Phase 1: MVP — Sprint Breakdown

### Sprint 0: Foundation (Week 1)

**Goal:** Development environment + basic infrastructure

**Tasks:**
- [x] Project setup (Node.js + ESM, Git, .gitignore)
- [x] MongoDB connection + Mongoose models (User, Subscription, PriceCache, Alert)
- [x] Express server + health endpoint
- [x] Environment configuration (dotenv)
- [x] Telegram bot initialization (Telegraf)
- [x] Basic bot commands (/start, /help)
- [ ] Local dev environment documentation
- [ ] First deployment to dev server (PM2 or Docker)

**Deliverables:**
- Running server at http://localhost:3000
- Bot responds to /start in Telegram
- MongoDB connection verified

**Estimated effort:** 3-5 days

---

### Sprint 1: Price Alerts & Scheduler (Week 2)

**Goal:** Core alert functionality + automated jobs

**Tasks:**
- [x] Price fetcher service (CoinGecko integration)
- [x] Node-cron scheduler (every 1 min price fetch)
- [x] Subscription flow (create/list subscriptions)
- [x] Threshold evaluation logic
- [x] Alert creation + delivery to users
- [x] Channel automation (15-min updates)
- [ ] /subscribe command implementation
- [ ] Alert throttling (max 1 per ticker per hour)
- [ ] Price cache TTL indexing

**Deliverables:**
- Users can set price alerts
- Scheduler posts to channel every 15 min
- Alerts delivered via Telegram DM

**Estimated effort:** 5-7 days

---

### Sprint 2: Payment Integration Basics (Week 3)

**Goal:** Deposit endpoints + transaction tracking

**Tasks:**
- [x] Payment contact helper (E.164 normalization)
- [x] /deposit command (show addresses/numbers)
- [x] /confirm_deposit placeholder
- [x] Transaction model
- [ ] M-Pesa STK push initiation
- [ ] Webhook endpoint skeleton (/api/webhook/mpesa)
- [ ] Transaction reconciliation logic
- [ ] Admin dashboard for pending transactions

**Deliverables:**
- Users see deposit instructions
- Transactions logged in DB
- Admin can view pending payments

**Estimated effort:** 5-7 days

---

### MVP Milestone (End of Week 3)

**Definition of Done:**
- ✅ Bot live in Telegram
- ✅ Channel posts automated
- ✅ Price alerts functional
- ✅ Payment tracking operational
- ✅ Admin commands working
- ✅ Documentation complete

**Launch readiness:**
- Deploy to production VPS
- Announce to beta users (10-20 people)
- Monitor for 48 hours

---

## Phase 2: Growth — Sprint Breakdown

### Sprint 3: Gemini AI Integration (Week 4)

**Goal:** Real AI content generation

**Tasks:**
- [ ] Obtain Gemini API key
- [ ] Implement geminiClient.generate() with real API calls
- [ ] Prompt engineering for daily digest
- [ ] Prompt engineering for alpha signals
- [ ] Cache AI responses (Redis or MongoDB TTL)
- [ ] Cost tracking per AI call
- [ ] Fallback to templates if API fails
- [ ] Admin command to test prompts (/test_prompt)

**Deliverables:**
- Daily digest uses real AI
- Hourly updates with AI summaries
- Prompts configurable via DB

**Estimated effort:** 5-7 days

---

### Sprint 4: DB-Backed Scheduler (Week 5)

**Goal:** Persistent schedules with timezone support

**Tasks:**
- [x] ScheduledJob model
- [x] Channel scheduler (CronJob + Europe/London tz)
- [x] Admin commands (/job_create, /job_list, /job_pause, /job_resume, /job_run)
- [ ] Job execution logging (start/end times, success/failure)
- [ ] Retry policy enforcement
- [ ] Dead letter queue for failed jobs
- [ ] Notification on job failures

**Deliverables:**
- Schedules survive restarts
- Admin can CRUD jobs via Telegram
- Timezone handling verified (test DST transition)

**Estimated effort:** 5-7 days

---

### Sprint 5: Payment Webhooks & Reconciliation (Week 6)

**Goal:** Automated payment processing

**Tasks:**
- [ ] M-Pesa webhook endpoint with signature validation
- [ ] Airtel Money webhook endpoint
- [ ] Webhook retry/idempotency handling
- [ ] Auto-reconcile Transaction records
- [ ] User notification on successful payment
- [ ] Auto-upgrade user plan (free → premium)
- [ ] Refund flow for failed transactions

**Deliverables:**
- Payments auto-reconcile
- Users notified instantly
- Admin receives daily payment summary

**Estimated effort:** 7-10 days

---

### Sprint 6: Analytics & Monitoring (Week 7)

**Goal:** Observability + performance tracking

**Tasks:**
- [ ] Structured logging (Winston or Pino)
- [ ] Prometheus metrics endpoint (/metrics)
- [ ] Grafana dashboard (job success rate, API latency, alert volume)
- [ ] Error tracking (Sentry integration)
- [ ] Health check improvements (DB status, external API status)
- [ ] Admin analytics command (/stats)
- [ ] Weekly report generation (automated email)

**Deliverables:**
- Real-time metrics visible in Grafana
- Errors auto-reported to Sentry
- Weekly email with KPIs

**Estimated effort:** 5-7 days

---

### Sprint 7: Billing & Subscriptions (Week 8)

**Goal:** Stripe integration + subscription tiers

**Tasks:**
- [ ] Stripe account setup
- [ ] Create subscription products (Free, Premium $5, Creator $15)
- [ ] Stripe Checkout session creation
- [ ] Webhook handler for subscription events
- [ ] User plan upgrades/downgrades
- [ ] Billing portal link in bot (/billing)
- [ ] Payment failure handling (retry, grace period)
- [ ] Invoice generation

**Deliverables:**
- Users can subscribe via Stripe
- Automated billing cycle
- Revenue dashboard

**Estimated effort:** 7-10 days

---

### Sprint 8: Social Connectors (Week 9)

**Goal:** Multi-channel distribution

**Tasks:**
- [ ] Twitter/X API integration (OAuth2)
- [ ] Discord webhook support
- [ ] Auto-post to X when channel post created
- [ ] Cross-post scheduling
- [ ] Thread generation for X (AI-driven)
- [ ] Link shortener with click tracking
- [ ] UTM parameter injection for analytics

**Deliverables:**
- Content auto-posted to X and Discord
- Click tracking operational
- Engagement metrics visible

**Estimated effort:** 7-10 days

---

### Sprint 9: Growth Optimizations (Week 10)

**Goal:** Performance, UX, viral features

**Tasks:**
- [ ] Referral system (track referrals, reward credits)
- [ ] Onboarding flow improvements (interactive wizard)
- [ ] In-app notifications (digest preview)
- [ ] A/B testing framework (subject lines, CTAs)
- [ ] Rate limiting on API endpoints
- [ ] Database indexing optimization
- [ ] Horizontal scaling test (2+ instances)

**Deliverables:**
- Referral program live
- Onboarding conversion improved
- System scales to 1000+ users

**Estimated effort:** 7-10 days

---

### Growth Milestone (End of Week 10)

**Definition of Done:**
- ✅ AI-powered content generation
- ✅ Automated payment processing
- ✅ Multi-channel distribution
- ✅ Billing & subscriptions operational
- ✅ Analytics dashboard live
- ✅ Scales to 1000+ users

**Launch readiness:**
- Public launch announcement
- Marketing campaign (X, Reddit, Telegram groups)
- Monitor for scalability issues

---

## Phase 3: Enterprise — Sprint Breakdown

### Sprint 10-12: Multi-Tenancy (Weeks 11-13)

**Goal:** Tenant isolation + RBAC

**Tasks:**
- [ ] Tenant model + tenant-scoped queries
- [ ] SSO integration (SAML, OIDC)
- [ ] Role-based access control (admin, analyst, viewer)
- [ ] Per-tenant configuration
- [ ] Tenant onboarding workflow
- [ ] Billing per tenant (seat-based)
- [ ] Audit logs (append-only event store)

**Deliverables:**
- Multiple tenants supported
- Each tenant isolated
- RBAC enforced

**Estimated effort:** 15-20 days

---

### Sprint 13-15: Compliance & Security (Weeks 14-16)

**Goal:** Enterprise-grade security

**Tasks:**
- [ ] Data encryption at rest (KMS)
- [ ] TLS everywhere (internal services)
- [ ] Secrets rotation (Vault integration)
- [ ] GDPR compliance (data deletion, export)
- [ ] SOC 2 prep (access logs, change management)
- [ ] Penetration testing
- [ ] Security headers (CSP, HSTS)

**Deliverables:**
- Security audit passed
- GDPR-compliant
- SOC 2 readiness

**Estimated effort:** 15-20 days

---

### Sprint 16-18: Microservices & K8s (Weeks 17-19)

**Goal:** Production-ready orchestration

**Tasks:**
- [ ] Split into microservices (api, scheduler, webhooks, ai)
- [ ] Kubernetes manifests (deployments, services, ingress)
- [ ] Helm charts
- [ ] Auto-scaling policies (HPA)
- [ ] Service mesh (Istio or Linkerd)
- [ ] CI/CD pipelines (GitHub Actions)
- [ ] Blue-green deployments

**Deliverables:**
- K8s cluster operational
- Auto-scaling verified
- Zero-downtime deployments

**Estimated effort:** 15-20 days

---

### Sprint 19-20: Advanced Analytics (Weeks 20-21)

**Goal:** Business intelligence

**Tasks:**
- [ ] ClickHouse for time-series analytics
- [ ] ETL pipelines (MongoDB → ClickHouse)
- [ ] Custom dashboards (Metabase or Superset)
- [ ] Cohort analysis (user retention)
- [ ] Revenue forecasting
- [ ] Churn prediction model

**Deliverables:**
- Executive dashboard
- Predictive analytics operational

**Estimated effort:** 10-15 days

---

### Sprint 21-24: White-Label & API (Weeks 22-24)

**Goal:** Enterprise product offerings

**Tasks:**
- [ ] White-label platform (custom branding)
- [ ] Public API with rate limits
- [ ] API key management
- [ ] SDK generation (JS, Python)
- [ ] Partner onboarding portal
- [ ] SLA monitoring (99.9% uptime)
- [ ] Professional services package

**Deliverables:**
- Partners can white-label
- Public API live with docs
- SLA guarantees met

**Estimated effort:** 15-20 days

---

### Enterprise Milestone (End of Week 24)

**Definition of Done:**
- ✅ Multi-tenant platform
- ✅ Enterprise security & compliance
- ✅ Kubernetes-orchestrated
- ✅ Advanced analytics
- ✅ White-label offering
- ✅ SLA guarantees

**Launch readiness:**
- Enterprise sales enablement
- Partner program launch
- Pricing tiers finalized

---

## Resource Allocation

### Team Composition

**MVP (Weeks 1-3):**
- 1 Full-stack developer
- 1 DevOps engineer (part-time)

**Growth (Weeks 4-10):**
- 2 Full-stack developers
- 1 Frontend developer
- 1 DevOps engineer
- 1 Designer (part-time)

**Enterprise (Weeks 11-24):**
- 3 Backend developers
- 2 Frontend developers
- 1 Data engineer
- 2 DevOps engineers
- 1 Security engineer
- 1 Product manager

---

## Risk Management

| Risk | Mitigation |
|------|------------|
| Gemini API rate limits | Implement caching, use tiered pricing |
| Telegram bot suspended | Maintain backup communication channels |
| Payment reconciliation errors | Manual review queue, audit trail |
| Scaling issues | Load testing before launch, auto-scaling |
| Security breach | Pen testing, bug bounty program |

---

## Success Metrics

### MVP
- 50+ active users
- 90% uptime
- <5s alert delivery latency

### Growth
- 1000+ active users
- 10% free→paid conversion
- $5k MRR

### Enterprise
- 10+ enterprise clients
- 99.9% SLA met
- $50k MRR

---

## Next Steps

1. Review [10-SECURITY.md](./10-SECURITY.md) for security best practices
2. Begin Sprint 0 tasks
3. Set up project tracking (Jira, Linear, GitHub Projects)
4. Schedule weekly sprint planning
