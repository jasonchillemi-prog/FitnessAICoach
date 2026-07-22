const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const RATE_LIMITS = {
  generatePlan: 3,
  coachChat: 20,
  generateWorkoutDetail: 10,
  generateRecipe: 10,
  applyCoachSuggestion: 5,
  analyzeGoals: 20,
  matchMealPlan: 3,
  buildGroceryList: 5,
};

const checkRateLimit = async (uid, functionName) => {
  const db = admin.firestore();
  const today = new Date();
  const utcDateKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  const ref = db.collection('users').doc(uid).collection('rateLimits').doc(utcDateKey);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const current = data[functionName] || 0;
  const limit = RATE_LIMITS[functionName];
  if (current >= limit) {
    throw new HttpsError('resource-exhausted', `Daily limit of ${limit} reached for ${functionName}. Resets at midnight UTC.`);
  }
  await ref.set({ [functionName]: current + 1 }, { merge: true });
};

// ─── Anthropic Helper ────────────────────────────────────────────────────────
const callAnthropic = async (apiKey, messages, maxTokens = 2000, system = null) => {
  const body = { model: 'claude-sonnet-4-5', max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  return response.json();
};

// ─── generatePlan ────────────────────────────────────────────────────────────
exports.generatePlan = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'generatePlan');
  const { userData, busyDays } = request.data;
  const messages = [{ role: 'user', content: `You are a fitness coach. Create a personalized plan. Keep descriptions SHORT.

User:
- Weight: ${userData.weight} lbs
- Height: ${userData.height}
- Age: ${userData.age}
- Goals: ${userData.goals?.join(', ')}
- Allergies/Food restrictions: ${userData.allergies?.join(', ') || 'None'}${userData.otherAllergy ? ', ' + userData.otherAllergy : ''}
- Workout times: ${userData.workoutTimes?.join(', ') || 'Any'}
- Busy days (NO workouts): ${busyDays || 'None'}
- Workouts per week: ${userData.workoutsPerWeek}
- Smoker/Vaper: ${userData.smoker ? 'Yes' : 'No'}

IMPORTANT MEAL PLAN RULES:
1. NEVER include any food or ingredient that conflicts with the user's allergies or food restrictions. This is a hard rule — no exceptions, not even in small amounts.
2. Respect all user food preferences across every meal, snack, and grocery item.
3. Create only 2-5 DISTINCT meals that rotate across the week.
4. All meals must be BUDGET-FRIENDLY (cheap, common ingredients, under $5 per meal).
5. Grocery list MUST include specific quantities for every single item (e.g. "2 lbs chicken breast", "18 eggs", "2 lbs rolled oats"). Never list an ingredient without an amount.
6. Grocery list should cover the full week.
7. Never schedule workouts on busy days.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "weeklyWorkouts": [{"day": "Monday", "workout": "description", "duration": "30 mins"}],
  "mondayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "tuesdayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "wednesdayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "thursdayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "fridayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "saturdayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "sundayMeals": [{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],
  "groceryList": ["2 lbs chicken breast", "18 eggs", "2 lbs rolled oats", "1 bunch bananas"],
  "dailyCalories": 1800,
  "coachMessage": "personalized motivational message"
}` }];
  const data_resp = await callAnthropic(ANTHROPIC_API_KEY.value(), messages, 4000);
  if (data_resp.error) throw new HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

// ─── analyzeGoals ────────────────────────────────────────────────────────────
exports.analyzeGoals = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'analyzeGoals');
  const { goalDescription } = request.data;
  const messages = [{ role: 'user', content: `Analyze this fitness goal and extract targets. Respond ONLY with valid JSON:

Goal: "${goalDescription}"

{"targetWeight": "specific weight goal or null", "timeline": "timeline mentioned or null", "energyGoal": "energy related goal or null", "strengthGoal": "strength related goal or null", "otherGoals": "any other specific goals or null"}` }];
  const data_resp = await callAnthropic(ANTHROPIC_API_KEY.value(), messages, 500);
  if (data_resp.error) throw new HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

// ─── coachChat ───────────────────────────────────────────────────────────────
exports.coachChat = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'coachChat');
  const { messages, userData } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();
  const historyRef = db.collection('users').doc(uid).collection('coach').doc('history');
  const historySnap = await historyRef.get();
  const savedHistory = historySnap.exists ? (historySnap.data().messages || []) : [];
  const latestUserMsg = messages[messages.length - 1];
  const trimmed = [...savedHistory, latestUserMsg].slice(-40);
  const system = `You are KineticIQ, a personalized AI fitness and nutrition coach. Client profile:
- Weight: ${userData?.weight} lbs, Height: ${userData?.height}, Age: ${userData?.age}
- Goals: ${userData?.goals?.join(', ') || 'Not specified'}
- Workouts per week: ${userData?.workoutsPerWeek}
- Allergies: ${userData?.allergies?.join(', ') || 'None'}
- Smoker/Vaper: ${userData?.smoker ? 'Yes' : 'No'}
Be encouraging, specific, and concise. Keep responses to 3-5 sentences.
IMPORTANT: Do NOT introduce yourself or say "Hi, I'm your KineticIQ coach" or any variation of that. Never greet with a self-introduction. Jump straight into helping the user.
You remember past conversations.
IMPORTANT: Any time you make a specific actionable suggestion to change workouts, meals, or the grocery list, you MUST end your entire response with [SUGGESTION: one sentence description of the change]. This tag is required for the app to show the Apply button. Do not forget it.`;
  const data_resp = await callAnthropic(ANTHROPIC_API_KEY.value(), trimmed, 1000, system);
  if (data_resp.error) throw new HttpsError('internal', data_resp.error.message);
  const reply = data_resp.content[0].text;
  const updatedHistory = [...savedHistory, latestUserMsg, { role: 'assistant', content: reply }].slice(-60);
  await historyRef.set({ messages: updatedHistory, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { reply };
});

// ─── generateWorkoutDetail ───────────────────────────────────────────────────
exports.generateWorkoutDetail = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'generateWorkoutDetail');
  const { workout, userData } = request.data;
  const messages = [{ role: 'user', content: `Create a detailed workout. User: ${userData?.weight}lbs, Goals: ${userData?.goals?.join(', ')}, ${userData?.workoutsPerWeek} days/week.
Workout: ${workout.workout}
Duration: ${workout.duration}
Day: ${workout.day}
Respond ONLY with valid JSON:
{"warmup":{"duration":"5 mins","exercises":["ex1","ex2"]},"mainWorkout":[{"name":"Name","sets":3,"reps":"10-12","rest":"60 sec","muscle":"Chest","instructions":"How to do it."}],"cooldown":{"duration":"5 mins","exercises":["stretch1"]},"tips":["tip1"],"estimatedCalories":250}` }];
  const data_resp = await callAnthropic(ANTHROPIC_API_KEY.value(), messages, 2000);
  if (data_resp.error) throw new HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

// ─── applyCoachSuggestion ────────────────────────────────────────────────────
exports.applyCoachSuggestion = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'applyCoachSuggestion');
  const { suggestion, userData, currentPlan } = request.data;

  const wantsWorkout = /workout|exercise|training|lift|cardio|gym|run|walk|stretch/i.test(suggestion);
  const wantsMeals = /meal|eat|food|diet|nutrition|breakfast|lunch|dinner|snack|calorie|fast|fasting|intermittent|eating window|schedule|plan/i.test(suggestion);
  const wantsGrocery = /grocery|groceries|shopping|list|ingredient/i.test(suggestion);

  const updateWorkout = wantsWorkout || (!wantsMeals && !wantsGrocery);
  const updateMeals = wantsMeals || (!wantsWorkout && !wantsGrocery);
  const updateGrocery = true;

  const workoutSection = updateWorkout ? `"weeklyWorkouts": [{"day": "Monday", "workout": "description", "duration": "30 mins"}, ...all 7 days],` : '';
  const mealSection = updateMeals ? `"mondayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}], "tuesdayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}], "wednesdayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}], "thursdayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}], "fridayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}], "saturdayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}], "sundayMeals": [{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":400},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"8:00 PM","food":"desc","calories":200}],` : '';
  const grocerySection = updateGrocery ? `"groceryList": ["2 lbs chicken breast", "18 eggs"],` : '';

  const updateLabel = [updateWorkout && 'workouts', updateMeals && 'meals (ALL 7 days)', updateGrocery && 'grocery list'].filter(Boolean).join(', ');
  const messages = [{ role: 'user', content: `You are a fitness coach. Update ONLY the requested parts of this user's plan. Keep descriptions SHORT.

User:
- Weight: ${userData.weight} lbs, Goals: ${userData.goals?.join(', ')}
- Allergies: ${userData.allergies?.join(', ') || 'None'}${userData.otherAllergy ? ', ' + userData.otherAllergy : ''}
- Busy days: ${userData.busyDays?.join(', ') || 'None'}

Coach suggestion: "${suggestion}"

Current meal plan (KEEP all existing meals exactly as-is, only modify what the suggestion specifically requests):
${currentPlan ? JSON.stringify({
  mondayMeals: currentPlan.mondayMeals,
  tuesdayMeals: currentPlan.tuesdayMeals,
  wednesdayMeals: currentPlan.wednesdayMeals,
  thursdayMeals: currentPlan.thursdayMeals,
  fridayMeals: currentPlan.fridayMeals,
  saturdayMeals: currentPlan.saturdayMeals,
  sundayMeals: currentPlan.sundayMeals
}) : '{}'}

Current grocery list:
${currentPlan?.groceryList ? JSON.stringify(currentPlan.groceryList) : '[]'}

When updating the grocery list:
- REMOVE any items that are no longer needed based on the coach suggestion (e.g. if an ingredient is being eliminated from the diet, remove it)
- KEEP all other existing items
- ADD any new items needed for the changes
- Never include ingredients the user wants removed or that conflict with their allergies

Update ONLY these sections: ${updateLabel}

IMPORTANT:
- NEVER include ingredients or foods that conflict with the user's allergies or food restrictions. This is a hard rule — no exceptions.
- Respect all user food preferences and restrictions across every meal and grocery item.
- Budget-friendly meals only (under $5 per meal, common ingredients).
- Grocery list MUST include specific quantities for every single item (e.g. "2 lbs chicken breast").
- If updating meals, return ALL 7 days.
- ONLY include the sections listed above — do not include other sections.

Respond ONLY with valid JSON (no markdown) containing ONLY the sections being updated:
{
  ${workoutSection}
  ${mealSection}
  ${grocerySection}
  "dailyCalories": 1800,
  "coachMessage": "Updated plan based on coach suggestion"
}` }];
  const data_resp = await callAnthropic(ANTHROPIC_API_KEY.value(), messages, 4000);
  if (data_resp.error) throw new HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

// ─── generateRecipe ──────────────────────────────────────────────────────────
exports.generateRecipe = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'generateRecipe');
  const { meal, userData } = request.data;
  const messages = [{ role: 'user', content: `Create a detailed recipe for this meal. User: ${userData?.weight}lbs, Goals: ${userData?.goals?.join(', ')}, Allergies: ${userData?.allergies?.join(', ') || 'None'}.
Meal: ${meal?.food || meal?.meal}
Meal type: ${meal?.meal}
Calories: ${meal?.calories}
Respond ONLY with valid JSON:
{"name":"Meal Name","prepTime":"10 mins","cookTime":"20 mins","servings":1,"nutritionInfo":{"calories":"500 kcal","protein":"30g","carbs":"40g","fat":"15g"},"ingredients":[{"amount":"1 cup","item":"ingredient name"},{"amount":"2 tbsp","item":"another ingredient"}],"instructions":["Step 1 description","Step 2 description","Step 3 description"],"tips":"A helpful cooking tip"}` }];
  const data_resp = await callAnthropic(ANTHROPIC_API_KEY.value(), messages, 1500);
  if (data_resp.error) throw new HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

// ─── matchMealPlan: library-based plan helpers ───────────────────────────────
// Pure deterministic logic — no AI calls. Same inputs always produce the same plan.
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_SLOTS = [
  { slot: 'breakfast', label: 'Breakfast', time: '8:00 AM', budgetShare: 0.25 },
  { slot: 'lunch', label: 'Lunch', time: '12:00 PM', budgetShare: 0.35 },
  { slot: 'dinner', label: 'Dinner', time: '6:00 PM', budgetShare: 0.40 },
];
const MEAL_REUSE_GAP_DAYS = 3; // a meal used on Monday is eligible again Thursday
const ALLERGY_KEYWORDS = {
  dairy: ['dairy', 'milk', 'lactose', 'cheese', 'yogurt'],
  egg: ['egg'],
  fish: ['fish', 'salmon', 'tuna', 'cod'],
  gluten: ['gluten', 'wheat'],
  sesame: ['sesame'],
  shellfish: ['shellfish', 'shrimp', 'crab', 'lobster'],
  soy: ['soy'],
  tree_nut: ['nut', 'almond', 'cashew', 'walnut', 'pecan', 'peanut'],
};

const normalizeTag = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

// FNV-1a 32-bit hash — deterministic per-user variety without randomness
const hash32 = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

const parseHeightInches = (height) => {
  if (typeof height === 'number' && Number.isFinite(height)) return height;
  const m = String(height || '').match(/(\d+(?:\.\d+)?)\s*ft\.?\s*(\d+(?:\.\d+)?)?\s*(?:in)?/i);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  const n = parseFloat(height);
  return Number.isFinite(n) ? n : 67; // adult average fallback
};

// Mifflin-St Jeor BMR × activity factor, adjusted for goal direction
const computeDailyCalories = (userData) => {
  const weightKg = (parseFloat(userData.weight) || 170) * 0.453592;
  const heightCm = parseHeightInches(userData.height) * 2.54;
  const age = parseInt(userData.age, 10) || 30;
  const isMale = normalizeTag(userData.biologicalSex).startsWith('m');
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (isMale ? 5 : -161);
  const wpw = parseInt(userData.workoutsPerWeek, 10) || 3;
  const activity = wpw <= 3 ? 1.375 : wpw <= 5 ? 1.55 : 1.725;
  let target = bmr * activity;
  const goalsText = (userData.goals || []).join(' ').toLowerCase();
  if (/lose|loss|lean|cut|slim/.test(goalsText)) target -= 400;
  else if (/muscle|gain|bulk|strength|build/.test(goalsText)) target += 300;
  return Math.round(Math.min(4000, Math.max(1400, target)) / 50) * 50;
};

const buildUserAllergenSet = (userData) => {
  const raw = [...(userData.allergies || []), userData.otherAllergy]
    .filter(Boolean).map(normalizeTag).filter((r) => r && r !== 'none');
  const tags = new Set();
  for (const r of raw) {
    for (const [tag, words] of Object.entries(ALLERGY_KEYWORDS)) {
      if (words.some((w) => r.includes(normalizeTag(w)))) tags.add(tag);
    }
    tags.add(r);
  }
  return { tags, raw };
};

// HARD RULE: allergen tag match OR raw allergy word appearing in any ingredient name excludes the meal
const mealViolatesAllergies = (meal, { tags, raw }) => {
  if ((meal.allergens || []).some((a) => tags.has(normalizeTag(a)))) return true;
  const ingredientText = (meal.ingredients || []).map((i) => normalizeTag(i.name)).join(' ');
  return raw.some((r) => r.length >= 3 && ingredientText.includes(r));
};

const mealMatchesDiet = (meal, dietKey) => {
  if (!dietKey || dietKey === 'none' || dietKey === 'balanced' || dietKey === 'no_preference') return true;
  const tags = (meal.diet_tags || []).map(normalizeTag);
  if (dietKey === 'vegetarian') return tags.includes('vegetarian') || tags.includes('vegan');
  return tags.includes(dietKey);
};

const scoreMeal = (meal, budget, goalsText, uid) => {
  let score = Math.max(0, 60 - (Math.abs((meal.calories || 0) - budget) / budget) * 100);
  const protein = (meal.macros && meal.macros.protein_g) || 0;
  const fiber = (meal.macros && meal.macros.fiber_g) || 0;
  const tags = (meal.diet_tags || []).map(normalizeTag);
  if (/muscle|gain|bulk|strength|build/.test(goalsText)) {
    score += (tags.includes('high_protein') ? 15 : 0) + protein * 0.4;
  }
  if (/lose|loss|lean|cut|slim/.test(goalsText)) {
    score += (tags.includes('low_carb') ? 10 : 0) + fiber + protein * 0.2;
  }
  score += ((hash32(`${uid}:${meal.id}`) % 1000) / 1000) * 8;
  return score;
};

const buildLibraryMealPlan = (uid, userData, meals) => {
  const dailyCalories = computeDailyCalories(userData);
  const goalsText = (userData.goals || []).join(' ').toLowerCase();
  const dietKey = normalizeTag(userData.diet);
  const allergens = buildUserAllergenSet(userData);

  const safeMeals = meals.filter((m) => m.active !== false && !mealViolatesAllergies(m, allergens));
  if (safeMeals.length === 0) {
    throw new HttpsError('failed-precondition', 'No meals in the library match this allergy profile.');
  }

  const gaps = {}; // comboId -> { diet, slot, count }
  const logGap = (slot) => {
    const comboId = `${dietKey || 'any'}_${slot}`;
    if (!gaps[comboId]) gaps[comboId] = { diet: dietKey || 'any', slot, count: 0 };
    gaps[comboId].count += 1;
  };

  const lastUsedDay = {};
  const mealIdCounts = {};
  const dayMeals = {};

  for (let d = 0; d < 7; d++) {
    const entries = [];
    for (const { slot, label, time, budgetShare } of MEAL_SLOTS) {
      const budget = dailyCalories * budgetShare;
      // Diet is a preference — relax it gradually before failing. Allergies are never relaxed.
      // Relaxation ladder: exact diet → (vegan falls back to vegetarian) → any diet.
      const dietIsRestrictive = dietKey && !['none', 'balanced', 'no_preference'].includes(dietKey);
      const slotMeals = safeMeals.filter((m) => (m.meal_type || []).includes(slot));
      let pool = slotMeals.filter((m) => mealMatchesDiet(m, dietKey));
      if (pool.length === 0) {
        if (dietIsRestrictive) logGap(slot); // library lacks this diet+slot combo entirely
        if (dietKey === 'vegan') {
          // Step down to vegetarian without egg/dairy first, then vegetarian, before anything else
          const veg = slotMeals.filter((m) => mealMatchesDiet(m, 'vegetarian'));
          pool = veg.filter((m) => !(m.allergens || []).some((a) => ['egg', 'dairy'].includes(normalizeTag(a))));
          if (pool.length === 0) pool = veg;
        }
        if (pool.length === 0) pool = slotMeals;
      }
      if (pool.length === 0) {
        throw new HttpsError('failed-precondition', `No safe ${slot} meals available in the library for this user.`);
      }
      const ranked = pool
        .map((m) => ({ m, s: scoreMeal(m, budget, goalsText, uid) }))
        .sort((a, b) => b.s - a.s || (a.m.id < b.m.id ? -1 : 1));
      let pick = ranked.find(({ m }) => lastUsedDay[m.id] === undefined || d - lastUsedDay[m.id] >= MEAL_REUSE_GAP_DAYS);
      if (!pick) {
        // 3-day rule must relax: take the least-recently-used, best-scoring meal, and log the gap
        pick = [...ranked].sort((a, b) => (lastUsedDay[a.m.id] - lastUsedDay[b.m.id]) || (b.s - a.s))[0];
        logGap(slot);
      }
      const meal = pick.m;
      lastUsedDay[meal.id] = d;
      mealIdCounts[meal.id] = (mealIdCounts[meal.id] || 0) + 1;
      entries.push({ meal: label, time, food: meal.name, calories: meal.calories || 0, mealId: meal.id });
    }
    dayMeals[`${DAY_NAMES[d].toLowerCase()}Meals`] = entries;
  }

  return { dayMeals, dailyCalories, gaps, mealIdCounts };
};

const DIFFICULTY_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
const WORKOUT_TYPES = ['strength', 'cardio', 'hiit', 'flexibility'];

// Goal-derived affinity for a workout type; 0 when no goal speaks for it
const goalAffinity = (goalsText, type) => {
  let a = 0;
  if (/muscle|strength|build|tone/.test(goalsText)) {
    if (type === 'strength') a += 30;
    if (type === 'hiit') a += 8;
  }
  if (/lose|loss|lean|cut|slim|weight/.test(goalsText)) {
    if (type === 'hiit') a += 20;
    if (type === 'cardio') a += 15;
    if (type === 'strength') a += 12;
  }
  if (/endurance|stamina|fit|run/.test(goalsText)) {
    if (type === 'cardio') a += 20;
    if (type === 'hiit') a += 12;
  }
  if (/flexib|stress|mobility/.test(goalsText)) {
    if (type === 'flexibility') a += 18;
  }
  return a;
};

// Goal-aware workout scoring — the analogue of scoreMeal. Difficulty is a soft
// target (exact +20, one step away +8), never a hard filter, so training
// frequency no longer locks users out of the rest of the library.
const scoreWorkout = (workout, goalsText, targetDifficulty, uid, nudgeEnabled = true) => {
  const type = normalizeTag(workout.type);
  let score = goalAffinity(goalsText, type);
  // No goal spoke for this type — baseline keeps real training ahead of stretching
  if (score === 0) score = { strength: 12, cardio: 10, hiit: 10, flexibility: 4 }[type] || 0;
  const tier = DIFFICULTY_ORDER[normalizeTag(workout.difficulty)] || 0;
  const dist = Math.abs(tier - DIFFICULTY_ORDER[targetDifficulty]);
  score += dist === 0 ? 20 : dist === 1 ? 8 : 0;
  // Goal-primary difficulty nudge: for the user's strongest goal-matched
  // type(s), one tier above target scores level with the exact tier (+12
  // offsets the 20-vs-8 gap) so frequency doesn't cap intensity in practice.
  // Disabled for the wpw=0 on-ramp cohort, which stays strictly beginner.
  if (nudgeEnabled) {
    const maxAffinity = Math.max(...WORKOUT_TYPES.map((t) => goalAffinity(goalsText, t)));
    if (maxAffinity > 0 && goalAffinity(goalsText, type) === maxAffinity && tier === DIFFICULTY_ORDER[targetDifficulty] + 1) {
      score += 12;
    }
  }
  score += Math.min(workout.duration_minutes || 0, 60) * 0.15;
  score += ((hash32(`${uid}:${workout.id}`) % 1000) / 1000) * 8;
  return score;
};

const buildLibraryWorkoutPlan = (uid, userData, busyDays, workouts) => {
  const wpwRaw = parseInt(userData.workoutsPerWeek, 10);
  const wpw = Number.isFinite(wpwRaw) ? wpwRaw : 3;
  // Frequency drives day count directly; 0/week gets a 2-day on-ramp, and the
  // cap of 6 guarantees at least one rest day.
  const workoutDayCount = wpw === 0 ? 2 : Math.min(Math.max(wpw, 1), 6);
  const targetDifficulty = wpw <= 2 ? 'beginner' : wpw <= 5 ? 'intermediate' : 'advanced';

  const busyList = Array.isArray(busyDays) ? busyDays : String(busyDays || '').split(',');
  // Client sends abbreviated day names ('Mon, Wed') — match on 3-letter prefix
  const busy = new Set(busyList.map(normalizeTag).filter((x) => x && x !== 'none').map((x) => x.slice(0, 3)));
  const available = DAY_NAMES.filter((day) => !busy.has(normalizeTag(day).slice(0, 3)));
  const count = Math.min(workoutDayCount, available.length);
  const chosenDays = [];
  for (let i = 0; i < count; i++) chosenDays.push(available[Math.floor((i * available.length) / count)]);

  // Rest-type docs are never selectable — rest-day entries are generated below
  const pool = workouts.filter((w) => w.active !== false && normalizeTag(w.type) !== 'rest');
  if (pool.length === 0) throw new HttpsError('failed-precondition', 'No workouts available in the library.');

  const goalsText = (userData.goals || []).join(' ').toLowerCase();
  const flexCap = /flexib|stress|mobility/.test(goalsText) ? 2 : 1;

  const gaps = {}; // docId -> { difficulty, type, reason, count }
  const logGap = (type, reason) => {
    const docId = `${targetDifficulty}_${type}_${reason}`;
    if (!gaps[docId]) gaps[docId] = { difficulty: targetDifficulty, type, reason, count: 0 };
    gaps[docId].count += 1;
  };

  // Greedy day-by-day selection: best score wins after variety penalties —
  // repeat within the week −25 per use, same type as the previous workout day
  // −15, flexibility beyond the weekly cap −20.
  const useCount = {};
  let flexUsed = 0;
  let prevType = null;
  let prevId = null;
  // Goal-focus exception: alternation permits at most ceil(count/2) days of
  // one type, so at count <= 2 variety and goal focus are mutually exclusive —
  // there, the user's primary goal type may repeat (distinct docs only).
  // Keyed on actual day count, not wpw, so busy-day-compressed weeks qualify.
  const maxAff = Math.max(...WORKOUT_TYPES.map((t) => goalAffinity(goalsText, t)));
  const primaryTypes = new Set(WORKOUT_TYPES.filter((t) => maxAff > 0 && goalAffinity(goalsText, t) === maxAff));
  const goalFocusMode = count <= 2;
  const picks = [];
  for (let i = 0; i < count; i++) {
    const ranked = pool
      .map((w) => {
        const type = normalizeTag(w.type);
        let s = scoreWorkout(w, goalsText, targetDifficulty, uid, wpw !== 0);
        s -= (useCount[w.id] || 0) * 25;
        if (prevType && type === prevType) s -= 15;
        if (type === 'flexibility' && flexUsed >= flexCap) s -= 20;
        return { w, s };
      })
      .sort((a, b) => b.s - a.s || (a.w.id < b.w.id ? -1 : 1));
    // Back-to-back type is a hard rule, not just the −15: take the best
    // different-type candidate, same type only when no alternative exists —
    // except in goal-focus mode, where the primary type may repeat
    const best = ranked.find(({ w }) => {
      const t = normalizeTag(w.type);
      if (t !== prevType) return true;
      return goalFocusMode && primaryTypes.has(t) && w.id !== prevId;
    }) || ranked[0];
    const pick = best.w;
    const pickType = normalizeTag(pick.type);
    if (useCount[pick.id]) logGap(pickType, 'repeat_forced');
    if (normalizeTag(pick.difficulty) !== targetDifficulty &&
        !pool.some((w) => normalizeTag(w.type) === pickType && normalizeTag(w.difficulty) === targetDifficulty && !useCount[w.id])) {
      logGap(pickType, 'difficulty_relaxed');
    }
    useCount[pick.id] = (useCount[pick.id] || 0) + 1;
    if (pickType === 'flexibility') flexUsed += 1;
    prevType = pickType;
    prevId = pick.id;
    picks.push(pick);
  }
  if (/muscle|strength|build|tone/.test(goalsText) && count >= 3 &&
      picks.filter((p) => normalizeTag(p.type) === 'strength').length < 2) {
    logGap('strength', 'goal_type_unmet');
  }
  // Full 7-day week: workout days plus deterministic rest-day entries, so the
  // client renders Mon–Sun like AI-generated plans. Rest entries carry
  // type 'rest' and no workoutId so stats can exclude them.
  const REST_DAYS = [
    { workout: 'Rest Day - Light stretching', duration: '15 mins' },
    { workout: 'Rest Day - Easy walk', duration: '20 mins' },
    { workout: 'Rest Day - Yoga or stretching', duration: '20 mins' },
  ];
  const byDay = {};
  chosenDays.forEach((day, i) => {
    byDay[day] = {
      day,
      workout: picks[i].name,
      duration: `${picks[i].duration_minutes} mins`,
      workoutId: picks[i].id,
      type: picks[i].type,
      difficulty: picks[i].difficulty,
    };
  });
  return {
    week: DAY_NAMES.map((day, d) => byDay[day] || { day, ...REST_DAYS[d % REST_DAYS.length], type: 'rest' }),
    gaps,
  };
};

// ─── matchMealPlan ───────────────────────────────────────────────────────────
exports.matchMealPlan = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'matchMealPlan');
  const uid = request.auth.uid;
  const { userData = {}, busyDays } = request.data || {};

  const db = admin.firestore();
  const [mealsSnap, workoutsSnap] = await Promise.all([
    db.collection('meals').get(),
    db.collection('workouts').get(),
  ]);
  const meals = mealsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const workouts = workoutsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const { dayMeals, dailyCalories, gaps, mealIdCounts } = buildLibraryMealPlan(uid, userData, meals);
  const { week: weeklyWorkouts, gaps: workoutGaps } =
    buildLibraryWorkoutPlan(uid, userData, busyDays !== undefined ? busyDays : userData.busyDays, workouts);

  // Log library coverage gaps (meals + workouts) — best-effort, never blocks the plan
  const gapEntries = Object.entries(gaps);
  const workoutGapEntries = Object.entries(workoutGaps);
  if (gapEntries.length > 0 || workoutGapEntries.length > 0) {
    try {
      const batch = db.batch();
      for (const [comboId, g] of gapEntries) {
        batch.set(db.collection('mealLibraryGaps').doc(comboId), {
          diet: g.diet,
          slot: g.slot,
          count: admin.firestore.FieldValue.increment(g.count),
          lastLoggedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      for (const [docId, g] of workoutGapEntries) {
        batch.set(db.collection('workoutLibraryGaps').doc(docId), {
          difficulty: g.difficulty,
          type: g.type,
          reason: g.reason,
          count: admin.firestore.FieldValue.increment(g.count),
          lastLoggedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
    } catch (e) {
      console.error('library gap logging failed:', e.message);
    }
  }

  const firstName = userData.firstName ? String(userData.firstName).trim() : '';
  const coachMessage = `${firstName ? firstName + ', your' : 'Your'} new plan is built from KineticIQ's curated library — dialed in at about ${dailyCalories} calories a day for your goals. Let's get after it!`;

  return {
    ...dayMeals,
    weeklyWorkouts,
    dailyCalories,
    coachMessage,
    mealIdCounts,
    planSource: 'library',
  };
});

// ─── buildGroceryList: aggregation helpers ───────────────────────────────────
// Pure logic — aggregates ingredients across the week's meals, deduplicated by
// canonical_name + unit. Quantities are summed only when units match exactly.
const aggregateGroceries = (mealsWithCounts) => {
  const agg = new Map(); // key: canonicalName|unit
  for (const { meal, count } of mealsWithCounts) {
    for (const ing of meal.ingredients || []) {
      const canonical = normalizeTag(ing.canonical_name || ing.name);
      const unit = String(ing.unit || '').toLowerCase().trim();
      const key = `${canonical}|${unit}`;
      if (!agg.has(key)) {
        agg.set(key, {
          name: ing.name,
          amount: 0,
          unit: ing.unit || '',
          category: ing.category || 'other',
          mealSource: [],
        });
      }
      const entry = agg.get(key);
      entry.amount += (parseFloat(ing.amount) || 0) * count;
      if (!entry.mealSource.includes(meal.name)) entry.mealSource.push(meal.name);
    }
  }
  return [...agg.values()]
    .map((e) => ({ ...e, amount: Math.round(e.amount * 100) / 100 }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
};

// ─── buildGroceryList ────────────────────────────────────────────────────────
// Reads meal docs for the week's selected meal IDs and returns an aggregated,
// deduplicated grocery list. Never reads or writes groceryUserItems — user-added
// items live in a separate field and are merged client-side.
exports.buildGroceryList = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  await checkRateLimit(request.auth.uid, 'buildGroceryList');
  const { mealIdCounts, mealIds } = request.data || {};

  // Accept either { mealIdCounts: {id: timesUsed} } (matchMealPlan output)
  // or { mealIds: [id, id, ...] } (duplicates counted)
  const counts = {};
  if (mealIdCounts && typeof mealIdCounts === 'object' && !Array.isArray(mealIdCounts)) {
    for (const [id, n] of Object.entries(mealIdCounts)) {
      const c = parseInt(n, 10);
      if (id && c > 0) counts[id] = Math.min(c, 21);
    }
  } else if (Array.isArray(mealIds)) {
    for (const id of mealIds) {
      if (typeof id === 'string' && id) counts[id] = (counts[id] || 0) + 1;
    }
  }
  const ids = Object.keys(counts);
  if (ids.length === 0) throw new HttpsError('invalid-argument', 'Provide mealIdCounts or mealIds.');
  if (ids.length > 25) throw new HttpsError('invalid-argument', 'Too many meal IDs (max 25 distinct meals per week).');

  const db = admin.firestore();
  const snaps = await db.getAll(...ids.map((id) => db.collection('meals').doc(id)));
  const mealsWithCounts = [];
  const missingMealIds = [];
  for (const snap of snaps) {
    if (snap.exists) mealsWithCounts.push({ meal: { id: snap.id, ...snap.data() }, count: counts[snap.id] });
    else missingMealIds.push(snap.id);
  }
  if (mealsWithCounts.length === 0) {
    throw new HttpsError('not-found', 'None of the provided meal IDs exist in the meal library.');
  }

  return {
    groceryList: aggregateGroceries(mealsWithCounts),
    missingMealIds,
    listSource: 'library',
  };
});

// ─── deleteAccount ───────────────────────────────────────────────────────────
// Server-side deletion avoids the client's requires-recent-login re-auth and
// guarantees no orphaned data: user doc + all subcollections, uid-prefixed
// checkins, then the Auth account itself.
exports.deleteAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in to delete account.');
  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    // Removes users/{uid} and every subcollection under it (rateLimits, coach, any future ones)
    await db.recursiveDelete(db.collection('users').doc(uid));

    // checkins is a top-level collection with doc IDs formatted {uid}_{date}
    const checkinsSnap = await db.collection('checkins')
      .where(admin.firestore.FieldPath.documentId(), '>=', `${uid}_`)
      .where(admin.firestore.FieldPath.documentId(), '<=', `${uid}_\uf8ff`)
      .get();
    for (let i = 0; i < checkinsSnap.docs.length; i += 500) {
      const batch = db.batch();
      checkinsSnap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Auth account last, only after all data is gone
    await admin.auth().deleteUser(uid);

    return { success: true };
  } catch (err) {
    console.error('deleteAccount failed for uid', uid, err);
    throw new HttpsError('internal', 'Account deletion failed. Please try again.');
  }
});
