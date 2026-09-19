import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, ClipboardList, AlertTriangle, CalendarDays, Wrench, Users, Building2, Layers3, ShieldCheck, CreditCard, ReceiptText, Package, RefreshCw, Bell, BarChart3, Download, UserRound, Database, Settings, ChevronDown, ChevronRight, Menu, X, LogOut, PanelLeftClose } from 'lucide-react';
import './styles.css';
import './migration.css';
import './login.css';
import { ArrowRight, LockKeyhole, Mail, LoaderCircle, Info } from 'lucide-react';
import { services, session, assetServices, workflowServices, notificationServices, visitServices, customerServices, settingsServices, paymentServices, financeServices, adminSecurityServices, phase15Services, communicationServices } from './api/runtime.js';
import { routeState } from './api/services.js';
import { SummaryView, ProtectedContent } from './views.jsx';
import { AssetPage, StaffPage } from './assetModules.jsx';
import { WorkflowPage } from './workflowModules.jsx';
import { NotificationsPage } from './notificationModules.jsx';
import { ScheduleCalendarPage } from './scheduleCalendar.jsx';
import { CustomersPage, EmergencyQueuePage } from './customerModules.jsx';
import { SettingsPage } from './settingsModule.jsx';
import { TechnicianAssignmentsPage } from './technicianAssignments.jsx';
import { PaymentsPage } from './paymentModules.jsx';
import { TransactionsPage, ReportsPage } from './financeModules.jsx';
import { RolesPage, AuditLogPage } from './adminSecurityModules.jsx';
import { ChecklistTemplatesPage, TechnicianProfileAdminPage } from './phase15Modules.jsx';
import { CommunicationsPage } from './communicationModules.jsx';
import './valorDesign.css';
const migrated = new Set(['dashboard','buildings','lifts','amc','service-requests','notifications','communications','schedule','customers','emergency','technicians','settings','payments','transactions','reports','exports','roles','audit','checklists','technician-profiles']);
const dashboardNav = { id: 'dashboard', label: 'Dashboard', icon: Home };
const navGroups = [
  { label: 'OPERATIONS', items: [
    { id: 'service-requests', label: 'Service Requests', icon: ClipboardList }, { id: 'checklists', label: 'Checklists', icon: ClipboardList }, { id: 'emergency', label: 'Emergency Queue', icon: AlertTriangle },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays }, { id: 'technicians', label: 'Technician Assignments', icon: Wrench }
  ]},
  { label: 'ASSETS', items: [
    { id: 'customers', label: 'Customers', icon: Users }, { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'lifts', label: 'Lifts', icon: Layers3 }, { id: 'amc', label: 'AMC Contracts', icon: ShieldCheck }
  ]},
  { label: 'FINANCE', items: [{ id: 'payments', label: 'Payments', icon: CreditCard }, { id: 'invoices', label: 'Invoices', icon: ReceiptText }] },
  { label: 'INVENTORY', items: [{ id: 'inventory', label: 'Stock', icon: Package }, { id: 'transactions', label: 'Transactions', icon: RefreshCw }] },
  { label: 'COMMUNICATION', items: [{ id: 'notifications', label: 'Notifications', icon: Bell }, { id: 'communications', label: 'Communications', icon: Bell }] },
  { label: 'ANALYTICS', items: [{ id: 'reports', label: 'Reports', icon: BarChart3 }, { id: 'exports', label: 'Exports', icon: Download }] },
  { label: 'ADMINISTRATION', items: [
    { id: 'technician-profiles', label: 'Technician Profiles', icon: UserRound }, { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log', icon: Database }, { id: 'settings', label: 'Settings', icon: Settings }
  ]}
];
const navItems = [dashboardNav, ...navGroups.flatMap(group => group.items)];
const moduleParents = {
  'service-requests': 'Operations', checklists: 'Operations', emergency: 'Operations', schedule: 'Operations', technicians: 'Operations',
  customers: 'Assets', buildings: 'Assets', lifts: 'Assets', amc: 'Assets',
  payments: 'Finance', invoices: 'Finance',
  inventory: 'Inventory', transactions: 'Inventory',
  notifications: 'Communication', communications: 'Communication',
  reports: 'Analytics', exports: 'Analytics',
  'technician-profiles': 'Administration', roles: 'Administration', audit: 'Administration', settings: 'Administration'
};
function breadcrumbFor(active, activeLabel) {
  const crumbs = [{ label: 'Valor Operations', id: 'dashboard' }];
  if (active === 'dashboard') return crumbs;
  const parent = moduleParents[active];
  if (parent) crumbs.push({ label: parent });
  crumbs.push({ label: activeLabel, id: active, current: true });
  return crumbs;
}


function App() {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(''), [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false), [sidebarHover, setSidebarHover] = useState(false), [mobileNav, setMobileNav] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [loggingOut, setLoggingOut] = useState(false), [logoutConfirm, setLogoutConfirm] = useState(false);
  useEffect(() => {
    let current = true;
    const unsubscribe = session.subscribe(() => { if (current) { setUser(null); setNotice("Your session ended. Please sign in again."); } });
    services.auth.restore().then(value => { if (current) setUser(value); }).catch(error => { if (current) setNotice(error.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; unsubscribe(); };
  }, []);
  const logout = async () => {
    setLoggingOut(true);
    try { await services.auth.logout(); setNotice('You have signed out.'); }
    catch { setNotice('Signed out locally. Server revocation could not be confirmed.'); }
    finally { setUser(null); setActive('dashboard'); setLoggingOut(false); }
  };
  if (routeState(loading, user) === 'loading') return <div className="session-loading" role="status">Checking your session...</div>;
  if (routeState(false, user) === 'login') return <LoginScreen notice={notice} onLogin={value => { setUser(value); setNotice(''); setActive('dashboard'); }} />;
  const activeLabel = navItems.find(item => item.id === active)?.label || 'Dashboard';
  const breadcrumbs = breadcrumbFor(active, activeLabel);
  const toggleGroup = label => setExpandedGroups(current => {
    const next = new Set(current);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });
  const activate = id => {
    setActive(id);
    setSidebarOpen(false);
    setSidebarHover(false);
    setMobileNav(false);
    const group = navGroups.find(section => section.items.some(item => item.id === id));
    if (group) setExpandedGroups(current => new Set(current).add(group.label));
  };
  const expandedSidebar = sidebarOpen || sidebarHover;
  return <ProtectedContent user={user}><div className={`app ${expandedSidebar ? '' : 'sidebar-collapsed'}`}>
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`} onMouseEnter={() => setSidebarHover(true)} onMouseLeave={() => setSidebarHover(false)}>
      <div className="sidebar-head"><div className="brand-mark" title="Valor"><span>V</span></div><button className="sidebar-toggle" aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose size={18}/> : <Menu size={18}/>}</button><button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <nav className="nav" aria-label="Admin navigation"><button title="Dashboard" className={`nav-item nav-dashboard ${active === 'dashboard' ? 'active' : ''}`} onClick={() => activate('dashboard')}><Home size={18}/><span>Dashboard</span></button>{navGroups.map(group => {
        const expanded = expandedGroups.has(group.label);
        return <section className={`nav-group ${expanded ? 'expanded' : ''}`} key={group.label}>
          <button className="nav-group-toggle" aria-expanded={expanded} onClick={() => toggleGroup(group.label)}><span>{group.label}</span>{expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>
          <div className="nav-group-items">{group.items.map(({id,label,icon:Icon}) => <button key={id} title={migrated.has(id) ? label : `${label} - migration deferred`} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => activate(id)}><Icon size={17}/><span>{label}{!migrated.has(id) && <small className="deferred-tag">Deferred</small>}</span></button>)}</div>
        </section>;
      })}</nav>
      <div className="sidebar-bottom"><button className="collapse-btn" aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose size={17}/> : <Menu size={17}/>}<span>{sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</span></button></div>
    </aside>
    {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main"><header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20}/></button><nav className="breadcrumbs" aria-label="Breadcrumb">{breadcrumbs.map((crumb, index) => <React.Fragment key={`${crumb.label}-${index}`}>{index > 0 && <ChevronRight size={14} aria-hidden="true"/>}{crumb.current || index === breadcrumbs.length - 1 ? <b title={crumb.label}>{crumb.label}</b> : crumb.id ? <button type="button" title={crumb.label} onClick={() => activate(crumb.id)}>{crumb.label}</button> : <span title={crumb.label}>{crumb.label}</span>}</React.Fragment>)}</nav><div className="topbar-title"><span>Workspace</span><strong>{activeLabel}</strong></div><div className="topbar-actions"><button className="icon-btn" aria-label="Open notifications" title="Notifications" onClick={() => activate('notifications')}><Bell size={17}/></button><div className="user-copy"><b>{user.email || 'Administrator'}</b><span>{user.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</span></div><button className="secondary-btn" disabled={loggingOut} onClick={() => setLogoutConfirm(true)}><LogOut size={15}/>{loggingOut ? 'Signing out...' : 'Log out'}</button></div></header>
      <div className="content">{active === 'dashboard' ? <Dashboard/> : active === 'schedule' ? <ScheduleCalendarPage api={visitServices} requests={workflowServices} directories={workflowServices} notify={message => setNotice(message)}/> : active === 'technicians' ? <TechnicianAssignmentsPage api={workflowServices} user={user}/> : active === 'checklists' ? <ChecklistTemplatesPage api={phase15Services}/> : active === 'technician-profiles' ? <TechnicianProfileAdminPage api={phase15Services} directories={workflowServices}/> : ['buildings','lifts','amc'].includes(active) ? <AssetPage key={active} kind={active} api={assetServices[active]} assets={assetServices} directories={workflowServices} user={user}/> : active === 'payments' ? <PaymentsPage api={paymentServices} user={user}/> : active === 'transactions' ? <TransactionsPage api={financeServices} user={user}/> : active === 'reports' ? <ReportsPage api={financeServices} user={user}/> : active === 'exports' ? <ReportsPage api={financeServices} user={user} initialType="payments"/> : active === 'roles' ? <RolesPage api={adminSecurityServices} user={user}/> : active === 'audit' ? <AuditLogPage api={adminSecurityServices} user={user}/> : active === 'customers' ? <CustomersPage api={customerServices} user={user}/> : active === 'emergency' ? <EmergencyQueuePage api={workflowServices} user={user}/> : active === 'service-requests' ? <WorkflowPage api={workflowServices} assets={assetServices} visits={visitServices} user={user}/> : active === 'notifications' ? <NotificationsPage api={notificationServices} directories={workflowServices} user={user}/> : active === 'communications' ? <CommunicationsPage api={communicationServices}/> : active === 'settings' ? <SettingsPage api={settingsServices} user={user}/> : <section className="panel empty-state"><h1>{activeLabel}</h1><p>This module is deferred until its API migration. No data or actions are connected.</p><button className="secondary-btn" onClick={() => setActive('dashboard')}>Back to dashboard</button></section>}</div>
    </main>
    {logoutConfirm && <div className="modal-scrim" onClick={() => setLogoutConfirm(false)}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={event => event.stopPropagation()}><div className="confirm-icon danger"><LogOut size={22}/></div><h2 id="logout-title">Are you sure you want to log out?</h2><p>You will need to sign in again to continue managing Valor operations.</p><div className="confirm-actions"><button className="secondary-btn" type="button" onClick={() => setLogoutConfirm(false)}>Cancel</button><button className="danger-btn" type="button" disabled={loggingOut} onClick={() => { setLogoutConfirm(false); logout(); }}><LogOut size={15}/>{loggingOut ? 'Logging out...' : 'Log out'}</button></div></section></div>}
  </div></ProtectedContent>;
}
function Dashboard() {
  const [data,setData] = useState(null), [error,setError] = useState(null), [loading,setLoading] = useState(true), [revision,setRevision] = useState(0);
  const [health,setHealth] = useState(null), [healthError,setHealthError] = useState(null), [healthLoading,setHealthLoading] = useState(true), [healthRevision,setHealthRevision] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError(null); setData(null);
    services.dashboard.summary().then(result => { if(current) setData(result); }).catch(failure => { if(current) setError(failure); }).finally(() => { if(current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);
  useEffect(() => {
    let current = true; setHealthLoading(true); setHealthError(null);
    services.dashboard.health().then(result => { if(current) setHealth(result); }).catch(failure => { if(current) { setHealth(null); setHealthError(failure); } }).finally(() => { if(current) setHealthLoading(false); });
    return () => { current = false; };
  }, [healthRevision]);
  return <SummaryView data={data} error={error} loading={loading} refresh={() => setRevision(value => value+1)} health={health} healthLoading={healthLoading} healthError={healthError} refreshHealth={() => setHealthRevision(value => value+1)}/>;
}
function LoginScreen({ onLogin, notice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitPassword = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try { const data = await services.auth.login({ email, password }); setPassword(''); onLogin(data); }
    catch (err) { setError(err instanceof TypeError ? 'Valor backend is unavailable. Please try again shortly.' : (err.message || 'Unable to sign in.')); }
    finally { setLoading(false); setPassword(''); }
  };
  return <div className="login-page">
    <main className="login-shell">
      <aside className="login-story" aria-label="Valor operations workspace">
        <div className="login-story-copy">
          <h2>Elevating service.<br/><span>Every day.</span></h2>
          <p>Your people, your assets, your operations.<br className="login-desktop-break"/> One connected workspace.</p>
        </div>

        <div className="login-illustration" aria-hidden="true">
          <div className="login-lift-halo"/>
          <div className="login-floor-line login-floor-line-top"/>
          <div className="login-floor-line login-floor-line-bottom"/>
          <div className="login-lift">
            <div className="login-lift-indicator"><span>↑</span> V</div>
            <div className="login-lift-frame">
              <div className="login-lift-doors"><span/><span/></div>
            </div>
            <div className="login-lift-controls"><span>⌃</span><span>⌄</span></div>
          </div>
          <div className="login-illustration-label"><Layers3 size={15}/> Built around your operations</div>
        </div>

        <div className="login-story-footer">
          <span><Building2 size={16} aria-hidden="true"/> Assets</span>
          <span><Wrench size={16} aria-hidden="true"/> Service</span>
          <span><Users size={16} aria-hidden="true"/> Teams</span>
        </div>
      </aside>

      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-content">
          <div className="login-form-heading">
            <p className="login-form-eyebrow">SECURE ADMIN ACCESS</p>
            <h1 id="login-title">Welcome back</h1>
            <p id="login-description">Sign in to manage service operations, assets and teams.</p>
          </div>

          <form onSubmit={submitPassword} className="login-form" aria-describedby="login-description" aria-busy={loading}>
            <div className="login-field">
              <label htmlFor="login-email">Work email</label>
              <div className="login-input-wrap">
                <Mail size={19} aria-hidden="true"/>
                <input id="login-email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" type="email" required placeholder="you@company.com" />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <LockKeyhole size={19} aria-hidden="true"/>
                <input id="login-password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" type="password" required placeholder="Enter your password" />
              </div>
            </div>
            {(error || notice) && <div role="alert" className={`login-message ${error ? 'login-message-error' : 'login-message-notice'}`}>
              <Info size={18} aria-hidden="true"/><span>{error || notice}</span>
            </div>}
            <button type="submit" disabled={loading} className="login-submit">
              {loading && <LoaderCircle size={19} className="login-spinner" aria-hidden="true"/>}
              <span>{loading ? 'Please wait...' : 'Sign in'}</span>
              {!loading && <ArrowRight size={19} aria-hidden="true"/>}
            </button>
            <p className="login-security-note"><ShieldCheck size={16} aria-hidden="true"/><span>Password authentication protects your operations workspace.</span></p>
          </form>
          <div className="login-access-note"><span>Administrator access only</span><p>Use your assigned Valor account to continue.</p></div>
        </div>
      </section>
    </main>

    <footer className="login-footer"><span>Valor Lift Services</span><span>Keeping your operations moving.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
