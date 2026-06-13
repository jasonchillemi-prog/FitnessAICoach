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
  const updateGrocery = wantsGrocery || wantsMeals;

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
- If updating the grocery list, KEEP all existing items and only ADD new items needed for the changes. Never remove existing items.
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
