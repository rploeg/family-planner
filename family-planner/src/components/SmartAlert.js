import React, { useState } from 'react';
import { useLists } from '../context/ListsContext';
import './SmartAlert.css';

const SmartAlert = ({ suggestion, onDismiss }) => {
  const { lists, addItem } = useLists();
  const [isExpanded, setIsExpanded] = useState(false);
  const [addedMeals, setAddedMeals] = useState([]);

  const handleAddSuggestion = async (suggestionItem, mealName = null) => {
    // Find the first shopping list or create one
    let targetList = lists.find(list => list.name.toLowerCase().includes('boodschappen') || list.name.toLowerCase().includes('shopping'));
    
    if (!targetList && lists.length > 0) {
      targetList = lists[0];
    }
    
    if (targetList) {
      await addItem(targetList.id, suggestionItem.text, 'System', suggestionItem.category || 'kids', mealName);
    }
  };

  const handleAddMeal = async (meal) => {
    if (meal.ingredients && meal.ingredients.length > 0) {
      // Add all ingredients for this meal, passing the meal name
      for (const ingredient of meal.ingredients) {
        await handleAddSuggestion(ingredient, meal.name);
      }
      setAddedMeals(prev => [...prev, meal.name]);
      
      // Remove from added list after 2 seconds
      setTimeout(() => {
        setAddedMeals(prev => prev.filter(m => m !== meal.name));
      }, 2000);
    }
  };

  const handleAddAllSuggestions = async () => {
    if (suggestion.suggestions && suggestion.suggestions.length > 0) {
      for (const item of suggestion.suggestions) {
        if (item.ingredients) {
          // It's a meal with ingredients
          for (const ingredient of item.ingredients) {
            await handleAddSuggestion(ingredient);
          }
        } else {
          // It's a simple item
          await handleAddSuggestion(item);
        }
      }
      setIsExpanded(false);
    }
  };

  const getPriorityClass = () => {
    switch (suggestion.priority) {
      case 'high': return 'alert-high';
      case 'medium': return 'alert-medium';
      case 'low': return 'alert-low';
      default: return '';
    }
  };

  const isMealSuggestion = suggestion.suggestions && suggestion.suggestions.length > 0 && suggestion.suggestions[0].ingredients;

  return (
    <div className={`smart-alert ${getPriorityClass()}`}>
      <div className="alert-header">
        <div className="alert-icon">{suggestion.icon}</div>
        <div className="alert-content">
          <h3 className="alert-title">{suggestion.title}</h3>
          <p className="alert-message">{suggestion.message}</p>
        </div>
        <button className="alert-dismiss" onClick={onDismiss}>✕</button>
      </div>

      {suggestion.suggestions && suggestion.suggestions.length > 0 && (
        <div className="alert-suggestions">
          <button 
            className="toggle-suggestions-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'} {isMealSuggestion ? 'Gerechten' : 'Suggesties'} ({suggestion.suggestions.length})
          </button>
          
          {isExpanded && (
            <div className="suggestions-list">
              {isMealSuggestion ? (
                <>
                  <div className="suggestions-header">
                    <span>Klik op een gerecht om ingrediënten toe te voegen:</span>
                  </div>
                  {suggestion.suggestions.map((meal, index) => (
                    <div 
                      key={index} 
                      className={`suggestion-meal ${addedMeals.includes(meal.name) ? 'added' : ''}`}
                      onClick={() => handleAddMeal(meal)}
                    >
                      <div className="meal-header">
                        <span className="meal-name">🍽️ {meal.name}</span>
                        {addedMeals.includes(meal.name) && <span className="added-check">✓ Toegevoegd</span>}
                      </div>
                      <div className="meal-ingredients">
                        {meal.ingredients.map((ing, idx) => (
                          <span key={idx} className="ingredient-tag">
                            {ing.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="suggestions-header">
                    <span>Voeg toe aan boodschappenlijst:</span>
                    <button className="add-all-btn" onClick={handleAddAllSuggestions}>
                      + Alles toevoegen
                    </button>
                  </div>
                  {suggestion.suggestions.map((item, index) => (
                    <div key={index} className="suggestion-item">
                      <span className="suggestion-text">
                        {typeof item === 'string' ? item : item.text}
                      </span>
                      {typeof item === 'object' && (
                        <button 
                          className="smart-alert-add-btn"
                          onClick={() => handleAddSuggestion(item)}
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartAlert;
