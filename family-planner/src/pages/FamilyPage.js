import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './FamilyPage.css';

const FamilyPage = () => {
  const phoneToTelHref = (phone) => {
    if (!phone) return null;
    const normalized = String(phone).replace(/[^\d+]/g, '');
    return normalized ? `tel:${normalized}` : null;
  };

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
  const [isCommandCenterMode, setIsCommandCenterMode] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

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
    const [m, s, r, h, c, w, tx, mt, card] = await Promise.all([
      api.getFamilyMembers(),
      api.getCommandCenterSummary(),
      api.getRoutineProgress(),
      api.getHomework(),
      api.getChores(),
      api.getTokenWallets(),
      api.getTokenTransactions(),
      api.getFamilyMeetings(),
      api.getEmergencyCard('') // Load public emergency card info (no PIN needed for reading)
    ]);

    setMembers(m);
    setSummary(s);
    setRoutines(r.routines || []);
    setHomework(h);
    setChores(c);
    setWallets(w);
    setTransactions(tx);
    setMeetings(mt);
    setEmergencyCard(card);

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
          <p className="page-subtitle">FAMILIE ORGANISATIE HUB</p>
          <h2 className="page-title">FAMILIE</h2>
        </div>
        <button className="add-btn" onClick={() => setIsCommandCenterMode((v) => !v)}>
          {isCommandCenterMode ? '⛶' : '🖥️'}
        </button>
      </div>

      <div className="family-tabs">
        {[
          ['command', 'Gezinsdashboard'],
          ['routines', 'Routines'],
          ['homework', 'Huiswerk'],
          ['chores', 'Taken'],
          ['tokens', 'Schermtijd'],
          ['emergency', 'Noodkaart'],
          ['meetings', 'Overleggen']
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
          <h3 className="section-title">Overzicht van vandaag</h3>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Routine voortgang</div>
              <div className="kpi-value">
                {(summary.routineProgress || []).reduce((acc, r) => acc + (r.completedSteps || 0), 0)} /
                {(summary.routineProgress || []).reduce((acc, r) => acc + (r.totalSteps || 0), 0)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Huiswerk meldingen</div>
              <div className="kpi-value">{summary.homeworkAlerts?.length || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Open taken</div>
              <div className="kpi-value">{summary.choresOpen?.length || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Tokens per kind</div>
              <div className="kpi-value">{summary.wallets?.length || 0}</div>
            </div>
          </div>

          <div className="split-grid">
            <div className="panel">
              <h4>Binnenkort huiswerk</h4>
              {(summary.homeworkAlerts || []).slice(0, 6).map((h) => (
                <div key={h.id} className="row-item">
                  <span>{h.title}</span>
                  <span>{h.dueDate}</span>
                </div>
              ))}
            </div>
            <div className="panel">
              <h4>Open taken</h4>
              {(summary.choresOpen || []).slice(0, 6).map((c) => (
                <div key={c.id} className="row-item">
                  <span>{c.title}</span>
                  <span>{c.points} pnt</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'routines' && (
        <section className="section">
          <h3 className="section-title">Terugkerende routines</h3>
          <div className="form-inline">
            <input value={newRoutineTitle} onChange={(e) => setNewRoutineTitle(e.target.value)} placeholder="Naam routine" />
            <select value={newRoutineChildId} onChange={(e) => setNewRoutineChildId(e.target.value)}>
              <option value="">Alle kinderen</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={saveRoutine}>Routine toevoegen</button>
          </div>
          <textarea value={newRoutineSteps} onChange={(e) => setNewRoutineSteps(e.target.value)} rows={3} placeholder="Een stap per regel" />

          <div className="panel-list">
            {routines.map((r) => (
              <div className="panel" key={r.id}>
                <h4>{r.title} {r.childId ? `• ${memberById[r.childId]?.name || 'Kind'}` : ''}</h4>
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
          <h3 className="section-title">Huiswerkplanner</h3>
          <div className="form-inline">
            <input value={newHomeworkTitle} onChange={(e) => setNewHomeworkTitle(e.target.value)} placeholder="Huiswerktaak" />
            <input value={newHomeworkSubject} onChange={(e) => setNewHomeworkSubject(e.target.value)} placeholder="Vak" />
            <select value={newHomeworkChildId} onChange={(e) => setNewHomeworkChildId(e.target.value)}>
              <option value="">Kies kind</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={newHomeworkDueDate} onChange={(e) => setNewHomeworkDueDate(e.target.value)} />
            <button onClick={addHomework}>Toevoegen</button>
          </div>

          <div className="panel-list">
            {homework.map((h) => (
              <div key={h.id} className={`row-item card ${h.status === 'done' ? 'done' : ''}`}>
                <div>
                  <strong>{h.title}</strong>
                  <div className="muted">{h.subject || 'Algemeen'} • {memberById[h.childId]?.name || 'Familie'} • deadline {h.dueDate}</div>
                </div>
                <button disabled={h.status === 'done'} onClick={() => markHomeworkDone(h)}>
                  {h.status === 'done' ? 'Klaar' : 'Markeer klaar'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'chores' && (
        <section className="section">
          <h3 className="section-title">Taken + punten</h3>
          <div className="form-inline">
            <input value={newChoreTitle} onChange={(e) => setNewChoreTitle(e.target.value)} placeholder="Taak" />
            <select value={newChoreChildId} onChange={(e) => setNewChoreChildId(e.target.value)}>
              <option value="">Kies kind</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" min="1" value={newChorePoints} onChange={(e) => setNewChorePoints(e.target.value)} />
            <input type="date" value={newChoreDueDate} onChange={(e) => setNewChoreDueDate(e.target.value)} />
            <button onClick={addChore}>Toevoegen</button>
          </div>

          <div className="panel-list">
            {chores.map((c) => (
              <div key={c.id} className={`row-item card ${c.status === 'done' ? 'done' : ''}`}>
                <div>
                  <strong>{c.title}</strong>
                  <div className="muted">{memberById[c.childId]?.name || 'Familie'} • {c.points} pnt • {c.dueDate || 'geen deadline'}</div>
                </div>
                <button disabled={c.status === 'done'} onClick={() => completeChore(c)}>
                  {c.status === 'done' ? 'Voltooid' : 'Voltooien'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'tokens' && (
        <section className="section">
          <h3 className="section-title">Schermtijd tokens</h3>
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
              <option value="">Kies kind</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" value={tokenDelta} onChange={(e) => setTokenDelta(e.target.value)} />
            <input value={tokenReason} onChange={(e) => setTokenReason(e.target.value)} placeholder="Reden" />
            <button onClick={adjustTokens}>Aanpassen</button>
          </div>

          <div className="panel">
            <h4>Recente transacties</h4>
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
          <h3 className="section-title">Noodmodus</h3>
          <p className="section-description">Druk op de knop hieronder in een noodsituatie. Alle contact-informatie kan ingesteld worden in Instellingen.</p>

          <div className="form-inline">
            <button className="emergency-mode-toggle" onClick={() => setIsEmergencyMode(true)}>
              🚨 Start NOODMODUS
            </button>
          </div>
        </section>
      )}

      {isEmergencyMode && (
        <div className="emergency-overlay" onClick={() => setIsEmergencyMode(false)}>
          <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emergency-modal-header">
              <h3>🚨 NOODMODUS</h3>
              <button className="close-emergency" onClick={() => setIsEmergencyMode(false)}>✕</button>
            </div>

            <div className="emergency-big-actions">
              <a className="call-btn call-emergency big" href="tel:112">Bel 112</a>
              {phoneToTelHref(emergencyCard?.parentPhone) && (
                <a className="call-btn big" href={phoneToTelHref(emergencyCard?.parentPhone)}>
                  Bel {emergencyCard?.parentName || 'mama'}
                </a>
              )}
              {phoneToTelHref(emergencyCard?.backupContactPhone) && (
                <a className="call-btn big" href={phoneToTelHref(emergencyCard?.backupContactPhone)}>
                  Bel {emergencyCard?.backupContactName || 'Karin'}
                </a>
              )}
            </div>

            <div className="emergency-instructions">
              <h4>Wat te doen bij brand</h4>
              <p>{emergencyCard?.fireInstructions || '1. Blijf rustig. 2. Verlaat direct het huis. 3. Ga naar het verzamelpunt buiten. 4. Bel 112. 5. Bel mama of Karin.'}</p>
              {emergencyCard?.homeAddress && (
                <p className="emergency-address"><strong>Adres:</strong> {emergencyCard.homeAddress}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'meetings' && (
        <section className="section">
          <h3 className="section-title">Gezinsoverleggen & besluiten</h3>
          <div className="form-inline">
            <input value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Titel overleg" />
            <input type="date" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} />
            <button onClick={addMeeting}>Overleg maken</button>
          </div>
          <textarea
            rows={2}
            value={newMeetingNotes}
            onChange={(e) => setNewMeetingNotes(e.target.value)}
            placeholder="Notities overleg"
          />

          <div className="form-inline">
            <select value={activeMeetingForAction} onChange={(e) => setActiveMeetingForAction(e.target.value)}>
              <option value="">Kies overleg</option>
              {meetings.map((m) => <option key={m.id} value={m.id}>{m.title} ({m.meetingDate})</option>)}
            </select>
            <input value={newActionText} onChange={(e) => setNewActionText(e.target.value)} placeholder="Actie" />
            <select value={newActionOwner} onChange={(e) => setNewActionOwner(e.target.value)}>
              <option value="">Eigenaar</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)} />
            <button onClick={addMeetingAction}>Actie toevoegen</button>
          </div>

          <div className="panel-list">
            {meetings.map((m) => (
              <div className="panel" key={m.id}>
                <h4>{m.title} • {m.meetingDate}</h4>
                {m.notes && <p className="muted">{m.notes}</p>}
                {(m.actions || []).map((a) => (
                  <div className="row-item" key={a.id}>
                    <span>{a.text} • {memberById[a.owner]?.name || 'onbekend'} • {a.dueDate || 'geen deadline'}</span>
                    <button onClick={() => toggleMeetingAction(a)}>{a.status === 'done' ? 'Heropen' : 'Klaar'}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h3 className="section-title">Gezinsleden ({members.length})</h3>
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
