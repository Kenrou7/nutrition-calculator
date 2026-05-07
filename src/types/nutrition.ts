export type MacroValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealType = "breakfast" | "lunch" | "snack" | "dinner" | "extra";

export type FoodItem = {
  id: string;
  name: string;
  macrosPerGram: MacroValues;
};

export type DailyEntry = {
  id: string;
  foodId: string;
  foodName: string;
  consumedOn: string;
  mealType: MealType;
  extraIndex: number;
  grams: number;
  macros: MacroValues;
};
