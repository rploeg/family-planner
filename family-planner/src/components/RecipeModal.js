import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import './RecipeModal.css';

const RecipeModal = ({ isOpen, onClose, onAddIngredients }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [view, setView] = useState('search'); // 'search', 'categories', 'recipe'
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('dinner');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const cats = await api.getRecipeCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSelectedCategory(null); // Clear category when searching
    try {
      const results = await api.searchRecipes(searchQuery);
      console.log('Search results:', results); // Debug log
      setRecipes(results || []);
      setView('search');
    } catch (error) {
      console.error('Search failed:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      // Use originalName for API call (English), but display Dutch name
      const results = await api.getRecipesByCategory(category.originalName || category.name);
      setRecipes(results);
      setView('search');
    } catch (error) {
      console.error('Category fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeSelect = async (recipe) => {
    setLoading(true);
    try {
      // If recipe doesn't have ingredients, fetch full details
      if (!recipe.ingredients) {
        const fullRecipe = await api.getRecipe(recipe.id);
        setSelectedRecipe(fullRecipe);
        setSelectedIngredients(fullRecipe.ingredients.map(ing => ing.displayText));
      } else {
        setSelectedRecipe(recipe);
        setSelectedIngredients(recipe.ingredients.map(ing => ing.displayText));
      }
      setView('recipe');
    } catch (error) {
      console.error('Recipe fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredient = (ingredient) => {
    setSelectedIngredients(prev => 
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleAddToList = () => {
    if (selectedIngredients.length > 0) {
      // Pass meal info if date is selected
      const mealInfo = mealDate ? {
        date: mealDate,
        type: mealType,
        title: selectedRecipe?.name
      } : null;
      onAddIngredients(selectedIngredients, selectedRecipe?.name, mealInfo);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setRecipes([]);
    setSelectedRecipe(null);
    setSelectedCategory(null);
    setSelectedIngredients([]);
    setMealDate('');
    setMealType('dinner');
    setView('search');
    onClose();
  };

  const handleBack = () => {
    if (view === 'recipe') {
      setSelectedRecipe(null);
      setSelectedIngredients([]);
      setView('search');
    } else if (selectedCategory || recipes.length > 0) {
      setSelectedCategory(null);
      setRecipes([]);
      setSearchQuery('');
    }
  };

  // Bepaal of terug knop getoond moet worden
  const showBackButton = view === 'recipe' || selectedCategory || recipes.length > 0;

  const handleRandomRecipe = async () => {
    setLoading(true);
    try {
      const recipe = await api.getRandomRecipe();
      if (recipe) {
        setSelectedRecipe(recipe);
        setSelectedIngredients(recipe.ingredients.map(ing => ing.displayText));
        setView('recipe');
      }
    } catch (error) {
      console.error('Random recipe failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="recipe-modal-overlay" onClick={handleClose}>
      <div className="recipe-modal" onClick={e => e.stopPropagation()}>
        <div className="recipe-modal-header">
          {showBackButton && (
            <button className="back-btn" onClick={handleBack}>
              ← Terug
            </button>
          )}
          <h2>🍳 {view === 'recipe' ? selectedRecipe?.name : selectedCategory ? selectedCategory.name : 'Recepten'}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="recipe-modal-content">
          {view !== 'recipe' && (
            <>
              {/* Search Bar */}
              <div className="recipe-search-bar">
                <input
                  type="text"
                  placeholder="Zoek een recept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={loading}>
                  🔍
                </button>
                <button onClick={handleRandomRecipe} disabled={loading} className="random-btn">
                  🎲
                </button>
              </div>

              {/* Categories - show when no results and not loading */}
              {recipes.length === 0 && !loading && (
                <div className="recipe-categories">
                  <h3>Categorieën</h3>
                  <div className="category-grid">
                    {categories.slice(0, 12).map(cat => (
                      <button 
                        key={cat.id} 
                        className="category-card"
                        onClick={() => handleCategorySelect(cat)}
                      >
                        <img src={cat.image} alt={cat.name} />
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipe Results */}
              {loading ? (
                <div className="recipe-loading">
                  <span className="spinner">🔄</span>
                  <p>Recepten laden...</p>
                </div>
              ) : recipes.length > 0 ? (
                <div className="recipe-results">
                  <h3>{selectedCategory ? selectedCategory.name : 'Zoekresultaten'} ({recipes.length})</h3>
                  <div className="recipe-grid">
                    {recipes.map(recipe => (
                      <button 
                        key={recipe.id} 
                        className="recipe-card"
                        onClick={() => handleRecipeSelect(recipe)}
                      >
                        <img src={recipe.image} alt={recipe.name} />
                        <div className="recipe-card-info">
                          <span className="recipe-name">{recipe.name}</span>
                          {recipe.area && <span className="recipe-area">{recipe.area}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchQuery && !loading ? (
                <div className="no-results">
                  <p>Geen recepten gevonden voor "{searchQuery}"</p>
                </div>
              ) : null}
            </>
          )}

          {/* Recipe Detail View */}
          {view === 'recipe' && selectedRecipe && (
            <div className="recipe-detail">
              <div className="recipe-image">
                <img src={selectedRecipe.image} alt={selectedRecipe.name} />
                {selectedRecipe.area && (
                  <span className="recipe-badge">{selectedRecipe.area}</span>
                )}
              </div>

              <div className="recipe-ingredients">
                <h3>Ingrediënten ({selectedIngredients.length} geselecteerd)</h3>
                <div className="ingredient-list">
                  {selectedRecipe.ingredients.map((ing, index) => (
                    <label key={index} className="ingredient-item">
                      <input
                        type="checkbox"
                        checked={selectedIngredients.includes(ing.displayText)}
                        onChange={() => toggleIngredient(ing.displayText)}
                      />
                      <span>{ing.displayText}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedRecipe.instructions && (
                <details className="recipe-instructions">
                  <summary>Bereidingswijze</summary>
                  <p>{selectedRecipe.instructions}</p>
                </details>
              )}
            </div>
          )}
        </div>

        {view === 'recipe' && (
          <div className="recipe-modal-footer">
            <div className="meal-planning-row">
              <label className="meal-date-label">
                📅 Wanneer eten we dit?
              </label>
              <input
                type="date"
                className="meal-date-input"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
              />
              <select
                className="meal-type-select"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                <option value="breakfast">🍳 Ontbijt</option>
                <option value="lunch">🥪 Lunch</option>
                <option value="dinner">🍽️ Diner</option>
                <option value="snack">🍪 Snack</option>
              </select>
            </div>
            <button 
              className="add-ingredients-btn"
              onClick={handleAddToList}
              disabled={selectedIngredients.length === 0}
            >
              ➕ {selectedIngredients.length} ingrediënt{selectedIngredients.length !== 1 ? 'en' : ''} toevoegen
              {mealDate && ` + maaltijd plannen`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeModal;
