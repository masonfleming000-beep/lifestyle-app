import { goodFoods, badFoods, optionalMicronutrientTargets } from "../../data/nutrition";

export const nutritionClientConfig = {
  defaultGoodFoods: goodFoods ?? [],
  defaultBadFoods: badFoods ?? [],
  defaultMicros: optionalMicronutrientTargets ?? {},
};
