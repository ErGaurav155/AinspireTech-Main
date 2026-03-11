# Environment Setup

Create a new file named `.env.local` in the root of your project and add the following content:

```env
#NEXT
NEXT_PUBLIC_SERVER_URL=

#MONGODB
MONGODB_URL=

#CLERK
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

#CLOUDINARY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

#STRIPE
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Replace the placeholder values with your actual respective account credentials. You can obtain these credentials by signing up on the [Clerk](https://clerk.com/), [MongoDB](https://www.mongodb.com/), [Cloudinary](https://cloudinary.com/) and [Stripe](https://stripe.com)

```bash
npm run dev
```

// return completion.choices[0].message.content || "I didn't understand that.";
// };
nst STRUCTURE = `rocketreplai/                          ROOT
├── .github/
│   └── workflows/
│       ├── deploy-admin.yml               NEW
│       ├── deploy-dashboard.yml           NEW
│       ├── deploy-marketing.yml           NEW
│       └── deploy-api.yml                NEW
├── apps/
│   ├── admin/
│   │   ├── app/
│   │   │   ├── globals.css                REPLACE
│   │   │   └── ... (keep all pages)
│   │   ├── components/                    KEEP AS IS
│   │   ├── lib/                           KEEP AS IS
│   │   ├── public/                        KEEP AS IS
│   │   ├── .env.local                     KEEP (never commit)
│   │   ├── next.config.js                 REPLACE
│   │   ├── package.json                   REPLACE
│   │   ├── postcss.config.js              KEEP AS IS
│   │   ├── tailwind.config.ts             REPLACE
│   │   ├── tsconfig.json                  REPLACE
│   │   ├── vercel.json                    REPLACE
│   │   └── components.json                ❌ DELETE
│   │
│   ├── api/
│   │   ├── src/                           KEEP ALL
│   │   ├── package.json                   ADD @rocketreplai/shared
│   │   ├── tsconfig.json                  REPLACE
│   │   └── railway.toml                   NEW
│   │
│   ├── dashboard/
│   │   ├── app/
│   │   │   ├── globals.css                REPLACE
│   │   │   └── ... (keep all pages)
│   │   ├── components/                    KEEP AS IS
│   │   ├── lib/                           KEEP AS IS
│   │   ├── public/                        KEEP AS IS
│   │   ├── .env.local                     KEEP (never commit)
│   │   ├── next.config.js                 REPLACE
│   │   ├── package.json                   REPLACE
│   │   ├── postcss.config.js              KEEP AS IS
│   │   ├── tailwind.config.ts             REPLACE
│   │   ├── tsconfig.json                  REPLACE
│   │   ├── vercel.json                    REPLACE
│   │   └── components.json                ❌ DELETE
│   │
│   └── marketing/
│       ├── app/
│       │   ├── globals.css                REPLACE
│       │   └── ... (keep all pages)
│       ├── components/                    KEEP AS IS
│       ├── lib/                           KEEP AS IS
│       ├── public/                        KEEP AS IS
│       ├── .env.local                     KEEP (never commit)
│       ├── next.config.js                 REPLACE
│       ├── package.json                   REPLACE
│       ├── postcss.config.js              KEEP AS IS
│       ├── tailwind.config.ts             REPLACE
│       ├── tsconfig.json                  REPLACE
│       ├── vercel.json                    REPLACE
│       └── components.json                ❌ DELETE
│
├── packages/
│   ├── config/                            📦 NEW PACKAGE
│   │   ├── package.json                   NEW
│   │   ├── eslint/
│   │   │   └── next.js                    NEW
│   │   ├── tailwind/
│   │   │   ├── base.config.ts             NEW
│   │   │   ├── dashboard.config.ts        NEW
│   │   │   └── marketing.config.ts        NEW
│   │   └── typescript/
│   │       ├── base.json                  NEW
│   │       ├── nextjs.json                NEW
│   │       └── node.json                  NEW
│   │
│   ├── shared/                            📦 NEW PACKAGE
│   │   ├── package.json                   NEW
│   │   ├── tsconfig.json                  NEW
│   │   └── src/
│   │       ├── index.ts                   NEW
│   │       ├── constants/
│   │       │   └── index.ts               NEW
│   │       ├── types/
│   │       │   └── index.ts               NEW
│   │       └── utils/
│   │           └── index.ts               NEW
│   │
│   └── ui/                                EXISTING - MODIFY
│       ├── package.json                   REWRITE
│       ├── tsconfig.json                  REWRITE
│       ├── src/
│       │   ├── index.ts                   ENSURE ALL EXPORTS
│       │   ├── globals.css                NEW
│       │   ├── lib/
│       │   │   └── utils.ts               KEEP AS IS
│       │   └── components/                KEEP ALL FILES
│       ├── components.json                KEEP (moved here)
│       ├── next-env.d.ts                  ❌ DELETE
│       └── next.config.js                 ❌ DELETE
│
├── .gitignore                             UPDATE
├── .npmrc                                 NEW
├── package.json                           UPDATE
├── package-lock.json                      regenerated
└── turbo.json                             NEW`;
