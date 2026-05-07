"use client";

import dynamic from "next/dynamic";

const NutritionCalculator = dynamic(
  () => import("@/components/NutritionCalculator").then((module) => module.NutritionCalculator),
  { ssr: false },
);

export function NutritionCalculatorClientOnly() {
  return <NutritionCalculator />;
}
