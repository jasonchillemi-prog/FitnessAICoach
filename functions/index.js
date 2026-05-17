const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const ANTHROPIC_API_KEY = 'REDACTED_API_KEY';

const callAnthropic = async (messages, maxTokens = 2000, system = null) => {
  const body = {
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    messages
  };
  if (system) body.system = system;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  return response.json();
};

exports.generatePlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const { userData, busyDays } = data;
  const messages = [{
    role: 'user',
    content: `You are a fitness coach. Create a BRIEF personalized plan. Keep descriptions SHORT.\n\nUser:\n- Weight: ${userData.weight} lbs\n- Height: ${userData.height}\n- Age: ${userData.age}\n- Goals: ${userData.goals?.join(', ')}\n- Allergies: ${userData.allergies?.join(', ') || 'None'}\n- Workout times: ${userData.workoutTimes?.join(', ') || 'Any'}\n- Busy days (NO workouts): ${busyDays || 'None'}\n- Workouts per week: ${userData.workoutsPerWeek}\n\nCRITICAL: Never schedule workouts on busy days. Make meals VARIED.\n\nRespond ONLY with valid JSON:\n{"weeklyWorkouts":[{"day":"Monday","workout":"description","duration":"30 mins"}],"mondayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"tuesdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"wednesdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"thursdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"fridayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"saturdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"sundayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400},{"meal":"Lunch","time":"12:00 PM","food":"desc","calories":500},{"meal":"Dinner","time":"6:00 PM","food":"desc","calories":600},{"meal":"Snack","time":"3:00 PM","food":"desc","calories":200}],"groceryList":["item1","item2"],"dailyCalories":1800,"coachMessage":"personalized message"}`
  }];
  const data_resp = await callAnthropic(messages, 4000);
  if (data_resp.error) throw new functions.https.HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

exports.analyzeGoals = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const { goalDescription } = data;
  const messages = [{
    role: 'user',
    content: `Analyze this fitness goal description and extract specific targets. Respond ONLY with valid JSON:\n\nGoal: "${goalDescription}"\n\n{"targetWeight": "specific weight goal or null", "timeline": "timeline mentioned or null", "energyGoal": "energy related goal or null", "strengthGoal": "strength related goal or null", "otherGoals": "any other specific goals mentioned or null"}`
  }];
  const data_resp = await callAnthropic(messages, 500);
  if (data_resp.error) throw new functions.https.HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  const clean = t.replace(/```json|```/g, '').trim();
  return JSON.parse(clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
});

exports.coachChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const { messages, userData } = data;
  const system = `You are KineticIQ, a personalized AI fitness and nutrition coach. Here is your client's profile:
- Weight: ${userData.weight} lbs
- Height: ${userData.height}
- Age: ${userData.age}
- Goals: ${userData.goals?.join(', ') || 'Not specified'}
- Workouts per week: ${userData.workoutsPerWeek}
- Allergies: ${userData.allergies?.join(', ') || 'None'}
Be encouraging, specific, and concise. Keep responses to 3-5 sentences. If you make a specific suggestion that could update their plan, end your response with [SUGGESTION: brief description of the change].`;
  const data_resp = await callAnthropic(messages, 1000, system);
  if (data_resp.error) throw new functions.https.HttpsError('internal', data_resp.error.message);
  return { reply: data_resp.content[0].text };
});

exports.generateWorkoutDetail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const { workout, userData } = data;
  const messages = [{
    role: 'user',
    content: `Create a detailed workout. User: ${userData?.weight}lbs, Goals: ${userData?.goals?.join(', ')}, ${userData?.workoutsPerWeek} days/week.\nWorkout: ${workout.workout}\nDuration: ${workout.duration}\nDay: ${workout.day}\nRespond ONLY with valid JSON:\n{"warmup":{"duration":"5 mins","exercises":["ex1","ex2"]},"mainWorkout":[{"name":"Name","sets":3,"reps":"10-12","rest":"60 sec","muscle":"Chest","instructions":"How to do it."}],"cooldown":{"duration":"5 mins","exercises":["stretch1"]},"tips":["tip1"],"estimatedCalories":250}`
  }];
  const data_resp = await callAnthropic(messages, 2000);
  if (data_resp.error) throw new functions.https.HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});

exports.applyCoachSuggestion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const { suggestion, userData } = data;
  const messages = [{
    role: 'user',
    content: `You are a fitness coach. Update this user's plan based on the coach suggestion below. Keep descriptions SHORT.\n\nUser:\n- Weight: ${userData.weight} lbs\n- Goals: ${userData.goals?.join(', ')}\n- Allergies: ${userData.allergies?.join(', ') || 'None'}\n- Busy days: ${userData.busyDays?.join(', ') || 'None'}\n\nCoach suggestion to apply: "${suggestion}"\n\nRespond ONLY with valid JSON:\n{"weeklyWorkouts":[{"day":"Monday","workout":"description","duration":"30 mins"}],"mondayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"tuesdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"wednesdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"thursdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"fridayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"saturdayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"sundayMeals":[{"meal":"Breakfast","time":"8:00 AM","food":"desc","calories":400}],"groceryList":["item1"],"dailyCalories":1800,"coachMessage":"Updated plan based on coach suggestion"}`
  }];
  const data_resp = await callAnthropic(messages, 4000);
  if (data_resp.error) throw new functions.https.HttpsError('internal', data_resp.error.message);
  const t = data_resp.content[0].text;
  return JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
});
