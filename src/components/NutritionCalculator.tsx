"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { foods } from "@/data/foods";
import { getDictionary, locales, type Locale } from "@/i18n/translations";
import type { DailyEntry, FoodItem, MacroValues, MealType } from "@/types/nutrition";

const EMPTY_TOTALS: MacroValues = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

const ENTRIES_STORAGE_KEY = "nutrition-calculator-entries-v1";
const CALORIE_PROFILE_STORAGE_KEY = "nutrition-calculator-profile-v1";

function getTodayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

function multiplyMacros(macros: MacroValues, factor: number): MacroValues {
  return {
    calories: roundTo1(macros.calories * factor),
    protein: roundTo1(macros.protein * factor),
    carbs: roundTo1(macros.carbs * factor),
    fat: roundTo1(macros.fat * factor),
  };
}

function addMacros(a: MacroValues, b: MacroValues): MacroValues {
  return {
    calories: roundTo1(a.calories + b.calories),
    protein: roundTo1(a.protein + b.protein),
    carbs: roundTo1(a.carbs + b.carbs),
    fat: roundTo1(a.fat + b.fat),
  };
}

function macroPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function findFoodById(id: string): FoodItem | undefined {
  return foods.find((food) => food.id === id);
}

function isMealType(value: string): value is MealType {
  return value === "breakfast" || value === "lunch" || value === "snack" || value === "dinner" || value === "extra";
}

type CalorieProfile = {
  sex: Sex;
  age: string;
  weightKg: string;
  heightCm: string;
  activityLevel: ActivityLevel;
};

function isActivityLevel(value: string): value is ActivityLevel {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "active" || value === "very-active";
}

function loadCalorieProfile(): CalorieProfile {
  if (typeof window === "undefined") {
    return {
      sex: "female",
      age: "30",
      weightKg: "65",
      heightCm: "165",
      activityLevel: "moderate",
    };
  }

  const raw = window.localStorage.getItem(CALORIE_PROFILE_STORAGE_KEY);
  if (!raw) {
    return {
      sex: "female",
      age: "30",
      weightKg: "65",
      heightCm: "165",
      activityLevel: "moderate",
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CalorieProfile>;

    const sex = parsed.sex === "male" || parsed.sex === "female" ? parsed.sex : "female";
    const age = typeof parsed.age === "string" ? parsed.age : "30";
    const weightKg = typeof parsed.weightKg === "string" ? parsed.weightKg : "65";
    const heightCm = typeof parsed.heightCm === "string" ? parsed.heightCm : "165";
    const activityLevel =
      typeof parsed.activityLevel === "string" && isActivityLevel(parsed.activityLevel)
        ? parsed.activityLevel
        : "moderate";

    return {
      sex,
      age,
      weightKg,
      heightCm,
      activityLevel,
    };
  } catch {
    return {
      sex: "female",
      age: "30",
      weightKg: "65",
      heightCm: "165",
      activityLevel: "moderate",
    };
  }
}

type Sex = "male" | "female";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very-active";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

export function NutritionCalculator() {
  const initialCalorieProfile = loadCalorieProfile();
  const [locale, setLocale] = useState<Locale>("es");
  const [selectedFoodId, setSelectedFoodId] = useState(foods[0]?.id ?? "");
  const [foodSearch, setFoodSearch] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [grams, setGrams] = useState("");
  const [sex, setSex] = useState<Sex>(initialCalorieProfile.sex);
  const [age, setAge] = useState(initialCalorieProfile.age);
  const [weightKg, setWeightKg] = useState(initialCalorieProfile.weightKg);
  const [heightCm, setHeightCm] = useState(initialCalorieProfile.heightCm);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialCalorieProfile.activityLevel);
  const [activeDate, setActiveDate] = useState(getTodayIsoDate());
  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(ENTRIES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as DailyEntry[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.flatMap((entry) => {
        const hasValidShape =
          typeof entry?.id === "string" &&
          typeof entry?.foodId === "string" &&
          typeof entry?.foodName === "string" &&
          typeof entry?.consumedOn === "string" &&
          typeof entry?.grams === "number" &&
          typeof entry?.macros?.calories === "number" &&
          typeof entry?.macros?.protein === "number" &&
          typeof entry?.macros?.carbs === "number" &&
          typeof entry?.macros?.fat === "number";

        if (!hasValidShape) {
          return [];
        }

        const parsedMeal = typeof entry.mealType === "string" && isMealType(entry.mealType) ? entry.mealType : "breakfast";
        const parsedExtraIndex =
          parsedMeal === "extra" && typeof entry.extraIndex === "number" && entry.extraIndex > 0
            ? Math.floor(entry.extraIndex)
            : 0;

        const normalized: DailyEntry = {
          id: entry.id,
          foodId: entry.foodId,
          foodName: entry.foodName,
          consumedOn: entry.consumedOn,
          mealType: parsedMeal,
          extraIndex: parsedExtraIndex,
          grams: entry.grams,
          macros: entry.macros,
        };

        return [normalized];
      });
    } catch {
      return [];
    }
  });
  const t = getDictionary(locale);

  const getLocalizedFoodName = useCallback(
    (foodId: string, fallbackName: string): string => {
      return t.foods[foodId as keyof typeof t.foods] ?? fallbackName;
    },
    [t],
  );

  const localizedSortedFoods = useMemo(() => {
    return foods
      .map((food) => ({ ...food, displayName: getLocalizedFoodName(food.id, food.name) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, locale));
  }, [getLocalizedFoodName, locale]);

  const filteredFoods = useMemo(() => {
    const query = foodSearch.trim().toLowerCase();
    if (!query) {
      return localizedSortedFoods;
    }

    return localizedSortedFoods.filter((food) => food.displayName.toLowerCase().includes(query));
  }, [foodSearch, localizedSortedFoods]);

  const activeFoodId = filteredFoods.some((food) => food.id === selectedFoodId)
    ? selectedFoodId
    : filteredFoods[0]?.id ?? "";

  useEffect(() => {
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const profile: CalorieProfile = {
      sex,
      age,
      weightKg,
      heightCm,
      activityLevel,
    };

    localStorage.setItem(CALORIE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [activityLevel, age, heightCm, sex, weightKg]);

  const totals = useMemo(() => {
    return entries
      .filter((entry) => entry.consumedOn === activeDate)
      .reduce((sum, entry) => addMacros(sum, entry.macros), EMPTY_TOTALS);
  }, [activeDate, entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => entry.consumedOn === activeDate);
  }, [activeDate, entries]);

  const groupedEntriesByMeal = useMemo(() => {
    const grouped: Record<MealType, DailyEntry[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
      extra: [],
    };

    for (const entry of filteredEntries) {
      grouped[entry.mealType].push(entry);
    }

    return (["breakfast", "lunch", "snack", "dinner", "extra"] as MealType[])
      .map((meal) => ({ meal, items: grouped[meal] }))
      .filter((section) => section.items.length > 0);
  }, [filteredEntries]);

  const dateSummaries = useMemo(() => {
    const summaryMap: Record<string, { count: number; totals: MacroValues }> = {};

    for (const entry of entries) {
      if (!summaryMap[entry.consumedOn]) {
        summaryMap[entry.consumedOn] = { count: 0, totals: { ...EMPTY_TOTALS } };
      }

      summaryMap[entry.consumedOn].count += 1;
      summaryMap[entry.consumedOn].totals = addMacros(summaryMap[entry.consumedOn].totals, entry.macros);
    }

    return Object.entries(summaryMap)
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const kcalFromProtein = totals.protein * 4;
  const kcalFromCarbs = totals.carbs * 4;
  const kcalFromFat = totals.fat * 9;
  const kcalFromMacros = kcalFromProtein + kcalFromCarbs + kcalFromFat;

  const proteinShare = macroPercent(kcalFromProtein, kcalFromMacros);
  const carbsShare = macroPercent(kcalFromCarbs, kcalFromMacros);
  const fatShare = macroPercent(kcalFromFat, kcalFromMacros);

  const selectedFood = findFoodById(activeFoodId);

  function getMealName(type: MealType): string {
    return t[type];
  }

  const calorieNeeds = useMemo(() => {
    const ageValue = Number(age);
    const weightValue = Number(weightKg);
    const heightValue = Number(heightCm);

    if (
      Number.isNaN(ageValue) ||
      Number.isNaN(weightValue) ||
      Number.isNaN(heightValue) ||
      ageValue <= 0 ||
      weightValue <= 0 ||
      heightValue <= 0
    ) {
      return {
        bmr: 0,
        maintenance: 0,
        loss025: 0,
        loss05: 0,
      };
    }

    const sexOffset = sex === "male" ? 5 : -161;
    const bmr = 10 * weightValue + 6.25 * heightValue - 5 * ageValue + sexOffset;
    const maintenance = bmr * ACTIVITY_FACTORS[activityLevel];

    return {
      bmr: Math.round(bmr),
      maintenance: Math.round(maintenance),
      loss025: Math.max(0, Math.round(maintenance - 275)),
      loss05: Math.max(0, Math.round(maintenance - 550)),
    };
  }, [activityLevel, age, heightCm, sex, weightKg]);

  function addEntry() {
    if (!selectedFood) {
      return;
    }

    const numericGrams = Number(grams);
    if (Number.isNaN(numericGrams) || numericGrams <= 0) {
      return;
    }

    const entryMacros = multiplyMacros(selectedFood.macrosPerGram, numericGrams);
    const nextExtraIndex =
      mealType === "extra"
        ? entries.filter((entry) => entry.consumedOn === activeDate && entry.mealType === "extra").length + 1
        : 0;

    const newEntry: DailyEntry = {
      id: `${selectedFood.id}-${Date.now()}`,
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      consumedOn: activeDate,
      mealType,
      extraIndex: nextExtraIndex,
      grams: numericGrams,
      macros: entryMacros,
    };

    setEntries((previousEntries) => [newEntry, ...previousEntries]);
    setGrams("");
  }

  function removeEntry(entryId: string) {
    setEntries((previousEntries) => previousEntries.filter((entry) => entry.id !== entryId));
  }

  function clearDay() {
    setEntries((previousEntries) => previousEntries.filter((entry) => entry.consumedOn !== activeDate));
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-ink)]">{t.appKicker}</p>
            <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
              {t.appTitle}
            </h1>
          </div>

          <div className="grid w-full gap-3 sm:max-w-[22rem] sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {t.viewDateLabel}
              <input
                type="date"
                value={activeDate}
                onChange={(event) => setActiveDate(event.target.value)}
                className="input-base"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {t.languageLabel}
              <select
                className="input-base"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                {locales.map((option) => (
                  <option key={option} value={option}>
                    {option === "en" ? "English" : "Espanol"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel rounded-3xl p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-semibold text-[var(--ink)]">{t.addFoodTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {t.foodLabel}
              <input
                type="search"
                value={foodSearch}
                onChange={(event) => setFoodSearch(event.target.value)}
                className="input-base"
                placeholder={t.searchFoodPlaceholder}
              />
              <select
                value={activeFoodId}
                onChange={(event) => setSelectedFoodId(event.target.value)}
                className="input-base"
              >
                {filteredFoods.length === 0 ? (
                  <option value="">{t.noFoodsFound}</option>
                ) : (
                  filteredFoods.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.displayName}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {t.mealLabel}
              <select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)} className="input-base">
                <option value="breakfast">{t.breakfast}</option>
                <option value="lunch">{t.lunch}</option>
                <option value="snack">{t.snack}</option>
                <option value="dinner">{t.dinner}</option>
                <option value="extra">{t.extra}</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {t.gramsLabel}
              <input
                type="number"
                step="1"
                min="0"
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
                className="input-base"
              />
            </label>

            <button type="button" onClick={addEntry} className="button-main h-11 px-5">
              {t.addButton}
            </button>
          </div>

          {(() => {
            const numericGrams = parseFloat(grams);
            if (!selectedFood || !grams || Number.isNaN(numericGrams) || numericGrams <= 0) {
              return null;
            }
            const preview = multiplyMacros(selectedFood.macrosPerGram, numericGrams);
            return (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <article className="stat-card py-2">
                  <p className="stat-label">{t.calories}</p>
                  <p className="stat-value text-lg">{preview.calories}</p>
                  <p className="stat-unit">kcal</p>
                </article>
                <article className="stat-card py-2">
                  <p className="stat-label">{t.protein}</p>
                  <p className="stat-value text-lg">{preview.protein}</p>
                  <p className="stat-unit">g</p>
                </article>
                <article className="stat-card py-2">
                  <p className="stat-label">{t.carbs}</p>
                  <p className="stat-value text-lg">{preview.carbs}</p>
                  <p className="stat-unit">g</p>
                </article>
                <article className="stat-card py-2">
                  <p className="stat-label">{t.fat}</p>
                  <p className="stat-value text-lg">{preview.fat}</p>
                  <p className="stat-unit">g</p>
                </article>
              </div>
            );
          })()}
        </section>

        <section className="panel rounded-3xl p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--ink)]">{t.totalsTitle}</h2>
            <button type="button" onClick={clearDay} className="text-sm font-medium text-[var(--accent-ink)]">
              {t.clearAll}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article className="stat-card">
              <p className="stat-label">{t.calories}</p>
              <p className="stat-value">{totals.calories}</p>
              <p className="stat-unit">kcal</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">{t.protein}</p>
              <p className="stat-value">{totals.protein}</p>
              <p className="stat-unit">g</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">{t.carbs}</p>
              <p className="stat-value">{totals.carbs}</p>
              <p className="stat-unit">g</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">{t.fat}</p>
              <p className="stat-value">{totals.fat}</p>
              <p className="stat-unit">g</p>
            </article>
          </div>

          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[var(--meter-track)]">
            <div style={{ width: `${proteinShare}%` }} className="h-full bg-[var(--protein)]" />
            <div style={{ width: `${carbsShare}%` }} className="h-full bg-[var(--carbs)]" />
            <div style={{ width: `${fatShare}%` }} className="h-full bg-[var(--fat)]" />
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted-ink)]">
            <span>{t.protein}: {proteinShare}%</span>
            <span>{t.carbs}: {carbsShare}%</span>
            <span>{t.fat}: {fatShare}%</span>
          </div>
        </section>
      </div>

      <section className="panel mt-6 rounded-3xl p-5 sm:p-7">
        <h2 className="text-xl font-semibold text-[var(--ink)]">{t.calorieNeedsTitle}</h2>
        <p className="mt-1 text-sm text-[var(--muted-ink)]">{t.calorieNeedsDescription}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
            {t.sexLabel}
            <select value={sex} onChange={(event) => setSex(event.target.value as Sex)} className="input-base">
              <option value="female">{t.female}</option>
              <option value="male">{t.male}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
            {t.ageLabel}
            <input
              type="number"
              min="0"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="input-base"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
            {t.weightLabel}
            <input
              type="number"
              min="0"
              step="0.1"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              className="input-base"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
            {t.heightLabel}
            <input
              type="number"
              min="0"
              value={heightCm}
              onChange={(event) => setHeightCm(event.target.value)}
              className="input-base"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted-ink)]">
            {t.activityLabel}
            <select
              value={activityLevel}
              onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}
              className="input-base"
            >
              <option value="sedentary">{t.activitySedentary}</option>
              <option value="light">{t.activityLight}</option>
              <option value="moderate">{t.activityModerate}</option>
              <option value="active">{t.activityActive}</option>
              <option value="very-active">{t.activityVeryActive}</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article className="stat-card">
            <p className="stat-label">{t.bmrLabel}</p>
            <p className="stat-value">{calorieNeeds.bmr}</p>
            <p className="stat-unit">kcal</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">{t.maintenanceLabel}</p>
            <p className="stat-value">{calorieNeeds.maintenance}</p>
            <p className="stat-unit">kcal</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">{t.loss025Label}</p>
            <p className="stat-value">{calorieNeeds.loss025}</p>
            <p className="stat-unit">kcal</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">{t.loss05Label}</p>
            <p className="stat-value">{calorieNeeds.loss05}</p>
            <p className="stat-unit">kcal</p>
          </article>
        </div>
      </section>

      <section className="panel mt-6 rounded-3xl p-5 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold text-[var(--ink)]">{t.foodsAddedTitle}</h2>

        {filteredEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--card-border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted-ink)]">
            {t.emptyState}
          </p>
        ) : (
          <div className="space-y-5">
            {groupedEntriesByMeal.map((section) => (
              <div key={section.meal}>
                <h3 className="mb-3 text-base font-semibold text-[var(--ink)]">{getMealName(section.meal)}</h3>
                <ul className="space-y-3">
                  {section.items.map((entry) => (
                    <li key={entry.id} className="entry-row">
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{getLocalizedFoodName(entry.foodId, entry.foodName)}</p>
                        <p className="text-sm text-[var(--muted-ink)]">
                          {entry.mealType === "extra" && entry.extraIndex > 0
                            ? `${t.extra} ${entry.extraIndex} • ${entry.grams} g`
                            : `${entry.grams} g`}
                        </p>
                      </div>
                      <div className="entry-macros">
                        <span>{entry.macros.calories} kcal</span>
                        <span>{entry.macros.protein}P</span>
                        <span>{entry.macros.carbs}C</span>
                        <span>{entry.macros.fat}F</span>
                      </div>
                      <button type="button" onClick={() => removeEntry(entry.id)} className="entry-remove">
                        {t.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel mt-6 rounded-3xl p-5 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold text-[var(--ink)]">{t.historyTitle}</h2>

        {dateSummaries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--card-border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted-ink)]">
            {t.emptyState}
          </p>
        ) : (
          <ul className="space-y-3">
            {dateSummaries.map((summary) => (
              <li key={summary.date} className="entry-row">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{summary.date}</p>
                  <p className="text-sm text-[var(--muted-ink)]">
                    {summary.count} {t.entriesCount}
                  </p>
                </div>
                <div className="entry-macros">
                  <span>{summary.totals.calories} kcal</span>
                  <span>{summary.totals.protein}P</span>
                  <span>{summary.totals.carbs}C</span>
                  <span>{summary.totals.fat}F</span>
                </div>
                <button type="button" onClick={() => setActiveDate(summary.date)} className="entry-remove">
                  {t.viewDateLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
