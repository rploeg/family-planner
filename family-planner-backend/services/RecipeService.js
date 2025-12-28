/**
 * RecipeService - Fetches recipes from TheMealDB API
 * Free API, no key required
 * https://www.themealdb.com/api.php
 */

const https = require('https');
const translator = require('./IngredientTranslator');

class RecipeService {
  constructor() {
    this.baseUrl = 'https://www.themealdb.com/api/json/v1/1';
  }

  async fetch(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error('Failed to parse response'));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Search recipes by name
   * @param {string} query - Search term
   * @returns {Array} Array of recipes
   */
  async searchByName(query) {
    try {
      const url = `${this.baseUrl}/search.php?s=${encodeURIComponent(query)}`;
      const data = await this.fetch(url);
      
      if (!data.meals) {
        return [];
      }

      return data.meals.map(meal => this.transformMeal(meal));
    } catch (error) {
      console.error('Recipe search error:', error.message);
      return [];
    }
  }

  /**
   * Search recipes by first letter
   * @param {string} letter - First letter
   * @returns {Array} Array of recipes
   */
  async searchByLetter(letter) {
    try {
      const url = `${this.baseUrl}/search.php?f=${letter.charAt(0)}`;
      const data = await this.fetch(url);
      
      if (!data.meals) {
        return [];
      }

      return data.meals.map(meal => this.transformMeal(meal));
    } catch (error) {
      console.error('Recipe search error:', error.message);
      return [];
    }
  }

  /**
   * Get recipe by ID
   * @param {string} id - Recipe ID
   * @returns {Object|null} Recipe details
   */
  async getById(id) {
    try {
      const url = `${this.baseUrl}/lookup.php?i=${id}`;
      const data = await this.fetch(url);
      
      if (!data.meals || data.meals.length === 0) {
        return null;
      }

      return this.transformMeal(data.meals[0]);
    } catch (error) {
      console.error('Recipe fetch error:', error.message);
      return null;
    }
  }

  /**
   * Get random recipe
   * @returns {Object|null} Random recipe
   */
  async getRandom() {
    try {
      const url = `${this.baseUrl}/random.php`;
      const data = await this.fetch(url);
      
      if (!data.meals || data.meals.length === 0) {
        return null;
      }

      return this.transformMeal(data.meals[0]);
    } catch (error) {
      console.error('Random recipe error:', error.message);
      return null;
    }
  }

  /**
   * Get recipes by category
   * @param {string} category - Category name (e.g., 'Chicken', 'Beef', 'Vegetarian')
   * @returns {Array} Array of recipes (basic info only)
   */
  async getByCategory(category) {
    try {
      const url = `${this.baseUrl}/filter.php?c=${encodeURIComponent(category)}`;
      const data = await this.fetch(url);
      
      if (!data.meals) {
        return [];
      }

      return data.meals.map(meal => ({
        id: meal.idMeal,
        name: meal.strMeal,
        image: meal.strMealThumb,
        category: category
      }));
    } catch (error) {
      console.error('Category search error:', error.message);
      return [];
    }
  }

  /**
   * Get all categories
   * @returns {Array} Array of categories with Dutch names
   */
  async getCategories() {
    try {
      const url = `${this.baseUrl}/categories.php`;
      const data = await this.fetch(url);
      
      if (!data.categories) {
        return [];
      }

      return data.categories.map(cat => ({
        id: cat.idCategory,
        name: translator.translateCategory(cat.strCategory),
        originalName: cat.strCategory, // Keep original for API calls
        image: cat.strCategoryThumb,
        description: cat.strCategoryDescription
      }));
    } catch (error) {
      console.error('Categories fetch error:', error.message);
      return [];
    }
  }

  /**
   * Transform TheMealDB meal to our format
   * @param {Object} meal - Raw meal from API
   * @returns {Object} Transformed recipe with Dutch translations
   */
  transformMeal(meal) {
    // Extract ingredients and measures
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        const displayTextEn = measure && measure.trim() 
          ? `${measure.trim()} ${ingredient.trim()}`
          : ingredient.trim();
        
        // Translate to Dutch
        const displayTextNl = translator.translateDisplayText(displayTextEn);
        const ingredientNl = translator.translateIngredient(ingredient.trim());
        
        ingredients.push({
          name: ingredientNl,
          nameOriginal: ingredient.trim(),
          measure: measure ? measure.trim() : '',
          // Dutch display text for shopping list
          displayText: displayTextNl,
          displayTextOriginal: displayTextEn
        });
      }
    }

    // Translate recipe name
    const translatedName = translator.translateRecipeName(meal.strMeal);

    return {
      id: meal.idMeal,
      name: translatedName,
      nameOriginal: meal.strMeal,
      category: meal.strCategory,
      area: meal.strArea, // Cuisine (e.g., 'Dutch', 'Italian')
      instructions: meal.strInstructions,
      image: meal.strMealThumb,
      video: meal.strYoutube,
      source: meal.strSource,
      tags: meal.strTags ? meal.strTags.split(',').map(t => t.trim()) : [],
      ingredients: ingredients
    };
  }
}

module.exports = RecipeService;
