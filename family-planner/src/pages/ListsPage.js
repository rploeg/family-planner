import React, { useState } from 'react';
import { useLists } from '../context/ListsContext';
import { useMeals } from '../context/MealsContext';
import { useTranslation } from 'react-i18next';
import RecipeModal from '../components/RecipeModal';
import './ListsPage.css';

const ListsPage = () => {
  const { lists, createList, deleteList, addItem, toggleItem, deleteItem, clearCompleted, updateItemCategory, updateItemDueDate } = useLists();
  const { addMeal } = useMeals();
  const { t } = useTranslation();
  const [selectedList, setSelectedList] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('household');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📝');
  const [newListType, setNewListType] = useState('grocery');
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const icons = ['🛒', '📝', '✓', '🏠', '🎯', '💡', '🎨', '🔧', '📚', '🎮', '⚽', '🍕'];

  const listTypes = [
    { value: 'grocery', label: '🛒 Boodschappen' },
    { value: 'tasks', label: '✓ Taken' }
  ];

  const categories = [
    { value: 'household', label: '🏠 Huishouden', icon: '🏠' },
    { value: 'kids', label: '👶 Kinderen', icon: '👶' },
    { value: 'personal', label: '👤 Persoonlijk', icon: '👤' }
  ];

  const handleCreateList = () => {
    if (newListName.trim()) {
      const list = createList(newListName, newListIcon, newListType);
      setSelectedList(list.id);
      setNewListName('');
      setNewListIcon('📝');
      setNewListType('grocery');
      setIsCreatingList(false);
    }
  };

  const handleAddItem = (listId) => {
    if (newItemText.trim()) {
      addItem(listId, newItemText, 'User', newItemCategory, null, newItemDueDate || null);
      setNewItemText('');
      setNewItemCategory('household');
      setNewItemDueDate('');
    }
  };

  const handleAddRecipeIngredients = async (ingredients, recipeName, mealInfo) => {
    // Find a grocery list to add ingredients to (not task list)
    const groceryList = lists.find(l => l.type === 'grocery') || lists.find(l => l.type !== 'tasks');
    
    if (!groceryList) {
      console.error('No grocery list found');
      alert('Geen boodschappenlijst gevonden. Maak eerst een boodschappenlijst aan.');
      return;
    }
    
    if (ingredients.length === 0) {
      return;
    }

    try {
      // Add ingredients to the grocery list (not task list!)
      for (const ingredient of ingredients) {
        // Handle both string ingredients and object ingredients
        const text = typeof ingredient === 'string' ? ingredient : ingredient.displayText;
        await addItem(groceryList.id, text, `Recept: ${recipeName}`, 'household');
      }
      
      // If meal info is provided, add the meal to the meal plan
      if (mealInfo && mealInfo.date) {
        try {
          const mealData = {
            title: mealInfo.title || mealInfo.recipeName,
            type: mealInfo.type || mealInfo.mealType || 'dinner',
            notes: 'Toegevoegd via recept'
          };
          await addMeal(mealInfo.date, mealData);
          console.log('Meal added successfully:', mealData);
        } catch (mealError) {
          console.error('Failed to add meal (ingredients were added):', mealError);
          // Don't show error - ingredients were added successfully
        }
      }
      
      setShowRecipeModal(false);
    } catch (error) {
      console.error('Failed to add ingredients:', error);
      alert('Er ging iets mis bij het toevoegen van ingrediënten');
    }
  };

  const currentList = lists.find(l => l.id === selectedList) || lists[0];
  
  // Filter items by category and exclude completed items
  const filteredItems = currentList?.items.filter(item => {
    // Hide completed items
    if (item.completed) return false;
    if (filterCategory === 'all') return true;
    return item.category === filterCategory || (!item.category && filterCategory === 'household');
  }) || [];

  // Count items by category
  const getCategoryCounts = (list) => {
    if (!list) return { household: 0, kids: 0, personal: 0, all: 0 };
    const counts = {
      household: 0,
      kids: 0,
      personal: 0,
      all: list.items.filter(i => !i.completed).length
    };
    list.items.forEach(item => {
      if (!item.completed) {
        const cat = item.category || 'household';
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts(currentList);

  return (
    <div className="lists-page">
      <div className="page-header">
        <div className="page-title-wrapper">
          <p className="page-subtitle">{t('lists.subtitle')}</p>
          <h2 className="page-title">{t('lists.title')}</h2>
        </div>
        <div className="header-buttons">
          <button className="recipe-btn" onClick={() => setShowRecipeModal(true)} title="Zoek recept">
            🍳
          </button>
          <button className="add-btn" onClick={() => setIsCreatingList(true)}>
            ➕
          </button>
        </div>
      </div>

      <div className="lists-container">
        {/* Sidebar with all lists */}
        <div className="lists-sidebar">
          {lists.map(list => (
            <div
              key={list.id}
              className={`list-tab ${selectedList === list.id || (!selectedList && list === lists[0]) ? 'active' : ''}`}
              onClick={() => setSelectedList(list.id)}
            >
              <span className="list-icon">{list.icon}</span>
              <div className="list-info">
                <span className="list-name">{list.name}</span>
                <span className="list-count">
                  {list.items.filter(i => !i.completed).length} / {list.items.length}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main list view */}
        <div className="list-content">
          {currentList && (
            <>
              <div className="list-header">
                <div className="list-title-section">
                  <span className="list-icon-large">{currentList.icon}</span>
                  <h3>{currentList.name}</h3>
                </div>
                <div className="list-actions">
                  <button 
                    className="clear-btn"
                    onClick={() => clearCompleted(currentList.id)}
                    disabled={!currentList.items.some(i => i.completed)}
                  >
                    {t('common.delete')} Afgevinkt
                  </button>
                  <button 
                    className="delete-list-btn"
                    onClick={() => {
                      if (window.confirm(`${currentList.name} verwijderen?`)) {
                        deleteList(currentList.id);
                        setSelectedList(null);
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="add-item-section">
                <input
                  type="text"
                  className="add-item-input"
                  placeholder={t('lists.addItem')}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem(currentList.id)}
                />
                <select 
                  className="category-select"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label.split(' ')[1]}
                    </option>
                  ))}
                </select>
                {currentList.type === 'tasks' && (
                  <input
                    type="date"
                    className="due-date-input"
                    value={newItemDueDate}
                    onChange={(e) => setNewItemDueDate(e.target.value)}
                    placeholder="Datum"
                  />
                )}
                <button 
                  className="add-item-btn"
                  onClick={() => handleAddItem(currentList.id)}
                  style={{
                    background: 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
                    border: 'none',
                    color: '#000',
                    padding: '0 24px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    height: '50px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {t('common.add')}
                </button>
              </div>

              {/* Category filter chips */}
              <div className="category-filters">
                <button 
                  className={`filter-chip ${filterCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  Alles ({categoryCounts.all})
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.value}
                    className={`filter-chip ${filterCategory === cat.value ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat.value)}
                  >
                    {cat.icon} {cat.label.split(' ')[1]} ({categoryCounts[cat.value] || 0})
                  </button>
                ))}
              </div>

              <div className="list-items">
                {filteredItems.length === 0 ? (
                  <p className="empty-message">
                    {filterCategory === 'all' ? t('lists.noItems') : `Geen ${categories.find(c => c.value === filterCategory)?.label.split(' ')[1].toLowerCase()} items`}
                  </p>
                ) : (
                  filteredItems.map(item => (
                    <div key={item.id} className={`list-item ${item.completed ? 'completed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!item.completed}
                        onChange={() => toggleItem(currentList.id, item.id)}
                        className="item-checkbox"
                      />
                      <div className="item-content">
                        <div className="item-text-row">
                          <span className="item-category-badge">
                            {categories.find(c => c.value === (item.category || 'household'))?.icon}
                          </span>
                          <span className="item-text">{item.text}</span>
                          {item.forMeal && (
                            <span className="item-meal-tag" title={`Voor: ${item.forMeal}`}>
                              🍽️ {item.forMeal}
                            </span>
                          )}
                          {currentList.type === 'tasks' && item.dueDate && (
                            <span className="item-due-date-tag" title={`Deadline: ${item.dueDate}`}>
                              📅 {new Date(item.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <span className="item-meta">
                          {item.addedBy && `${item.addedBy} • `}
                          {item.createdAt && new Date(item.createdAt).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                      {currentList.type === 'tasks' && (
                        <input
                          type="date"
                          className="item-due-date-input"
                          value={item.dueDate || ''}
                          onChange={(e) => updateItemDueDate(currentList.id, item.id, e.target.value || null)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <select
                        className="item-category-selector"
                        value={item.category || 'household'}
                        onChange={(e) => updateItemCategory(currentList.id, item.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon}
                          </option>
                        ))}
                      </select>
                      <button
                        className="delete-item-btn"
                        onClick={() => deleteItem(currentList.id, item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create List Modal */}
      {isCreatingList && (
        <div className="modal-overlay" onClick={() => setIsCreatingList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('lists.createList')}</h2>
              <button className="close-btn" onClick={() => setIsCreatingList(false)}>✕</button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>{t('lists.listName')}</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Nieuwe lijst..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Icoon</label>
                <div className="icon-picker">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      className={`icon-option ${newListIcon === icon ? 'selected' : ''}`}
                      onClick={() => setNewListIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Type</label>
                <div className="type-picker">
                  {listTypes.map(type => (
                    <button
                      key={type.value}
                      className={`type-option ${newListType === type.value ? 'selected' : ''}`}
                      onClick={() => setNewListType(type.value)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="create-btn" onClick={handleCreateList}>
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Search Modal */}
      <RecipeModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        onAddIngredients={handleAddRecipeIngredients}
      />
    </div>
  );
};

export default ListsPage;
