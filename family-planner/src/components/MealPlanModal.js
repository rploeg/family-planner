import React, { useState } from 'react';
import { useMeals } from '../context/MealsContext';
import { useLoxone } from '../context/LoxoneContext';
import { useTranslation } from 'react-i18next';
import './MealPlanModal.css';

const MealPlanModal = ({ date, existingMeal, onClose }) => {
  const { addMeal, updateMeal } = useMeals();
  const { users } = useLoxone();
  const { i18n } = useTranslation();
  const [formData, setFormData] = useState({
    title: existingMeal?.title || '',
    type: existingMeal?.type || 'dinner',
    notes: existingMeal?.notes || '',
    addedBy: existingMeal?.addedBy || (users[0]?.firstName || 'Unknown')
  });

  const mealTypes = [
    { value: 'breakfast', label: { nl: 'Ontbijt', en: 'Breakfast' }, icon: '🍳' },
    { value: 'lunch', label: { nl: 'Lunch', en: 'Lunch' }, icon: '🥪' },
    { value: 'dinner', label: { nl: 'Avondeten', en: 'Dinner' }, icon: '🍽️' },
    { value: 'snack', label: { nl: 'Snack', en: 'Snack' }, icon: '🍪' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (existingMeal) {
      updateMeal(existingMeal.id, formData);
    } else {
      addMeal(date, formData);
    }
    
    onClose();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content meal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingMeal ? (i18n.language === 'nl' ? 'Maaltijd Bewerken' : 'Edit Meal') : (i18n.language === 'nl' ? 'Maaltijd Toevoegen' : 'Add Meal')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{i18n.language === 'nl' ? 'Datum' : 'Date'}</label>
            <div className="date-display">{formatDate(date)}</div>
          </div>

          <div className="form-group">
            <label>{i18n.language === 'nl' ? 'Type Maaltijd' : 'Meal Type'}</label>
            <div className="meal-type-selector">
              {mealTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`meal-type-button ${formData.type === type.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                >
                  <span className="meal-icon">{type.icon}</span>
                  <span>{type.label[i18n.language] || type.label.nl}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{i18n.language === 'nl' ? 'Wat eten we?' : "What's for dinner?"}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={i18n.language === 'nl' ? 'bijv. Spaghetti Bolognese' : 'e.g. Spaghetti Bolognese'}
              required
            />
          </div>

          <div className="form-group">
            <label>{i18n.language === 'nl' ? 'Notities' : 'Notes'} ({i18n.language === 'nl' ? 'optioneel' : 'optional'})</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={i18n.language === 'nl' ? 'Receptnotities, ingrediënten, etc.' : 'Recipe notes, ingredients, etc.'}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>{i18n.language === 'nl' ? 'Toegevoegd door' : 'Added by'}</label>
            <select
              value={formData.addedBy}
              onChange={(e) => setFormData({ ...formData, addedBy: e.target.value })}
            >
              {users.map(user => (
                <option key={user.uuid} value={user.firstName}>{user.firstName}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              {i18n.language === 'nl' ? 'Annuleren' : 'Cancel'}
            </button>
            <button type="submit" className="button-primary">
              {existingMeal ? (i18n.language === 'nl' ? 'Opslaan' : 'Save') : (i18n.language === 'nl' ? 'Toevoegen' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MealPlanModal;
