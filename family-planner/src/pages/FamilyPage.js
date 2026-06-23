import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './FamilyPage.css';

const FamilyPage = () => {
  const [tab, setTab] = useState('command');
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [homework, setHomework] = useState([]);
  const [chores, setChores] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [emergencyCard, setEmergencyCard] = useState(null);
  const [emergencyPin, setEmergencyPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [hasEmergencyPin, setHasEmergencyPin] = useState(false);
  const [isCommandCenterMode, setIsCommandCenterMode] = useState(false);

  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineChildId, setNewRoutineChildId] = useState('');
  const [newRoutineSteps, setNewRoutineSteps] = useState('Tas klaarzetten\nAgenda checken\nTanden poetsen');

  const [newHomeworkTitle, setNewHomeworkTitle] = useState('');
  const [newHomeworkChildId, setNewHomeworkChildId] = useState('');
  const [newHomeworkDueDate, setNewHomeworkDueDate] = useState('');
  const [newHomeworkSubject, setNewHomeworkSubject] = useState('');

  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChoreChildId, setNewChoreChildId] = useState('');
  const [newChorePoints, setNewChorePoints] = useState(2);
  const [newChoreDueDate, setNewChoreDueDate] = useState('');

  const [tokenChildId, setTokenChildId] = useState('');
  const [tokenDelta, setTokenDelta] = useState(1);
  const [tokenReason, setTokenReason] = useState('Bonus');

  const [newMeetingTitle, setNewMeetingTitle] = useState('Weekoverleg');
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMeetingNotes, setNewMeetingNotes] = useState('');
  const [newActionText, setNewActionText] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [activeMeetingForAction, setActiveMeetingForAction] = useState('');

  const memberById = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [members]);

  const loadAll = async () => {
    const [m, s, r, h, c, w, tx, mt, ecStatus] = await Promise.all([
      api.getFamilyMembers(),
      api.getCommandCenterSummary(),
      api.getRoutineProgress(),
      api.getHomework(),
      api.getChores(),
      api.getTokenWallets(),
      api.getTokenTransactions(),
      api.getFamilyMeetings(),
      api.getEmergencyCardStatus()
    ]);

    setMembers(m);
    setSummary(s);
    setRoutines(r.routines || []);
    setHomework(h);
    setChores(c);
    setWallets(w);
    setTransactions(tx);
    setMeetings(mt);
    setHasEmergencyPin(ecStatus.hasPin);

    if (!newRoutineChildId && m[0]?.id) setNewRoutineChildId(m[0].id);
    if (!newHomeworkChildId && m[0]?.id) setNewHomeworkChildId(m[0].id);
    if (!newChoreChildId && m[0]?.id) setNewChoreChildId(m[0].id);
    if (!tokenChildId && m[0]?.id) setTokenChildId(m[0].id);
    if (!newActionOwner && m[0]?.id) setNewActionOwner(m[0].id);
  };

  useEffect(() => {
    loadAll().catch((err) => console.error('Failed loading family operations:', err));
    const timer = setInterval(() => {
      loadAll().catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRoutine = async () => {
    const steps = newRoutineSteps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await api.createRoutine({
      title: newRoutineTitle,
      timeOfDay: 'after_school',
      childId: newRoutineChildId || null,
      steps
    });
    setNewRoutineTitle('');
    setNewRoutineSteps('Tas klaarzetten\nAgenda checken\nTanden poetsen');
    await loadAll();
  };

  const toggleRoutineStep = async (routineId, step) => {
    await api.toggleRoutineStep(routineId, step.id, {
      completed: !step.completed,
      childId: routines.find((r) => r.id === routineId)?.childId || null
    });
    await loadAll();
  };

  const addHomework = async () => {
    await api.createHomework({
      title: newHomeworkTitle,
      childId: newHomeworkChildId || null,
      dueDate: newHomeworkDueDate,
      subject: newHomeworkSubject
    });
    setNewHomeworkTitle('');
    setNewHomeworkSubject('');
    await loadAll();
  };

  const markHomeworkDone = async (item) => {
    await api.updateHomework(item.id, { status: 'done' });
    await loadAll();
  };

  const addChore = async () => {
    await api.createChore({
      title: newChoreTitle,
      childId: newChoreChildId || null,
      points: Number(newChorePoints || 0),
      dueDate: newChoreDueDate || null
    });
    setNewChoreTitle('');
    await loadAll();
  };

  const completeChore = async (chore) => {
    await api.completeChore(chore.id, { completed: true, childId: chore.childId });
    await loadAll();
  };

  const adjustTokens = async () => {
    await api.adjustTokens({
      childId: tokenChildId,
      delta: Number(tokenDelta || 0),
      reason: tokenReason
    });
    await loadAll();
  };

  const unlockEmergencyCard = async () => {
    const card = await api.getEmergencyCard(emergencyPin);
    setEmergencyCard(card);
  };

  const setupEmergencyPin = async () => {
    await api.setEmergencyPin({ pin: newPin });
    setNewPin('');
    await loadAll();
  };

  const saveEmergencyCard = async () => {
    await api.updateEmergencyCard({ ...emergencyCard, pin: emergencyPin });
    await loadAll();
  };

  const addMeeting = async () => {
    await api.createFamilyMeeting({
      meetingDate: newMeetingDate,
      title: newMeetingTitle,
      notes: newMeetingNotes
    });
    setNewMeetingNotes('');
    await loadAll();
  };

  const addMeetingAction = async () => {
    if (!activeMeetingForAction) return;
    await api.createFamilyMeetingAction(activeMeetingForAction, {
      text: newActionText,
      owner: newActionOwner || null,
      dueDate: newActionDueDate || null
    });
    setNewActionText('');
    await loadAll();
  };

  const toggleMeetingAction = async (action) => {
    await api.updateFamilyMeetingAction(action.id, {
      status: action.status === 'done' ? 'open' : 'done'
    });
    await loadAll();
  };

  return (
    <div className={`family-page ${isCommandCenterMode ? 'command-center-mode' : ''}`}>
      <div className="page-header">
        <div className="page-title-wrapper">
          <p className="page-subtitle">FAMILY OPERATIONS HUB</p>
          <h2 className="page-title">FAMILY</h2>
        </div>
        <button className="add-btn" onClick={() => setIsCommandCenterMode((v) => !v)}>
          {isCommandCenterMode ? '⛶' : '🖥️'}
        </button>
      </div>

      <div className="family-tabs">
        {[
          ['command', 'Command Center'],
          ['routines', 'Routines'],
          ['homework', 'Homework'],
          ['chores', 'Chores'],
          ['tokens', 'Tokens'],
          ['emergency', 'Emergency'],
          ['meetings', 'Meetings']
        ].map(([value, label]) => (
          <button
            key={value}
            className={`tab-btn ${tab === value ? 'active' : ''}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'command' && summary && (
        <section className="section">
          <h3 className="section-title">Today Overview</h3>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Routine Progress</div>
              <div className="kpi-value">
                {(summary.routineProgress || []).reduce((acc, r) => acc + (r.completedSteps || 0), 0)} /
                {(summary.routineProgress || []).reduce((acc, r) => acc + (r.totalSteps || 0), 0)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Homework Alerts</div>
              <div className="kpi-value">{summary.homeworkAlerts?.length || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Open Chores</div>
              <div className="kpi-value">{summary.choresOpen?.length || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Kids Wallets</div>
              <div className="kpi-value">{summary.wallets?.length || 0}</div>
            </div>
          </div>

          <div className="split-grid">
            <div className="panel">
              <h4>Due Soon Homework</h4>
              {(summary.homeworkAlerts || []).slice(0, 6).map((h) => (
                <div key={h.id} className="row-item">
                  <span>{h.title}</span>
                  <span>{h.dueDate}</span>
                </div>
              ))}
            </div>
            <div className="panel">
              <h4>Open Chores</h4>
              {(summary.choresOpen || []).slice(0, 6).map((c) => (
                <div key={c.id} className="row-item">
                  <span>{c.title}</span>
                  <span>{c.points} pt</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'routines' && (
        <section className="section">
          <h3 className="section-title">Recurring Routines</h3>
          <div className="form-inline">
            <input value={newRoutineTitle} onChange={(e) => setNewRoutineTitle(e.target.value)} placeholder="Routine title" />
            <select value={newRoutineChildId} onChange={(e) => setNewRoutineChildId(e.target.value)}>
              <option value="">All kids</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={saveRoutine}>Add Routine</button>
          </div>
          <textarea value={newRoutineSteps} onChange={(e) => setNewRoutineSteps(e.target.value)} rows={3} placeholder="One step per line" />

          <div className="panel-list">
            {routines.map((r) => (
              <div className="panel" key={r.id}>
                <h4>{r.title} {r.childId ? `• ${memberById[r.childId]?.name || 'Child'}` : ''}</h4>
                {(r.steps || []).map((s) => (
                  <label key={s.id} className="check-row">
                    <input type="checkbox" checked={!!s.completed} onChange={() => toggleRoutineStep(r.id, s)} />
                    <span>{s.text}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'homework' && (
        <section className="section">
          <h3 className="section-title">Homework Planner</h3>
          <div className="form-inline">
            <input value={newHomeworkTitle} onChange={(e) => setNewHomeworkTitle(e.target.value)} placeholder="Homework task" />
            <input value={newHomeworkSubject} onChange={(e) => setNewHomeworkSubject(e.target.value)} placeholder="Subject" />
            <select value={newHomeworkChildId} onChange={(e) => setNewHomeworkChildId(e.target.value)}>
              <option value="">Choose child</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={newHomeworkDueDate} onChange={(e) => setNewHomeworkDueDate(e.target.value)} />
            <button onClick={addHomework}>Add</button>
          </div>

          <div className="panel-list">
            {homework.map((h) => (
              <div key={h.id} className={`row-item card ${h.status === 'done' ? 'done' : ''}`}>
                <div>
                  <strong>{h.title}</strong>
                  <div className="muted">{h.subject || 'General'} • {memberById[h.childId]?.name || 'Family'} • due {h.dueDate}</div>
                </div>
                <button disabled={h.status === 'done'} onClick={() => markHomeworkDone(h)}>
                  {h.status === 'done' ? 'Done' : 'Mark done'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'chores' && (
        <section className="section">
          <h3 className="section-title">Chores + Points</h3>
          <div className="form-inline">
            <input value={newChoreTitle} onChange={(e) => setNewChoreTitle(e.target.value)} placeholder="Chore" />
            <select value={newChoreChildId} onChange={(e) => setNewChoreChildId(e.target.value)}>
              <option value="">Choose child</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" min="1" value={newChorePoints} onChange={(e) => setNewChorePoints(e.target.value)} />
            <input type="date" value={newChoreDueDate} onChange={(e) => setNewChoreDueDate(e.target.value)} />
            <button onClick={addChore}>Add</button>
          </div>

          <div className="panel-list">
            {chores.map((c) => (
              <div key={c.id} className={`row-item card ${c.status === 'done' ? 'done' : ''}`}>
                <div>
                  <strong>{c.title}</strong>
                  <div className="muted">{memberById[c.childId]?.name || 'Family'} • {c.points} pt • {c.dueDate || 'no due date'}</div>
                </div>
                <button disabled={c.status === 'done'} onClick={() => completeChore(c)}>
                  {c.status === 'done' ? 'Completed' : 'Complete'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'tokens' && (
        <section className="section">
          <h3 className="section-title">Screen-Time Tokens</h3>
          <div className="kpi-grid">
            {wallets.map((w) => (
              <div className="kpi-card" key={w.childId}>
                <div className="kpi-label">{memberById[w.childId]?.name || w.childId}</div>
                <div className="kpi-value">{w.balance}</div>
              </div>
            ))}
          </div>

          <div className="form-inline">
            <select value={tokenChildId} onChange={(e) => setTokenChildId(e.target.value)}>
              <option value="">Choose child</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" value={tokenDelta} onChange={(e) => setTokenDelta(e.target.value)} />
            <input value={tokenReason} onChange={(e) => setTokenReason(e.target.value)} placeholder="Reason" />
            <button onClick={adjustTokens}>Adjust</button>
          </div>

          <div className="panel">
            <h4>Recent transactions</h4>
            {transactions.slice(0, 12).map((tx) => (
              <div className="row-item" key={tx.id}>
                <span>{memberById[tx.childId]?.name || tx.childId} • {tx.reason}</span>
                <span className={tx.delta >= 0 ? 'pos' : 'neg'}>{tx.delta}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'emergency' && (
        <section className="section">
          <h3 className="section-title">Parent-only Emergency Card</h3>

          {!hasEmergencyPin && (
            <div className="form-inline">
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Set parent PIN" />
              <button onClick={setupEmergencyPin}>Set PIN</button>
            </div>
          )}

          {hasEmergencyPin && !emergencyCard && (
            <div className="form-inline">
              <input type="password" value={emergencyPin} onChange={(e) => setEmergencyPin(e.target.value)} placeholder="Enter parent PIN" />
              <button onClick={unlockEmergencyCard}>Unlock card</button>
            </div>
          )}

          {emergencyCard && (
            <div className="panel-list">
              <textarea
                rows={2}
                value={emergencyCard.householdDoctor || ''}
                onChange={(e) => setEmergencyCard({ ...emergencyCard, householdDoctor: e.target.value })}
                placeholder="Doctor"
              />
              <textarea
                rows={3}
                value={emergencyCard.allergies || ''}
                onChange={(e) => setEmergencyCard({ ...emergencyCard, allergies: e.target.value })}
                placeholder="Allergies"
              />
              <textarea
                rows={3}
                value={emergencyCard.medications || ''}
                onChange={(e) => setEmergencyCard({ ...emergencyCard, medications: e.target.value })}
                placeholder="Medications"
              />
              <textarea
                rows={3}
                value={emergencyCard.emergencyContacts || ''}
                onChange={(e) => setEmergencyCard({ ...emergencyCard, emergencyContacts: e.target.value })}
                placeholder="Emergency contacts"
              />
              <textarea
                rows={3}
                value={emergencyCard.notes || ''}
                onChange={(e) => setEmergencyCard({ ...emergencyCard, notes: e.target.value })}
                placeholder="Notes"
              />
              <button onClick={saveEmergencyCard}>Save card</button>
            </div>
          )}
        </section>
      )}

      {tab === 'meetings' && (
        <section className="section">
          <h3 className="section-title">Family Meetings & Decisions</h3>
          <div className="form-inline">
            <input value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Meeting title" />
            <input type="date" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} />
            <button onClick={addMeeting}>Create meeting</button>
          </div>
          <textarea
            rows={2}
            value={newMeetingNotes}
            onChange={(e) => setNewMeetingNotes(e.target.value)}
            placeholder="Meeting notes"
          />

          <div className="form-inline">
            <select value={activeMeetingForAction} onChange={(e) => setActiveMeetingForAction(e.target.value)}>
              <option value="">Select meeting</option>
              {meetings.map((m) => <option key={m.id} value={m.id}>{m.title} ({m.meetingDate})</option>)}
            </select>
            <input value={newActionText} onChange={(e) => setNewActionText(e.target.value)} placeholder="Action" />
            <select value={newActionOwner} onChange={(e) => setNewActionOwner(e.target.value)}>
              <option value="">Owner</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)} />
            <button onClick={addMeetingAction}>Add action</button>
          </div>

          <div className="panel-list">
            {meetings.map((m) => (
              <div className="panel" key={m.id}>
                <h4>{m.title} • {m.meetingDate}</h4>
                {m.notes && <p className="muted">{m.notes}</p>}
                {(m.actions || []).map((a) => (
                  <div className="row-item" key={a.id}>
                    <span>{a.text} • {memberById[a.owner]?.name || 'owner?'} • {a.dueDate || 'no due'}</span>
                    <button onClick={() => toggleMeetingAction(a)}>{a.status === 'done' ? 'Reopen' : 'Done'}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h3 className="section-title">Family Members ({members.length})</h3>
        <div className="member-chips">
          {members.map((m) => (
            <span key={m.id} className="member-chip">
              {m.avatar || '👤'} {m.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FamilyPage;
