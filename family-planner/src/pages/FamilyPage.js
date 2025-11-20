import React, { useState } from 'react';
import { useLoxone } from '../context/LoxoneContext';
import FamilyCard from '../components/FamilyCard';
import FamilyModal from '../components/FamilyModal';
import './FamilyPage.css';

const FamilyPage = () => {
  const { users } = useLoxone();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  return (
    <div className="family-page">
      <div className="page-header">
        <div className="page-title-wrapper">
          <p className="page-subtitle">FAMILY & ACCESS MANAGEMENT</p>
          <h2 className="page-title">FAMILY</h2>
        </div>
        <button className="add-btn" onClick={handleAddUser}>
          ➕
        </button>
      </div>

      <section className="section">
        <h3 className="section-title">Family Members ({users.length}) ›</h3>
        <div className="card-grid">
          {users.map(user => (
            <FamilyCard 
              key={user.uuid} 
              user={user} 
              onClick={() => handleUserClick(user)}
            />
          ))}
        </div>
      </section>

      {isModalOpen && (
        <FamilyModal
          user={selectedUser}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default FamilyPage;
