import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const MealsContext = createContext();

export const useMeals = () => {
  const context = useContext(MealsContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealsProvider');
  }
  return context;
};

export const MealsProvider = ({ children }) => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load meals from backend (initially load current month)
  const loadMeals = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMeals(params);
      setMeals(data);
    } catch (err) {
      console.error('Failed to load meals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    loadMeals({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  }, [loadMeals]);

  // Add a meal for a specific date
  const addMeal = async (date, mealData) => {
    try {
      const newMeal = {
        id: Date.now().toString(),
        date, // YYYY-MM-DD format
        ...mealData,
        addedBy: mealData.addedBy || 'Unknown'
      };
      
      await api.addMeal(newMeal);
      setMeals(prev => [...prev, newMeal]);
      return newMeal;
    } catch (err) {
      console.error('Failed to add meal:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update a meal
  const updateMeal = async (mealId, updates) => {
    try {
      await api.updateMeal(mealId, updates);
      setMeals(prev => prev.map(meal => 
        meal.id === mealId ? { ...meal, ...updates } : meal
      ));
    } catch (err) {
      console.error('Failed to update meal:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete a meal
  const deleteMeal = async (mealId) => {
    try {
      await api.deleteMeal(mealId);
      setMeals(prev => prev.filter(meal => meal.id !== mealId));
    } catch (err) {
      console.error('Failed to delete meal:', err);
      setError(err.message);
      throw err;
    }
  };

  // Get meals for a specific date
  const getMealsForDate = (date) => {
    return meals.filter(meal => meal.date === date);
  };

  // Get meals for a week (starting from a specific date)
  const getMealsForWeek = (startDate) => {
    const start = new Date(startDate);
    const weekMeals = {};
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      weekMeals[dateStr] = getMealsForDate(dateStr);
    }
    
    return weekMeals;
  };

  // Get all meals for current month
  const getMealsForMonth = (year, month) => {
    return meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate.getFullYear() === year && mealDate.getMonth() === month;
    });
  };

  const value = {
    meals,
    loading,
    error,
    loadMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    getMealsForDate,
    getMealsForWeek,
    getMealsForMonth
  };

  return (
    <MealsContext.Provider value={value}>
      {children}
    </MealsContext.Provider>
  );
};
