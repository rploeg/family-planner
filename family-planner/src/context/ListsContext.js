import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ListsContext = createContext();

export const useLists = () => {
  const context = useContext(ListsContext);
  if (!context) {
    throw new Error('useLists must be used within a ListsProvider');
  }
  return context;
};

export const ListsProvider = ({ children }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load lists from backend
  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLists();
      // Map 'checked' field to 'completed' for compatibility
      const mappedLists = data.map(list => ({
        ...list,
        items: list.items.map(item => ({
          ...item,
          completed: item.checked
        }))
      }));
      setLists(mappedLists);
    } catch (err) {
      console.error('Failed to load lists:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLists();
  }, [loadLists]);

  // Create new list
  const createList = async (name, icon = '📝', type = 'grocery') => {
    try {
      const newList = {
        id: Date.now().toString(),
        name,
        icon,
        type,
        items: []
      };
      await api.addList(newList);
      setLists(prev => [...prev, newList]);
      return newList;
    } catch (err) {
      console.error('Failed to create list:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete list
  const deleteList = async (listId) => {
    try {
      await api.deleteList(listId);
      setLists(prev => prev.filter(list => list.id !== listId));
    } catch (err) {
      console.error('Failed to delete list:', err);
      setError(err.message);
      throw err;
    }
  };

  // Add item to list
  const addItem = async (listId, text, addedBy = 'User', category = 'household', forMeal = null, dueDate = null) => {
    try {
      const newItem = {
        id: `${listId}-${Date.now()}`,
        text,
        checked: false,
        completed: false,  // For frontend compatibility
        addedBy,
        category,
        forMeal,
        dueDate
      };
      await api.addListItem(listId, newItem);
      
      setLists(prev => prev.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            items: [...list.items, newItem]
          };
        }
        return list;
      }));
    } catch (err) {
      console.error('Failed to add item:', err);
      setError(err.message);
      throw err;
    }
  };

  // Toggle item completion
  const toggleItem = async (listId, itemId) => {
    try {
      const list = lists.find(l => l.id === listId);
      const item = list?.items.find(i => i.id === itemId);
      
      if (item) {
        await api.updateListItem(listId, itemId, { 
          text: item.text,
          checked: !item.completed  // Send 'checked' to backend
        });
        
        setLists(prev => prev.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item =>
                item.id === itemId ? { ...item, checked: !item.checked, completed: !item.completed } : item
              )
            };
          }
          return list;
        }));
      }
    } catch (err) {
      console.error('Failed to toggle item:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (listId, itemId) => {
    try {
      await api.deleteListItem(listId, itemId);
      
      setLists(prev => prev.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            items: list.items.filter(item => item.id !== itemId)
          };
        }
        return list;
      }));
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError(err.message);
      throw err;
    }
  };

  // Clear completed items
  const clearCompleted = async (listId) => {
    try {
      const list = lists.find(l => l.id === listId);
      if (!list) return;

      // Delete all completed items
      const completedItems = list.items.filter(item => item.completed);
      for (const item of completedItems) {
        await api.deleteListItem(listId, item.id);
      }
      
      setLists(prev => prev.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            items: list.items.filter(item => !item.completed)
          };
        }
        return list;
      }));
    } catch (err) {
      console.error('Failed to clear completed items:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update item category
  const updateItemCategory = async (listId, itemId, category) => {
    try {
      const list = lists.find(l => l.id === listId);
      const item = list?.items.find(i => i.id === itemId);
      
      if (item) {
        await api.updateListItem(listId, itemId, { 
          text: item.text,
          checked: item.checked,
          category
        });
        
        setLists(prev => prev.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item =>
                item.id === itemId ? { ...item, category } : item
              )
            };
          }
          return list;
        }));
      }
    } catch (err) {
      console.error('Failed to update item category:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update item due date
  const updateItemDueDate = async (listId, itemId, dueDate) => {
    try {
      const list = lists.find(l => l.id === listId);
      const item = list?.items.find(i => i.id === itemId);
      
      if (item) {
        await api.updateListItem(listId, itemId, { 
          text: item.text,
          checked: item.checked,
          dueDate
        });
        
        setLists(prev => prev.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item =>
                item.id === itemId ? { ...item, dueDate } : item
              )
            };
          }
          return list;
        }));
      }
    } catch (err) {
      console.error('Failed to update item due date:', err);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    lists,
    loading,
    error,
    loadLists,
    createList,
    deleteList,
    addItem,
    toggleItem,
    deleteItem,
    clearCompleted,
    updateItemCategory,
    updateItemDueDate
  };

  return (
    <ListsContext.Provider value={value}>
      {children}
    </ListsContext.Provider>
  );
};
