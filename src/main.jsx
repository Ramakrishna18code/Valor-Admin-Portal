import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, ClipboardList, AlertTriangle, CalendarDays, Wrench, Users, Building2, Layers3, ShieldCheck, CreditCard, ReceiptText, Package, RefreshCw, Bell, BarChart3, Download, UserRound, Database, Settings, ChevronDown, ChevronRight, Menu, X, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './styles.css';
import './migration.css';
import { services, session, assetServices, workflowServices, notificationServices, visitServices } from './api/runtime.js';
import { routeState } from './api/services.js';
import { SummaryView, ProtectedContent } from './views.jsx';
import { AssetPage, StaffPage } from './assetModules.jsx';
import { WorkflowPage } from './workflowModules.jsx';
import { NotificationsPage } from './notificationModules.jsx';
import { ScheduleCalendarPage } from './scheduleCalendar.jsx';
const migrated = new Set(['dashboard','buildings','lifts','amc','admin-users','service-requests','notifications','schedule']);
const navGroups = [
  { label: 'MAIN', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
  { label: 'OPERATIONS', items: [
    { id: 'service-requests', label: 'Service Requests', icon: ClipboardList }, { id: 'emergency', label: 'Emergency Queue', icon: AlertTriangle },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays }, { id: 'technicians', label: 'Technician Assignments', icon: Wrench }
  ]},
  { label: 'ASSETS', items: [
    { id: 'customers', label: 'Customers', icon: Users }, { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'lifts', label: 'Lifts', icon: Layers3 }, { id: 'amc', label: 'AMC Contracts', icon: ShieldCheck }
  ]},
  { label: 'FINANCE', items: [{ id: 'payments', label: 'Payments', icon: CreditCard }, { id: 'invoices', label: 'Invoices', icon: ReceiptText }] },
  { label: 'INVENTORY', items: [{ id: 'inventory', label: 'Stock', icon: Package }, { id: 'transactions', label: 'Transactions', icon: RefreshCw }] },
  { label: 'COMMUNICATION', items: [{ id: 'notifications', label: 'Notifications', icon: Bell }] },
  { label: 'ANALYTICS', items: [{ id: 'reports', label: 'Reports', icon: BarChart3 }, { id: 'exports', label: 'Exports', icon: Download }] },
  { label: 'ADMINISTRATION', items: [
    { id: 'admin-users', label: 'Staff provisioning', icon: UserRound }, { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log', icon: Database }, { id: 'settings', label: 'Settings', icon: Settings }
  ]}
];


function App() {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(''), [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true), [mobileNav, setMobileNav] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
  const activeLabel = navGroups.flatMap(group => group.items).find(item => item.id === active)?.label || 'Dashboard';
  return <ProtectedContent user={user}><div className={`app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><span>V</span></div><div className="brand-copy"><strong>valor</strong><small>Lift Services</small></div><button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-switcher"><div className="workspace-avatar">VO</div><div><b>Valor Operations</b><span>Admin workspace</span></div><ChevronDown size={15}/></div>
      <nav className="nav">{navGroups.map(group => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(({id,label,icon:Icon}) => <button key={id} title={migrated.has(id) ? label : `${label} ? migration deferred`} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => { setActive(id); setMobileNav(false); }}><Icon size={17}/><span>{label}{!migrated.has(id) && <small className="deferred-tag">Deferred</small>}</span></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><button className="collapse-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose size={17}/> : <PanelLeftOpen size={17}/>}<span>{sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</span></button></div>
    </aside>
    {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main"><header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs"><span>Valor Operations</span><ChevronRight size={14}/><b>{activeLabel}</b></div><div className="topbar-actions"><div className="user-copy"><b>{user.email || 'Administrator'}</b><span>{user.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</span></div><button className="secondary-btn" disabled={loggingOut} onClick={logout}><LogOut size={15}/>{loggingOut ? 'Signing out...' : 'Log out'}</button></div></header>
      <div className="content">{active === 'dashboard' ? <Dashboard/> : active === 'schedule' ? <ScheduleCalendarPage api={visitServices} requests={workflowServices} directories={workflowServices} notify={message => setNotice(message)}/> : ['buildings','lifts','amc'].includes(active) ? <AssetPage key={active} kind={active} api={assetServices[active]} user={user}/> : active === 'service-requests' ? <WorkflowPage api={workflowServices} assets={assetServices} user={user}/> : active === 'notifications' ? <NotificationsPage api={notificationServices} directories={workflowServices} user={user}/> : active === 'admin-users' ? <StaffPage api={assetServices.staff} user={user}/> : <section className="panel empty-state"><h1>{activeLabel}</h1><p>This module is deferred until its API migration. No data or actions are connected.</p><button className="secondary-btn" onClick={() => setActive('dashboard')}>Back to dashboard</button></section>}</div>
    </main>
  </div></ProtectedContent>;
}
function Dashboard() {
  const [data,setData] = useState(null), [error,setError] = useState(null), [loading,setLoading] = useState(true), [revision,setRevision] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError(null); setData(null);
    services.dashboard.summary().then(result => { if(current) setData(result); }).catch(failure => { if(current) setError(failure); }).finally(() => { if(current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);
  return <SummaryView data={data} error={error} loading={loading} refresh={() => setRevision(value => value+1)}/>;
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
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#f5f7fa,#eef3fa)',padding:20}}>
    <form onSubmit={submitPassword} style={{width:'100%',maxWidth:410,background:'#fff',border:'1px solid #e5eaf0',borderRadius:16,padding:'34px 32px',boxShadow:'0 18px 50px rgba(18,43,61,.1)'}}>
      <div className="brand" style={{padding:0,height:'auto',marginBottom:30}}><div className="brand-mark"><span>V</span></div><div className="brand-copy"><strong style={{color:'#172536'}}>valor</strong><small>Lift Services</small></div></div>
      <div className="eyebrow">SECURE ADMIN ACCESS</div><h1 style={{fontSize:25,margin:'0 0 8px',color:'#172536'}}>Welcome back</h1><p style={{fontSize:12,color:'#7a8896',margin:'0 0 25px'}}>Sign in to manage service operations, assets and teams.</p>
      <label style={{display:'block',fontSize:11,color:'#526677',fontWeight:600,marginBottom:15}}>Work email<input value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" type="email" required style={{display:'block',width:'100%',height:42,border:'1px solid #dfe6ec',borderRadius:7,marginTop:7,padding:'0 11px',outline:0,fontSize:12}} /></label>
      <label style={{display:'block',fontSize:11,color:'#526677',fontWeight:600,marginBottom:18}}>Password<input value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" type="password" required style={{display:'block',width:'100%',height:42,border:'1px solid #dfe6ec',borderRadius:7,marginTop:7,padding:'0 11px',outline:0,fontSize:12}} /></label>
      {(error || notice) && <div role="alert" style={{background:'#fff0f0',color:'#c65555',fontSize:11,padding:'10px 12px',borderRadius:7,marginBottom:15}}>{error || notice}</div>}
      <button type="submit" disabled={loading} className="primary-btn" style={{width:'100%',height:42}}>{loading ? 'Please wait...' : 'Sign in'}</button>
      <p style={{fontSize:10,color:'#98a4ae',textAlign:'center',margin:'18px 0 0'}}>Password authentication protects your operations workspace.</p>
    </form>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
