# Where Talent Meets Film

Global talent and casting platform for **Golding's Production Company**.

## Foundation
- Mobile-first global landing page
- Actor and production pathways
- Global country → region/state/province → city location model
- Actor profile architecture
- Casting calls, applications, auditions and shortlists planned
- Service/payment request workflow connected to Supabase

## Services & payments
The platform now includes a global service-payment workflow for:
- Acting classes / workshops — USD 1,000 reference
- Professional headshots — USD 250 reference
- Showreel / demo video — USD 300 reference
- Actor portfolio / CV — USD 800 reference
- Casting / agency commission — 10–20% of earnings
- Actors association membership — variable/admin-set
- Travel to auditions — USD 500 reference
- Film / drama training program — USD 700 reference

The USD figures are reference values. Users provide their country, then the administrator sets the applicable local amount, currency, payment method, account and instructions from the payment desk.

### Workflow
1. User selects a service and submits a request.
2. Admin reviews the request.
3. Admin sets local amount/currency and supplies payment account/instructions.
4. User pays using those instructions.
5. User uploads payment proof.
6. Admin reviews the proof and can confirm, reject or cancel the request.

## Supabase
Project ref: `hbnzedaeknnmyzmmpwpk`

The database includes the service catalog, global payment fields, RLS policies and a private `payment-proofs` storage bucket.

## Routes
- `/` — public platform landing page
- `/actors/register` — actor registration foundation
- `/payments` — user service request and payment-proof page
- `/admin/payments` — admin payment service desk

## Environment
Copy `.env.example` into your deployment environment and provide the Supabase publishable/anon key. Never commit service-role keys or payment-provider secrets.

## Development
Next.js App Router + TypeScript + Supabase JS. Install dependencies and run `npm run dev` for local development.

The payment workflow is implemented, while broader production features such as full authentication onboarding, persistent actor profiles, production dashboards, casting management and live payment-provider integrations remain subsequent phases.
