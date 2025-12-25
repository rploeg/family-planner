import React from 'react';
import SmartAlert from './SmartAlert';
import './NotificationsModal.css';

const NotificationsModal = ({ isOpen, onClose, alerts, dismissedAlertIds, onRestoreAlert }) => {
  if (!isOpen) return null;

  const activeAlerts = alerts.filter(alert => {
    const alertId = alert.eventDate 
      ? `${alert.type}-${alert.title}-${alert.eventDate}`
      : `${alert.type}-${alert.title}`;
    return !dismissedAlertIds.includes(alertId);
  });

  const dismissedAlerts = alerts.filter(alert => {
    const alertId = alert.eventDate 
      ? `${alert.type}-${alert.title}-${alert.eventDate}`
      : `${alert.type}-${alert.title}`;
    return dismissedAlertIds.includes(alertId);
  });

  return (
    <div className="notifications-modal-overlay" onClick={onClose}>
      <div className="notifications-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <h2>🔔 Meldingen</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="notifications-content">
          {activeAlerts.length > 0 && (
            <div className="notifications-section">
              <h3 className="section-title">Actief ({activeAlerts.length})</h3>
              {activeAlerts.map((alert, index) => (
                <SmartAlert
                  key={`active-${index}`}
                  suggestion={alert}
                  onDismiss={() => onClose()}
                />
              ))}
            </div>
          )}

          {dismissedAlerts.length > 0 && (
            <div className="notifications-section">
              <h3 className="section-title">Gesloten ({dismissedAlerts.length})</h3>
              {dismissedAlerts.map((alert, index) => {
                return (
                  <div key={`dismissed-${index}`} className="dismissed-alert">
                    <div className="dismissed-alert-info">
                      <span className="dismissed-icon">{alert.icon}</span>
                      <div className="dismissed-content">
                        <span className="dismissed-title">{alert.title}</span>
                        <span className="dismissed-message">{alert.message}</span>
                      </div>
                    </div>
                    <button
                      className="restore-btn"
                      onClick={() => {
                        console.log('Restore button clicked for alert:', alert);
                        onRestoreAlert(alert);
                      }}
                      title="Melding herstellen"
                    >
                      ↻ Herstel
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeAlerts.length === 0 && dismissedAlerts.length === 0 && (
            <div className="no-notifications">
              <p>Geen meldingen op dit moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
