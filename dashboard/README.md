# Lewa Admin Dashboard

Next.js admin dashboard for managing Lewa students, news, resources, payments, calendar items, and support conversations.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Copy `.env.example` to `.env.local` and point `NEXT_PUBLIC_API_URL` at the Node.js backend.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Structure

- `src/app` - App Router routes and global styles.
- `src/lib/api.ts` - shared helper for backend API requests.
- `src/lib/utils.ts` - shared class-name utility for dashboard components.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
