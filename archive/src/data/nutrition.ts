export const defaultMacroTargets = {
  calories: 2200,
  protein: 180,
  carbs: 220,
  fat: 70,
  waterOz: 125,
};

export const optionalMicronutrientTargets = [
  { key: "fiber", label: "Fiber", unit: "g", target: 30 },
  { key: "sodium", label: "Sodium", unit: "mg", target: 2300 },
  { key: "potassium", label: "Potassium", unit: "mg", target: 3500 },
  { key: "calcium", label: "Calcium", unit: "mg", target: 1000 },
  { key: "iron", label: "Iron", unit: "mg", target: 18 },
  { key: "magnesium", label: "Magnesium", unit: "mg", target: 400 },
  { key: "zinc", label: "Zinc", unit: "mg", target: 11 },
  { key: "copper", label: "Copper", unit: "mg", target: 0.9 },
  { key: "niacin", label: "Niacin (B3)", unit: "mg", target: 16 },
];

export const goodFoods = [
  "Lean protein",
  "Greek yogurt",
  "Eggs",
  "Rice and potatoes for training fuel",
  "Fruit",
  "Vegetables",
  "Oats",
  "Nuts in moderation",
  "High-protein snacks",
];

export const badFoods = [
  "Highly processed foods",
  "Mindless binge foods",
  "Excess sodium",
  "Sugary drinks",
  "Overeating late at night",
];