/**
 * Calendar Helper Utilities
 * Functions to detect upcoming events and provide context-aware suggestions
 */
import api from '../services/api';

// Cache for fetched recipes
let cachedKidsMeals = null;
let cachedSimpleMeals = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

/**
 * Find the next "Kinderen" event
 * @param {Array} events - Array of calendar events
 * @returns {Object|null} - Next kids event with daysUntil property
 */
export const getNextKidsEvent = (events) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const kidsEvents = events
    .filter(event => event.title && event.title.toLowerCase().includes('kinderen'))
    .map(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
      return { ...event, daysUntil };
    })
    .filter(event => event.daysUntil >= 0) // Only future events
    .sort((a, b) => a.daysUntil - b.daysUntil);
  
  return kidsEvents.length > 0 ? kidsEvents[0] : null;
};

/**
 * Check if kids are currently present based on calendar
 * @param {Array} events - Array of calendar events
 * @returns {boolean}
 */
export const areKidsPresent = (events) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  return events.some(event => {
    if (!event.title || !event.title.toLowerCase().includes('kinderen')) {
      return false;
    }
    
    const eventStart = new Date(event.date + 'T00:00:00');
    const eventEnd = event.endDate ? new Date(event.endDate + 'T23:59:59') : new Date(event.date + 'T23:59:59');
    const todayDate = new Date(today + 'T' + now.toTimeString().split(' ')[0]);
    
    return todayDate >= eventStart && todayDate <= eventEnd;
  });
};

/**
 * Get smart shopping suggestions based on kids arrival
 * @param {number} daysUntil - Days until kids arrive
 * @param {number} kidsItemsCount - Current kids items in shopping list
 * @returns {Object|null} - Suggestion object with message and items
 */
export const getShoppingSuggestion = (daysUntil, kidsItemsCount) => {
  const kidsFavorites = [
    { text: 'Melk (volle)', category: 'kids' },
    { text: 'Hagelslag', category: 'kids' },
    { text: 'Fruit (appels, bananen)', category: 'kids' },
    { text: 'Sap (sinaasappel)', category: 'kids' },
    { text: 'Yoghurt', category: 'kids' },
    { text: 'Tussendoortjes (koekjes)', category: 'kids' },
    { text: 'Kaas (plakken)', category: 'kids' },
    { text: 'Brood (wit)', category: 'kids' },
    { text: 'Pasta', category: 'kids' },
    { text: 'Chips', category: 'kids' }
  ];
  
  if (daysUntil === 2 && kidsItemsCount < 5) {
    return {
      type: 'shopping',
      priority: 'high',
      icon: '🛒',
      title: 'Kinderen komen over 2 dagen!',
      message: `Je hebt maar ${kidsItemsCount} kinderen-items op je boodschappenlijst. Vergeet hun favorieten niet!`,
      suggestions: kidsFavorites.slice(0, 5),
      action: 'shopping'
    };
  }
  
  return null;
};

/**
 * Get meal planning suggestion based on kids arrival
 * @param {number} daysUntil - Days until kids arrive
 * @param {boolean} kidsPresent - Whether kids are currently present
 * @returns {Object|null} - Meal suggestion object
 */
export const getMealSuggestion = (daysUntil, kidsPresent) => {
  // Fallback hardcoded meals (used when API is not available or as initial data)
  const mealOptions = [
    {
      name: 'Pizza maken samen',
      ingredients: [
        { text: 'Pizzadeeg', category: 'kids' },
        { text: 'Tomatensaus', category: 'kids' },
        { text: 'Kaas (geraspte)', category: 'kids' },
        { text: 'Toppings (salami, paprika)', category: 'kids' }
      ]
    },
    {
      name: 'Pasta carbonara',
      ingredients: [
        { text: 'Spaghetti', category: 'kids' },
        { text: 'Spekblokjes', category: 'kids' },
        { text: 'Eieren', category: 'kids' },
        { text: 'Parmezaanse kaas', category: 'kids' }
      ]
    },
    {
      name: 'Wraps met kip',
      ingredients: [
        { text: 'Wraps (tortilla)', category: 'kids' },
        { text: 'Kipfilet', category: 'kids' },
        { text: 'Sla', category: 'kids' },
        { text: 'Tomatensalsa', category: 'kids' }
      ]
    },
    {
      name: 'Pannenkoeken',
      ingredients: [
        { text: 'Pannenkoekenmix', category: 'kids' },
        { text: 'Melk (volle)', category: 'kids' },
        { text: 'Eieren', category: 'kids' },
        { text: 'Stroop', category: 'kids' }
      ]
    },
    {
      name: 'Friet met snacks',
      ingredients: [
        { text: 'Friet (diepvries)', category: 'kids' },
        { text: 'Frikandellen', category: 'kids' },
        { text: 'Kroketten', category: 'kids' },
        { text: 'Mayonaise', category: 'kids' }
      ]
    }
  ];

  const simpleMeals = [
    {
      name: 'Snelle pasta',
      ingredients: [
        { text: 'Pasta', category: 'household' },
        { text: 'Pastasaus (pot)', category: 'household' }
      ]
    },
    {
      name: 'Salade met brood',
      ingredients: [
        { text: 'Salade (gemengd)', category: 'household' },
        { text: 'Brood', category: 'household' },
        { text: 'Tonijn (blik)', category: 'household' }
      ]
    },
    {
      name: 'Omelet',
      ingredients: [
        { text: 'Eieren', category: 'household' },
        { text: 'Kaas', category: 'household' },
        { text: 'Brood', category: 'household' }
      ]
    }
  ];
  
  // Use cached API meals if available, otherwise use fallback
  const kidsMeals = cachedKidsMeals || mealOptions;
  const soloMeals = cachedSimpleMeals || simpleMeals;
  
  if (daysUntil === 1) {
    return {
      type: 'meal',
      priority: 'medium',
      icon: '🍽️',
      title: 'Kinderen komen morgen!',
      message: 'Plan een gezellige familie-maaltijd. Klik op een gerecht om ingrediënten toe te voegen.',
      suggestions: kidsMeals,
      action: 'meals'
    };
  }
  
  if (daysUntil === 0 && kidsPresent) {
    return {
      type: 'meal',
      priority: 'high',
      icon: '👨‍👩‍👧‍👦',
      title: 'Kinderen zijn er!',
      message: 'Bereid een lekkere familie-maaltijd. Klik om ingrediënten toe te voegen.',
      suggestions: kidsMeals,
      portions: 'family',
      action: 'meals'
    };
  }
  
  // Only show solo meals if no kids events upcoming (daysUntil = 999 means no event found)
  if (!kidsPresent && daysUntil >= 999) {
    return {
      type: 'meal',
      priority: 'low',
      icon: '🍽️',
      title: 'Alleen thuis',
      message: 'Simpele maaltijden: klik om ingrediënten toe te voegen.',
      suggestions: soloMeals,
      portions: 'single',
      action: 'meals'
    };
  }
  
  return null;
};

/**
 * Fetch real recipes from TheMealDB API and cache them
 * @returns {Promise<void>}
 */
export const fetchRealRecipes = async () => {
  const now = Date.now();
  
  // Return if cache is still valid
  if (cachedKidsMeals && cachedSimpleMeals && (now - lastFetchTime) < CACHE_DURATION) {
    return;
  }
  
  try {
    // Fetch kid-friendly recipes (chicken, pasta, etc.)
    const kidSearchTerms = ['chicken', 'pasta', 'pizza', 'burger', 'pancakes'];
    const kidsMealsPromises = kidSearchTerms.map(term => 
      api.searchRecipes(term).catch(() => [])
    );
    
    const kidsMealsResults = await Promise.all(kidsMealsPromises);
    const allKidsMeals = kidsMealsResults.flat();
    
    // Transform to the format SmartAlert expects
    if (allKidsMeals.length > 0) {
      cachedKidsMeals = allKidsMeals
        .slice(0, 8) // Take top 8 recipes
        .map(recipe => ({
          name: recipe.name,
          image: recipe.image,
          ingredients: recipe.ingredients?.map(ing => ({
            text: ing.displayText,
            category: 'kids'
          })) || []
        }))
        .filter(meal => meal.ingredients.length > 0);
    }
    
    // Fetch simple meals (salad, soup, sandwich)
    const simpleSearchTerms = ['salad', 'soup', 'omelette'];
    const simpleMealsPromises = simpleSearchTerms.map(term => 
      api.searchRecipes(term).catch(() => [])
    );
    
    const simpleMealsResults = await Promise.all(simpleMealsPromises);
    const allSimpleMeals = simpleMealsResults.flat();
    
    if (allSimpleMeals.length > 0) {
      cachedSimpleMeals = allSimpleMeals
        .slice(0, 5)
        .map(recipe => ({
          name: recipe.name,
          image: recipe.image,
          ingredients: recipe.ingredients?.map(ing => ({
            text: ing.displayText,
            category: 'household'
          })) || []
        }))
        .filter(meal => meal.ingredients.length > 0);
    }
    
    lastFetchTime = now;
    console.log('calendarHelper: Fetched real recipes', {
      kidsMeals: cachedKidsMeals?.length || 0,
      simpleMeals: cachedSimpleMeals?.length || 0
    });
  } catch (error) {
    console.error('calendarHelper: Failed to fetch recipes, using fallback', error);
    // Keep using fallback meals
  }
};

/**
 * Get all smart suggestions for the current context
 * @param {Array} events - Calendar events
 * @param {number} kidsItemsCount - Kids items in shopping list
 * @returns {Array} - Array of suggestion objects
 */
export const getSmartSuggestions = (events, kidsItemsCount) => {
  const suggestions = [];
  
  // Don't generate suggestions until events have loaded
  if (!events || events.length === 0) {
    console.log('calendarHelper.getSmartSuggestions: waiting for events to load');
    return suggestions;
  }
  
  const nextKidsEvent = getNextKidsEvent(events);
  const kidsPresent = areKidsPresent(events);
  
  console.log('calendarHelper.getSmartSuggestions:', {
    eventsCount: events.length,
    kidsItemsCount,
    nextKidsEvent,
    kidsPresent
  });
  
  if (nextKidsEvent) {
    // Include event date in the alert so we can track which occurrence was dismissed
    const shoppingSuggestion = getShoppingSuggestion(nextKidsEvent.daysUntil, kidsItemsCount);
    if (shoppingSuggestion) {
      shoppingSuggestion.eventDate = nextKidsEvent.date;
      suggestions.push(shoppingSuggestion);
    }
    
    const mealSuggestion = getMealSuggestion(nextKidsEvent.daysUntil, kidsPresent);
    if (mealSuggestion) {
      mealSuggestion.eventDate = nextKidsEvent.date;
      suggestions.push(mealSuggestion);
    }
  } else if (!kidsPresent) {
    // Only show solo meals if NO kids events upcoming at all
    const mealSuggestion = getMealSuggestion(999, false);
    if (mealSuggestion) {
      suggestions.push(mealSuggestion);
    }
  }
  
  console.log('calendarHelper.getSmartSuggestions result:', suggestions);
  
  return suggestions;
};
