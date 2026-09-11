# SHOPIFY CLONE — FULL FEATURE & FLOW SPEC

Build a **Shopify-class commerce OS**: merchant admin + online storefront + checkout + orders/fulfillment + customers + payments/shipping + marketing + multi-channel + B2B + apps/extensibility.  
Stack preference for this exercise: **React admin + storefront**, mock or real Stripe for payments, local VFS multifile app. Prioritize **correct flows and data model** over pixel-perfect Shopify UI.

---

## 0. Product pillars (what Shopify actually is)

1. **Online Store** — themeable storefront (Liquid-like concepts: templates, sections, metafields)
2. **Admin (Shopify Admin)** — merchant back office
3. **Checkout** — hosted, high-conversion, extensible checkout
4. **Orders / OMS** — payment + fulfillment + returns lifecycle
5. **Customers** — accounts, segments, company (B2B)
6. **Payments** — Shopify Payments–like + external gateways
7. **Shipping & fulfillment** — rates, labels, locations, routing
8. **Inventory** — multi-location stock
9. **Marketing & discounts** — codes, automations, email/SMS hooks
10. **Sales channels** — POS, Shop, social, markets
11. **Analytics** — reports, dashboards
12. **Apps / Extensions / Functions** — plugin platform
13. **Markets / International** — multi-currency, multi-language, duties
14. **B2B** — companies, catalogs, net terms
15. **Plus / Enterprise** — org admin, expansion stores, deep checkout/Functions

---

## 1. Catalog & merchandising

### Products
- Product CRUD (title, description/HTML, status: active/draft/archived)
- Media gallery (images/video), alt text, featured image
- Vendor, product type, tags
- SEO fields (title, meta description, handle/URL)
- Product options (Size/Color…) → **variants** matrix
- Variant SKU, barcode, price, compare-at, cost, weight, taxable
- Inventory tracked / not tracked; continue selling when out of stock
- Requires shipping vs digital/service
- Gift card product type
- Bundles / kits (conceptual)
- Metafields & metaobjects (custom structured data)
- Collections (manual + automated smart rules: tag/vendor/price/etc.)
- Collection sort, SEO, image
- Gift wrapping / custom attributes (line item properties)
- Digital downloads / files
- Selling plans (subscriptions: weekly/monthly, prepaid vs pay-per-delivery)
- Quantity rules / min-max / increments (B2B + retail)
- Unit pricing, measurement
- Product publishing to channels (Online Store, POS, Shop, etc.)

### Pricing & tax
- Catalog price, compare-at (sale), cost (margin)
- Price lists / catalogs (B2B)
- Taxes: regions, overrides, include/exclude tax in prices
- Duties & import taxes (Markets)
- Multi-currency price adaptation

---

## 2. Online storefront (buyer-facing)

### Theme system
- Themes / theme editor (sections, blocks, settings)
- Templates: home, product, collection, cart, search, page, blog, 404, password, customer account
- Navigation menus (header/footer), nested links
- Pages (About, FAQ), blogs & articles
- Search (products/pages/articles), predictive search
- Filters / faceted search on collections
- Localization: languages, currencies, geo redirect
- Password page / coming soon
- Cookie / consent banner hooks
- Accelerated checkout buttons (Shop Pay / Apple Pay / Google Pay style)

### Buyer journeys (must implement)
1. Browse home → collection → product → add to cart  
2. Search → product  
3. Cart drawer / cart page → checkout  
4. Customer login → order history → reorder  
5. Wishlist / recently viewed (common; often app—optional)  
6. Abandoned cart recovery email (admin-triggered mock OK)

---

## 3. Cart

- Line items with variant, qty, properties, selling plan
- Cart attributes / notes
- Discount code apply/remove
- Gift cards apply
- Shipping estimate (optional pre-checkout)
- Upsells / related products
- Cart transform rules (Plus-style: bundles, price overrides—describe even if stubbed)
- Persist cart (cookie/local/customer)

---

## 4. Checkout (critical Shopify DNA)

### Steps
1. **Information** — email/phone, shipping address, marketing opt-in  
2. **Shipping** — rate picker, delivery method, pickup  
3. **Payment** — card / wallet / COD / invoice terms (B2B)  
4. **Thank you** — order confirmation  
5. **Order status** — tracking page  

### Checkout features
- Guest checkout + optional account create
- Address validation / autocomplete
- Shipping rates (flat, weight, price, carrier-calculated)
- Local pickup / delivery
- Tips / donations (optional)
- Tax calculation at checkout
- Discount codes + automatic discounts
- Gift cards
- Shop Pay–like one-click (stub: saved address + payment)
- 3DS / fraud signals (stub review queue)
- Partial payments / deposits (Plus B2B)
- Payment terms Net 30/60 (B2B)
- Checkout UI extensions slots (custom fields, upsell blocks—architecture hooks)
- Branding API (logo, colors, fonts)
- Post-purchase upsell page
- Web pixels / analytics events (checkout_started, payment_info, purchase)

### Checkout states & failures
- Payment declined → retry  
- Inventory stockout mid-checkout → adjust  
- Address not serviceable → block shipping  
- Fraud hold → order authorized but not captured  

---

## 5. Customers & accounts

### Customer admin
- Customer profile: name, email, phone, tags, notes, tax exempt
- Addresses (multiple)
- Order history, RFM-ish stats (orders count, total spent)
- Customer segments (filters: spent, tags, location, accept marketing)
- Marketing consent (email/SMS)
- Merge customers (conceptual)
- Store credit / gift card balance

### Customer accounts (storefront)
- Login / register / reset password  
- Profile & addresses  
- Orders list + detail + invoice PDF stub  
- Self-serve returns request  
- Subscriptions manage (pause/skip/cancel)  
- B2B company account switcher (location/role)

---

## 6. Orders — full lifecycle (OMS)

### Order creation sources
- Online checkout  
- Draft order (admin/phone/wholesale) → invoice link  
- POS  
- Subscription recurring charge  
- Marketplace/channel import  

### Order object fields
- Order number, name (#1001), timestamps  
- Line items, discounts, shipping, tax, totals  
- Customer, shipping/billing address  
- Tags, notes, risk level  
- Financial status, fulfillment status, return status  
- Timeline / events log  

### Financial / payment statuses
- Pending, authorized, partially paid, paid, partially refunded, refunded, voided  
- Capture / void authorization  
- Multi-capture / partial capture  

### Fulfillment statuses
- Unfulfilled, partially fulfilled, fulfilled  
- Scheduled (prepaid subscriptions)  
- On hold / restocked  

### Return statuses
- Return requested → approved/declined → in progress → returned / inspected  

### Merchant order actions
- View / search / filter / saved views / bulk actions  
- Fulfill (full/partial), add tracking, notify customer  
- Cancel order, refund (full/partial), restock  
- Edit order (add/remove line, address—with constraints)  
- Duplicate / archive  
- Print packing slip / invoice / shipping label  
- Request fulfillment from 3PL location  
- Split fulfillments by location  

### End-to-end order flow (implement as state machine)
```
Cart → Checkout → Payment authorized/paid
  → Order Open + Unfulfilled
  → (optional) Fraud review
  → FulfillmentOrder(s) created per location
  → Label purchased / handed to carrier
  → Tracking updates → Delivered
  → (optional) Return requested → refund/exchange → restock
  → Archive
```

---

## 7. Inventory & locations

- Locations (warehouse, retail, pop-up)  
- Per-location inventory quantities  
- Incoming / committed / available  
- Transfers between locations  
- Low-stock alerts  
- Inventory adjustments + reason codes  
- Order routing: nearest location, priority list, Functions-style rules (stub)  
- Over-selling rules  

---

## 8. Shipping & delivery

- Shipping zones / countries / regions  
- Rate profiles (general, custom product profiles)  
- Flat rates, free shipping thresholds, weight-based  
- Carrier-calculated rates (UPS/FedEx/USPS-style mock)  
- Delivery dates / local delivery radius  
- Pickup in store  
- Shipping labels purchase + void  
- Packing slips  
- Duties & customs for international  
- Delivery status tracking UI  

---

## 9. Payments & money movement

- Card payments (Stripe-like)  
- Wallets (Apple/Google Pay stubs)  
- Shop Pay–like vaulted checkout  
- Manual payment methods (COD, bank deposit, money order)  
- Gift cards issue/redeem  
- Store credit  
- Refunds & chargebacks queue (stub)  
- Payouts / balance (Shopify Payments–like dashboard stub)  
- Multi-currency settlement notes  
- B2B: vaulted cards, ACH, net terms, payment requests, deposits, partial pay  

---

## 10. Discounts & promotions

- Discount codes: %, fixed, free shipping, BXGY  
- Automatic discounts (no code)  
- Usage limits, customer eligibility, date windows  
- Combines with / excludes other discounts  
- Quantity breaks / volume pricing  
- Flash sales / compare-at  
- Referral / affiliate hooks (optional)  

---

## 11. Marketing & CRM-lite

- Email capture forms  
- Abandoned checkout recovery  
- Campaign stubs (email/SMS)  
- Shopify Audiences–like lookalikes (conceptual)  
- Shopify Magic / AI: product description, email draft (optional)  
- Discount automation via Flow  

---

## 12. Content & SEO

- Pages, blogs, articles  
- URL redirects  
- Canonical handles  
- Sitemap / robots concepts  
- Meta fields for SEO  
- Structured data (Product JSON-LD)  

---

## 13. Analytics & reports

- Dashboard: sales, sessions, conversion, AOV  
- Live view (optional)  
- Reports: sales by product/channel/region, customers, finance, inventory  
- Custom report builder (Plus/Advanced-ish)  
- Export CSV  
- Attribution: channel, UTM  

---

## 14. Staff, permissions, settings

- Staff accounts + roles (Owner, Admin, limited)  
- Permission matrix: products, orders, finance, apps, themes…  
- Store settings: name, currency, timezone, unit system  
- Domains / SSL  
- Checkout settings  
- Legal pages (refund/privacy/ToS) at checkout footer  
- Notifications: email templates (order confirm, shipping, refund)  
- Taxes, duties, markets config  
- Locations & shipping  
- Payments providers  
- Checkout language  
- Plan / billing for the merchant (meta)  

---

## 15. Sales channels

- Online Store  
- Point of Sale (POS Lite): cart, take payment, receipts, offline stub  
- Shop app channel  
- Facebook/Instagram/TikTok/Google listings (publish stubs)  
- Wholesale channel / B2B  
- Headless / custom storefront via Storefront API mindset  

---

## 16. Markets & international

- Markets (US, EU, …)  
- Currencies + conversion  
- Languages / translation  
- Domain / subfolder per market  
- Catalogs / pricing per market  
- Duties & import taxes at checkout  
- Geolocation redirect  

---

## 17. B2B (native Shopify B2B)

- Companies + company locations  
- Buyer users + roles/permissions  
- Catalogs (price lists, quantity rules, restricted products)  
- Payment terms (Net 30/60), vaulted cards, ACH  
- Draft orders & invoice links  
- Self-serve reorder portal  
- Deposits / partial payments / payment-per-fulfillment (Plus-depth)  
- B2B-only checkout context  

---

## 18. Subscriptions

- Selling plans on products  
- Pay-per-delivery vs prepaid  
- Scheduled fulfillments  
- Dunning (failed renewal retry)  
- Customer portal: skip / pause / swap / cancel  
- Merchant: subscription orders list  

---

## 19. Returns & exchanges

- Return window & rules (final sale, restocking fee)  
- Customer self-serve return request  
- Merchant approve/decline  
- Return shipping label  
- Refund / store credit / exchange  
- Restock inventory  
- Inspection complete state  

---

## 20. Apps, extensions, automation (platform layer)

Even in a clone, model the **architecture**:

- App install / scopes / webhooks  
- Admin UI extensions (order page blocks, product blocks)  
- Checkout UI extensions  
- Shopify Functions equivalents: discounts, delivery, payment customization, cart transform, validation  
- Flow automation: triggers (order created, inventory low) → conditions → actions (tag, email, hold fulfillment)  
- Webhooks: orders/create, products/update, refunds/create, etc.  
- Admin GraphQL + Storefront API style endpoints  
- Web pixels / customer events  
- Theme app extensions  

### Plus / enterprise extras
- Organization admin (multi-store)  
- Expansion stores  
- Unlimited staff  
- Launchpad (scheduled theme/campaign launches)  
- Higher API limits  
- Deeper checkout extensibility + custom Function apps  
- Advanced B2B catalog assignment  

---

## 21. Notifications & communications

Transactional emails/SMS (templates + variables):
- Order confirmation  
- Shipping confirmation + tracking  
- Delivery updates  
- Refund  
- Abandoned checkout  
- Account invite / reset password  
- Return updates  
- Payment reminder (B2B)  

---

## 22. Fraud, risk, compliance

- Risk score on order (low/medium/high)  
- Manual review queue  
- Address verification  
- PCI-aware checkout (never store raw PAN—tokenize)  
- GDPR/CCPA: data export/delete stubs  
- Tax invoices  

---

## 23. Data model (minimum entities)

`Shop`, `User/Staff`, `Role`, `Product`, `Variant`, `Media`, `Collection`, `CollectionRule`, `Metafield`,  
`Customer`, `Address`, `Company`, `CompanyLocation`, `Catalog`,  
`Cart`, `Checkout`, `Discount`, `GiftCard`,  
`Order`, `OrderLineItem`, `Transaction`, `Fulfillment`, `FulfillmentOrder`, `FulfillmentEvent`,  
`Return`, `Refund`, `InventoryItem`, `Location`, `InventoryLevel`, `Transfer`,  
`ShippingZone`, `ShippingRate`, `Market`, `Theme`, `Page`, `Blog`, `Article`, `Navigation`,  
`SellingPlan`, `SubscriptionContract`, `Webhook`, `App`, `Flow`, `NotificationTemplate`

---

## 24. Admin IA (screens to build)

1. Home dashboard  
2. Orders (+ detail, draft orders, abandoned checkouts)  
3. Products (+ collections, inventory, transfers, purchase orders stub)  
4. Customers (+ segments, companies)  
5. Marketing (discounts, campaigns, automations)  
6. Analytics  
7. Discounts  
8. Content (pages, blog, menus)  
9. Markets  
10. Online Store (themes, domains, preferences)  
11. Sales channels  
12. Settings (payments, shipping, taxes, locations, notifications, users, checkout, legal)  
13. Apps  

---

## 25. Acceptance scenarios (prove it’s Shopify-smart)

1. Create product with 2 options → 4 variants → publish → buy on storefront → paid order → fulfill with tracking → email  
2. Apply code + free shipping threshold → tax calculated → thank-you page  
3. Draft order invoice → customer pays → appears in Orders  
4. Partial fulfill from Location A, rest from B  
5. Return 1 item → restock → partial refund  
6. Customer account sees order + reorder  
7. B2B company catalog cheaper price + Net 30 checkout path  
8. Subscription product creates scheduled fulfillments  
9. Multi-currency market shows converted prices  
10. Staff with limited permissions cannot see payouts  
11. Inventory hits 0 → storefront shows sold out (unless continue selling)  
12. Discount auto BXGY works without code  

---

## 26. Build priority for the AI agent

**Phase A — Core commerce MVP**  
Catalog → storefront → cart → checkout → orders → fulfill → refund  

**Phase B — Ops**  
Inventory locations, shipping zones, discounts, customers, notifications  

**Phase C — Growth**  
Markets, analytics, drafts, abandoned checkout, gift cards  

**Phase D — Platform**  
Apps/webhooks/Flow stubs, checkout extension slots, B2B, subscriptions, POS  

**Phase E — Plus depth**  
Org/multi-store, Functions, advanced checkout UI, Launchpad  

---

## 27. Explicit non-goals (unless asked)

- Cloning every App Store app  
- Real carrier contracts / real Shopify Payments underwriting  
- Full Liquid theme compiler (approximate with React sections)  
- Perfect Shopify Admin visual clone (prefer clear IA + correct flows)

---

### One-liner prompt you can paste first

> Build a Shopify clone as a multifile React app: merchant admin + storefront + checkout. Implement the full commerce state machine (cart → checkout → payment statuses → fulfillment orders → tracking → returns/refunds/restock), products/variants/collections, multi-location inventory, shipping zones/rates, discount codes + automatic discounts, customers/accounts, draft orders, gift cards, basic Markets multi-currency, B2B companies/catalogs/net terms (even if simplified), subscription selling plans with scheduled fulfillments, staff roles, analytics dashboard, and extension points for apps/webhooks/Flow. Prioritize correct entities and flows over pixel-perfect Shopify UI. Ship Phase A end-to-end first, then B–D.

---
