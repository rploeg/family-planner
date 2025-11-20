import React from 'react';
import './FamilyCard.css';

const FamilyCard = ({ user, onClick }) => {
  return (
    <div className="family-card" onClick={() => onClick(user)}>
      <div className="family-card-header">
        <div className="user-avatar">
          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="user-info">
          <h4 className="user-name">
            {user.name}
            {user.admin && <span className="admin-badge">Admin</span>}
          </h4>
          <p className="user-email">{user.email}</p>
        </div>
      </div>

      <div className="family-card-details">
        <div className="detail-item">
          <span className="detail-label">NFC Tag</span>
          <span className="detail-value nfc-tag">{user.nfcTag}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Status</span>
          <span className={`status-badge ${user.status}`}>
            {user.status === 'home' ? '🏠 Home' : '🚪 Away'}
          </span>
        </div>

        {user.lastSeen && (
          <div className="detail-item">
            <span className="detail-label">Last Seen</span>
            <span className="detail-value">{user.lastSeen}</span>
          </div>
        )}

        {user.location && (
          <div className="detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">📍 {user.location}</span>
          </div>
        )}
      </div>

      <div className="family-card-footer">
        <div className="permissions">
          <span className="permission-item">🔑 Access: {user.permissions?.access || 'Full'}</span>
          <span className="permission-item">⏰ Schedule: {user.permissions?.schedule || 'Always'}</span>
        </div>
      </div>
    </div>
  );
};

export default FamilyCard;
