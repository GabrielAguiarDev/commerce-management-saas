This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3002](http://localhost:3002) with your browser to see the result.

> **A porta 3002 é fixa de propósito, e não é preferência.** O `portal-client` é
> um PWA e registra um service worker na porta 3000; service worker vale para a
> ORIGEM inteira, não para uma aplicação. Rodando esta página em 3000 ela herda
> aquele worker, que passa a servir os `/_next/static/*` dela do cache do
> portal — e o sintoma é um erro de hidratação teimoso, com o servidor
> entregando código novo e o navegador rodando o antigo, que sobrevive a
> reiniciar o dev server porque a cópia velha está no navegador. Cada app do
> monorepo tem porta própria por isso: 3000 portal-client, 3001 portal-admin,
> 3002 esta página.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
