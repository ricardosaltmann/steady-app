import { DailyDietData, FoodItem, MacroGoals, MealType } from '../../types';
import { getLocalDateKey } from '../dateUtils';
import { auth } from '../auth';

export const getScopedKey = (base: string, userId?: string): string => {
  const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
  return `steady_${uid}_${base}`;
};

export const DEFAULT_MACRO_GOALS: MacroGoals = {
  calories: 2200,
  proteinGrams: 160,
  carbsGrams: 240,
  fatGrams: 65,
};

export interface QuickFoodTemplate {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  defaultMeal?: MealType;
}

export const COMMON_FOOD_LIBRARY: QuickFoodTemplate[] = [
  { name: 'Peito de Frango Grelhado', portion: '150g', calories: 245, protein: 46, carbs: 0, fat: 5, defaultMeal: 'lunch' },
  { name: 'Arroz Branco Cozido', portion: '150g', calories: 195, protein: 3.8, carbs: 42, fat: 0.5, defaultMeal: 'lunch' },
  { name: 'Ovos Cozidos / Mexidos', portion: '2 unidades', calories: 144, protein: 12.6, carbs: 1.1, fat: 9.9, defaultMeal: 'breakfast' },
  { name: 'Whey Protein (1 Scoop)', portion: '30g', calories: 120, protein: 24, carbs: 2, fat: 1.5, defaultMeal: 'snack' },
  { name: 'Aveia em Flocos', portion: '50g', calories: 185, protein: 7, carbs: 32, fat: 3.5, defaultMeal: 'breakfast' },
  { name: 'Banana Prata', portion: '1 unidade (90g)', calories: 92, protein: 1.2, carbs: 24, fat: 0.3, defaultMeal: 'breakfast' },
  { name: 'Batata Doce Cozida', portion: '150g', calories: 130, protein: 2, carbs: 30, fat: 0.2, defaultMeal: 'lunch' },
  { name: 'Carne Moída Patinho', portion: '150g', calories: 215, protein: 36, carbs: 0, fat: 7, defaultMeal: 'dinner' },
  { name: 'Pasta de Amendoim', portion: '1 colher (30g)', calories: 185, protein: 8, carbs: 6, fat: 15, defaultMeal: 'snack' },
  { name: 'Azeite de Oliva Extra Virgem', portion: '1 colher de sopa (13ml)', calories: 108, protein: 0, carbs: 0, fat: 12, defaultMeal: 'lunch' },
  { name: 'Pão Integral', portion: '2 fatias (50g)', calories: 125, protein: 5.5, carbs: 23, fat: 1.8, defaultMeal: 'breakfast' },
  { name: 'Queijo Cottage / Minas Frescal', portion: '50g', calories: 65, protein: 9, carbs: 1.5, fat: 2.5, defaultMeal: 'breakfast' },
  { name: 'Iogurte Natural Desnatado', portion: '1 pote (160g)', calories: 85, protein: 7, carbs: 10, fat: 1, defaultMeal: 'snack' },
  { name: 'Maçã Fuji', portion: '1 unidade (130g)', calories: 72, protein: 0.4, carbs: 19, fat: 0.2, defaultMeal: 'snack' },
  { name: 'Salmão Grelhado', portion: '150g', calories: 310, protein: 34, carbs: 0, fat: 18, defaultMeal: 'dinner' },
];

export const dietStorage = {
  getMacroGoals: (userId?: string): MacroGoals => {
    const key = getScopedKey('macro_goals', userId);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_MACRO_GOALS;
    try {
      return { ...DEFAULT_MACRO_GOALS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_MACRO_GOALS;
    }
  },

  saveMacroGoals: (goals: MacroGoals, userId?: string) => {
    const key = getScopedKey('macro_goals', userId);
    localStorage.setItem(key, JSON.stringify(goals));
  },

  getDietData: (dateStr?: string, userId?: string): DailyDietData => {
    const today = dateStr || getLocalDateKey();
    const key = getScopedKey(`diet_${today}`, userId);
    const raw = localStorage.getItem(key);
    const goals = dietStorage.getMacroGoals(userId);

    const emptyDiet: DailyDietData = {
      date: today,
      goals,
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      },
      exerciseCaloriesBurned: 0,
    };

    if (!raw) return emptyDiet;

    try {
      const parsed: DailyDietData = JSON.parse(raw);
      return {
        ...emptyDiet,
        ...parsed,
        goals: parsed.goals || goals,
        meals: {
          breakfast: parsed.meals?.breakfast || [],
          lunch: parsed.meals?.lunch || [],
          dinner: parsed.meals?.dinner || [],
          snack: parsed.meals?.snack || [],
        },
      };
    } catch {
      return emptyDiet;
    }
  },

  saveDietData: (data: DailyDietData, userId?: string) => {
    const key = getScopedKey(`diet_${data.date}`, userId);
    localStorage.setItem(key, JSON.stringify(data));
  },

  addFoodItem: (
    mealType: MealType,
    food: Omit<FoodItem, 'id'>,
    dateStr?: string,
    userId?: string
  ): DailyDietData => {
    const current = dietStorage.getDietData(dateStr, userId);
    const nowTime = new Date().toTimeString().slice(0, 5);

    const newItem: FoodItem = {
      ...food,
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      loggedAt: food.loggedAt || nowTime,
    };

    const updatedMeals = {
      ...current.meals,
      [mealType]: [...(current.meals[mealType] || []), newItem],
    };

    const updatedData: DailyDietData = {
      ...current,
      meals: updatedMeals,
    };

    dietStorage.saveDietData(updatedData, userId);
    return updatedData;
  },

  removeFoodItem: (
    mealType: MealType,
    foodId: string,
    dateStr?: string,
    userId?: string
  ): DailyDietData => {
    const current = dietStorage.getDietData(dateStr, userId);

    const updatedMeals = {
      ...current.meals,
      [mealType]: (current.meals[mealType] || []).filter(item => item.id !== foodId),
    };

    const updatedData: DailyDietData = {
      ...current,
      meals: updatedMeals,
    };

    dietStorage.saveDietData(updatedData, userId);
    return updatedData;
  },

  setExerciseCalories: (caloriesBurned: number, dateStr?: string, userId?: string): DailyDietData => {
    const current = dietStorage.getDietData(dateStr, userId);
    const updated: DailyDietData = {
      ...current,
      exerciseCaloriesBurned: caloriesBurned,
    };
    dietStorage.saveDietData(updated, userId);
    return updated;
  },

  calculateDailyTotals: (diet: DailyDietData) => {
    const allFoods = [
      ...(diet.meals.breakfast || []),
      ...(diet.meals.lunch || []),
      ...(diet.meals.dinner || []),
      ...(diet.meals.snack || []),
    ];

    const foodCalories = allFoods.reduce((acc, f) => acc + (f.calories || 0), 0);
    const totalProtein = allFoods.reduce((acc, f) => acc + (f.protein || 0), 0);
    const totalCarbs = allFoods.reduce((acc, f) => acc + (f.carbs || 0), 0);
    const totalFat = allFoods.reduce((acc, f) => acc + (f.fat || 0), 0);

    const remainingCalories = Math.round(
      diet.goals.calories - foodCalories + (diet.exerciseCaloriesBurned || 0)
    );

    return {
      foodCalories: Math.round(foodCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      remainingCalories,
      progressPercent: diet.goals.calories > 0
        ? Math.min(100, Math.round((foodCalories / diet.goals.calories) * 100))
        : 0,
    };
  },
};
