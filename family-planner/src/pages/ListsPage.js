import React, { useState } from 'react';
import { useLists } from '../context/ListsContext';
import { useTranslation } from 'react-i18next';
import './ListsPage.css';

const ListsPage = () => {
  const { lists, createList, deleteList, addItem, toggleItem, deleteItem, clearCompleted, updateItemCategory } = useLists();
  const { t } = useTranslation();
  const [selectedList, setSelectedList] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('household');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📝');

  const icons = ['🛒', '📝', '✓', '🏠', '🎯', '💡', '🎨', '🔧', '📚', '🎮', '⚽', '🍕'];

  const categories = [
    { value: 'household', label: '🏠 Huishouden', icon: '🏠' },
    { value: 'kids', label: '👶 Kinderen', icon: '👶' },
    { value: 'personal', label: '👤 Persoonlijk', icon: '👤' }
  ];

  const handleCreateList = () => {
    if (newListName.trim()) {
      const list = createList(newListName, newListIcon);
      setSelectedList(list.id);
      setNewListName('');
      setNewListIcon('📝');
      setIsCreatingList(false);
    }
  };

  const handleAddItem = (listId) => {
    if (newItemText.trim()) {
      addItem(listId, newItemText, 'User', newItemCategory);
      setNewItemText('');
      setNewItemCategory('household');
    }
  };

  const currentList = lists.find(l => l.id === selectedList) || lists[0];
  
  // Filter items by category
  const filteredItems = currentList?.items.filter(item => {
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
        <button className="add-btn" onClick={() => setIsCreatingList(true)}>
          ➕
        </button>
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
                <button 
                  className="add-item-btn"
                  onClick={() => handleAddItem(currentList.id)}
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
                        checked={item.completed}
                        onChange={() => toggleItem(currentList.id, item.id)}
                        className="item-checkbox"
                      />
                      <div className="item-content">
                        <div className="item-text-row">
                          <span className="item-category-badge">
                            {categories.find(c => c.value === (item.category || 'household'))?.icon}
                          </span>
                          <span className="item-text">{item.text}</span>
                        </div>
                        <span className="item-meta">
                          {item.addedBy && `${item.addedBy} • `}
                          {item.createdAt && new Date(item.createdAt).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
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
              <button className="create-btn" onClick={handleCreateList}>
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListsPage;
