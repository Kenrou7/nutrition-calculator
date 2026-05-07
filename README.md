## Nutrition Calculator

Frontend app built with Next.js + TypeScript to track daily nutrition from foods you eat.

### Current features

- Add foods from a starter list.
- Enter grams eaten per food item.
- Pick the consumed date from a calendar input.
- View running totals for calories, protein, carbs, and fat.
- See macro energy distribution (protein/carbs/fat) as percentages.
- Browse a long-term registry grouped by date.
- Entries are saved in local storage for persistent tracking.
- Remove individual entries or clear the day.

## Run locally

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

Open http://localhost:3000 with your browser to use the app.

## Scripts

- `npm run dev`: start local development server
- `npm run lint`: run ESLint
- `npm run build`: create production build
- `npm run start`: run production server

## Project structure

- `src/components/NutritionCalculator.tsx`: main calculator UI and state logic
- `src/data/foods.ts`: starter nutrition dataset
- `src/types/nutrition.ts`: shared nutrition types
- `src/app/page.tsx`: page entry
- `src/app/globals.css`: global theme and UI utility styles

## Next improvements

- Add custom foods with manual macro input.
- Persist daily entries with local storage or backend API.
- Add daily targets and progress indicators.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
