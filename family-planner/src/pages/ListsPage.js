import React, { useState } from 'react';
import { useLists } from '../context/ListsContext';
import { useTranslation } from 'react-i18next';
import './ListsPage.css';

const ListsPage = () => {
  const { lists, createList, deleteList, addItem, toggleItem, deleteItem, clearCompleted } = useLists();
  const { t } = useTranslation();
  const [selectedList, setSelectedList] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📝');

  const icons = ['🛒', '📝', '✓', '🏠', '🎯', '💡', '🎨', '🔧', '📚', '🎮', '⚽', '🍕'];

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
      addItem(listId, newItemText);
      setNewItemText('');
    }
  };

  const currentList = lists.find(l => l.id === selectedList) || lists[0];

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
                <button 
                  className="add-item-btn"
                  onClick={() => handleAddItem(currentList.id)}
                >
                  {t('common.add')}
                </button>
              </div>

              <div className="list-items">
                {currentList.items.length === 0 ? (
                  <p className="empty-message">{t('lists.noItems')}</p>
                ) : (
                  currentList.items.map(item => (
                    <div key={item.id} className={`list-item ${item.completed ? 'completed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleItem(currentList.id, item.id)}
                        className="item-checkbox"
                      />
                      <div className="item-content">
                        <span className="item-text">{item.text}</span>
                        <span className="item-meta">
                          {item.addedBy && `${item.addedBy} • `}
                          {new Date(item.addedAt).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
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
