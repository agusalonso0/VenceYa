import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Bell, CalendarDays, Check, CheckCircle2, CircleDollarSign,
  CreditCard, Home, LogOut, Plus, Search,
  Wallet, X, AlertCircle, ArrowUpRight
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Bill, Category } from './types'

const categories: Category[] = ['Servicios', 'Vivienda', 'Tarjetas', 'Impuestos', 'Seguros', 'Suscripciones', 'Otros']
const demoBills: Bill[] = [
  { id:'demo-1', user_id:'demo', title:'Internet', amount:18900, due_date:dateOffset(2), category:'Servicios', notes:'', paid:false, paid_at:null, created_at:new Date().toISOString() },
  { id:'demo-2', user_id:'demo', title:'Alquiler', amount:250000, due_date:dateOffset(5), category:'Vivienda', notes:'', paid:false, paid_at:null, created_at:new Date().toISOString() },
  { id:'demo-3', user_id:'demo', title:'Tarjeta de crédito', amount:83450, due_date:dateOffset(8), category:'Tarjetas', notes:'', paid:false, paid_at:null, created_at:new Date().toISOString() },
  { id:'demo-4', user_id:'demo', title:'Seguro del auto', amount:32000, due_date:dateOffset(-2), category:'Seguros', notes:'', paid:false, paid_at:null, created_at:new Date().toISOString() },
  { id:'demo-5', user_id:'demo', title:'Luz', amount:14600, due_date:dateOffset(-5), category:'Servicios', notes:'', paid:true, paid_at:new Date().toISOString(), created_at:new Date().toISOString() },
]
function dateOffset(days:number) { const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10) }
const money = (n:number) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
const dateLabel = (s:string) => new Date(`${s}T12:00:00`).toLocaleDateString('es-AR',{day:'numeric',month:'short'})
const daysUntil = (s:string) => Math.ceil((new Date(`${s}T00:00:00`).getTime()-new Date(new Date().toDateString()).getTime())/86400000)

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [demo, setDemo] = useState(!isSupabaseConfigured)
  const [bills, setBills] = useState<Bill[]>(demoBills)
  const [tab, setTab] = useState<'inicio'|'vencimientos'|'historial'>('inicio')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [form, setForm] = useState({title:'',amount:'',due_date:dateOffset(1),category:'Servicios' as Category,notes:''})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) return
    let active = true
    supabase.from('bills').select('*').order('due_date').then(({data,error}) => {
      if (!active) return
      if (error) setFormError('No pudimos cargar tus vencimientos. Revisá la configuración de Supabase.')
      else setBills((data ?? []) as Bill[])
    })
    return () => { active = false }
  }, [session])

  const pending = useMemo(() => bills.filter(b => !b.paid), [bills])
  const paid = useMemo(() => bills.filter(b => b.paid), [bills])
  const overdue = pending.filter(b => daysUntil(b.due_date) < 0)
  const upcoming = pending.filter(b => daysUntil(b.due_date) >= 0).sort((a,b)=>a.due_date.localeCompare(b.due_date))
  const monthTotal = pending.filter(b => b.due_date.slice(0,7) === new Date().toISOString().slice(0,7)).reduce((s,b)=>s+b.amount,0)
  const filtered = (tab === 'historial' ? paid : tab === 'vencimientos' ? pending : [...overdue,...upcoming])
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))

  async function authenticate(e:FormEvent) {
    e.preventDefault(); setAuthError(''); setAuthBusy(true)
    if (!supabase) { setAuthError('Configurá Supabase para habilitar cuentas.'); setAuthBusy(false); return }
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({email:authEmail,password:authPassword})
      : await supabase.auth.signInWithPassword({email:authEmail,password:authPassword})
    setAuthBusy(false)
    if (result.error) setAuthError(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setAuthError('Revisá tu correo para confirmar la cuenta y luego iniciá sesión.')
  }

  async function addBill(e:FormEvent) {
    e.preventDefault(); setFormError('')
    const amount = Number(form.amount)
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.due_date) {
      setFormError('Completá el nombre, un importe válido y la fecha de vencimiento.'); return
    }
    const payload = {title:form.title.trim(),amount,due_date:form.due_date,category:form.category,notes:form.notes.trim() || null,paid:false}
    if (demo || !supabase || !session?.user) {
      setBills(prev => [{...payload,id:crypto.randomUUID(),user_id:'demo',paid_at:null,created_at:new Date().toISOString()},...prev])
    } else {
      const {data,error} = await supabase.from('bills').insert({...payload,user_id:session.user.id}).select().single()
      if (error) { setFormError(error.message); return }
      setBills(prev => [...prev,data as Bill])
    }
    setForm({title:'',amount:'',due_date:dateOffset(1),category:'Servicios',notes:''}); setShowForm(false)
  }

  async function togglePaid(bill:Bill) {
    const next = !bill.paid
    if (!demo && supabase && session?.user) {
      const {error} = await supabase.from('bills').update({paid:next,paid_at:next?new Date().toISOString():null}).eq('id',bill.id)
      if (error) { setFormError('No se pudo actualizar el pago. Intentá nuevamente.'); return }
    }
    setBills(prev => prev.map(b=>b.id===bill.id?{...b,paid:next,paid_at:next?new Date().toISOString():null}:b))
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null) }

  if (isSupabaseConfigured && !authReady) return <div className="loading-screen"><div className="brand-mark">V</div><p>Preparando VenceYa...</p></div>
  if (isSupabaseConfigured && !session && !demo) return <main className="auth-page">
    <div className="auth-brand"><div className="brand-mark">V</div><span>Vence<span>Ya</span></span></div>
    <section className="auth-card">
      <div className="eyebrow">TUS PAGOS BAJO CONTROL</div>
      <h1>{authMode==='login'?'Qué bueno verte':'Creá tu cuenta'}</h1>
      <p className="muted">{authMode==='login'?'Ingresá para ver tus próximos vencimientos.':'Guardá tus vencimientos y accedé desde cualquier dispositivo.'}</p>
      <form onSubmit={authenticate} className="stack">
        <label>Correo electrónico<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required placeholder="tu@email.com"/></label>
        <label>Contraseña<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres"/></label>
        {authError && <div className="error"><AlertCircle size={16}/>{authError}</div>}
        <button className="primary full" disabled={authBusy}>{authBusy?'Un momento...':authMode==='login'?'Iniciar sesión':'Crear cuenta'}</button>
      </form>
      <p className="switch-auth">{authMode==='login'?'¿Todavía no tenés cuenta?':'¿Ya tenés cuenta?'} <button className="link-button" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('')}}>{authMode==='login'?'Registrate':'Iniciá sesión'}</button></p>
    </section>
    <p className="auth-foot">Simple, claro y siempre a tiempo. <span>●</span></p>
  </main>

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">V</div><span>Vence<span>Ya</span></span></div>
      <div className="side-label">MENÚ</div>
      <nav>
        <button className={tab==='inicio'?'nav-item active':'nav-item'} onClick={()=>setTab('inicio')}><Home size={19}/>Inicio</button>
        <button className={tab==='vencimientos'?'nav-item active':'nav-item'} onClick={()=>setTab('vencimientos')}><CalendarDays size={19}/>Vencimientos</button>
        <button className={tab==='historial'?'nav-item active':'nav-item'} onClick={()=>setTab('historial')}><CheckCircle2 size={19}/>Historial</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><Bell size={17}/></div><b>Siempre a tiempo</b><p>Organizá tus pagos en un solo lugar.</p></div>
        {session && <button className="nav-item logout" onClick={signOut}><LogOut size={18}/>Cerrar sesión</button>}
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><div className="brand-mark">V</div><b>Vence<span>Ya</span></b></div>
        <div className="welcome"><span className="muted small">TU TRANQUILIDAD, ORGANIZADA</span><h1>{tab==='inicio'?'Tu resumen':tab==='vencimientos'?'Tus vencimientos':'Pagos realizados'}</h1></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="Notificaciones"><Bell size={19}/></button>
          <div className="avatar">{session?.user?.email?.[0]?.toUpperCase() || 'U'}</div>
        </div>
      </header>
      {demo && <div className="demo-banner"><span><AlertCircle size={16}/> Estás viendo una demostración con datos de ejemplo.</span><button onClick={()=>setDemo(false)}>Entendido</button></div>}
      {formError && <div className="error page-error"><AlertCircle size={16}/>{formError}<button onClick={()=>setFormError('')}><X size={15}/></button></div>}
      {tab==='inicio' && <>
        <section className="hero-row">
          <div><p className="muted">Esto es lo que tenés por delante</p><h2>Que nada se te pase.</h2><p className="muted">Tus próximos pagos, claros y organizados.</p></div>
          <button className="primary" onClick={()=>setShowForm(true)}><Plus size={18}/>Nuevo vencimiento</button>
        </section>
        <section className="stats-grid">
          <article className="stat-card featured"><div className="stat-top"><span>PENDIENTE ESTE MES</span><Wallet size={19}/></div><strong>{money(monthTotal)}</strong><small>En vencimientos sin pagar</small><div className="stat-decoration"><CircleDollarSign size={75}/></div></article>
          <article className="stat-card"><div className="stat-top"><span>PRÓXIMOS PAGOS</span><CalendarDays size={19}/></div><strong>{upcoming.length}</strong><small>Vencimientos por delante</small></article>
          <article className="stat-card"><div className="stat-top"><span>VENCIDOS</span><AlertCircle size={19}/></div><strong>{overdue.length}</strong><small>Requieren tu atención</small></article>
        </section>
        <section className="content-card">
          <div className="section-heading"><div><h3>Próximos vencimientos</h3><p className="muted">Lo que necesitás tener presente</p></div><button className="text-button" onClick={()=>setTab('vencimientos')}>Ver todos <ArrowUpRight size={16}/></button></div>
          <BillList bills={[...overdue,...upcoming].slice(0,5)} onToggle={togglePaid}/>
        </section>
        <section className="bottom-note"><div className="note-icon"><Bell size={19}/></div><div><b>Un paso adelante</b><p>Agregá tus vencimientos para tener una visión clara de tus próximos pagos.</p></div></section>
      </>}
      {tab!=='inicio' && <section className="content-card list-page">
        <div className="section-heading"><div><h3>{tab==='historial'?'Tu historial':'Todos tus vencimientos'}</h3><p className="muted">{tab==='historial'?'Los pagos que ya registraste.':'Controlá y actualizá tus pagos.'}</p></div><button className="primary compact" onClick={()=>setShowForm(true)}><Plus size={17}/>Agregar</button></div>
        <div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar un vencimiento..."/></div>
        <BillList bills={filtered} onToggle={togglePaid} showAll/>
      </section>}
      <footer>VenceYa <span>·</span> Tus pagos bajo control</footer>
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
      <section className="modal">
        <div className="modal-head"><div><span className="eyebrow">ORGANIZÁ TUS PAGOS</span><h2>Nuevo vencimiento</h2></div><button className="icon-button" onClick={()=>setShowForm(false)}><X size={19}/></button></div>
        <form onSubmit={addBill} className="stack">
          <label>Nombre del pago<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej. Internet, alquiler, tarjeta..." required/></label>
          <div className="form-grid"><label>Importe (ARS)<input type="number" min="1" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Ej. 25000" required/></label><label>Fecha de vencimiento<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} required/></label></div>
          <label>Categoría<select value={form.category} onChange={e=>setForm({...form,category:e.target.value as Category})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Notas <span className="muted">(opcional)</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Agregá algún dato útil..."/></label>
          {formError && <div className="error">{formError}</div>}
          <button className="primary full"><Plus size={17}/>Guardar vencimiento</button>
        </form>
      </section>
    </div>}
    <nav className="mobile-nav"><button onClick={()=>setTab('inicio')} className={tab==='inicio'?'selected':''}><Home size={19}/>Inicio</button><button onClick={()=>setTab('vencimientos')} className={tab==='vencimientos'?'selected':''}><CalendarDays size={19}/>Pagos</button><button onClick={()=>setTab('historial')} className={tab==='historial'?'selected':''}><CheckCircle2 size={19}/>Historial</button></nav>
  </div>
}

function BillList({bills,onToggle,showAll=false}:{bills:Bill[],onToggle:(b:Bill)=>void,showAll?:boolean}) {
  if (!bills.length) return <div className="empty-state"><div><CheckCircle2 size={25}/></div><b>Todo en orden</b><p>No hay vencimientos para mostrar por ahora.</p></div>
  return <div className="bill-list">{bills.map(b=>{
    const days=daysUntil(b.due_date), isLate=!b.paid&&days<0
    return <article className="bill-row" key={b.id}>
      <div className="bill-icon"><CreditCard size={19}/></div>
      <div className="bill-info"><b>{b.title}</b><span>{b.category} <i>·</i> Vence {dateLabel(b.due_date)}</span></div>
      <div className="bill-due">{b.paid?<span className="status paid">Pagado</span>:isLate?<span className="status late">Vencido</span>:<span className="status pending">{days===0?'Vence hoy':days===1?'Mañana':`En ${days} días`}</span>}</div>
      <div className="bill-amount">{money(b.amount)}</div>
      <button className={b.paid?'paid-button done':'paid-button'} onClick={()=>onToggle(b)} title={b.paid?'Marcar como pendiente':'Marcar como pagado'}>{b.paid?<Check size={17}/>:<CheckCircle2 size={17}/>}<span>{b.paid?'Pagado':'Pagar'}</span></button>
    </article>
  })}</div>
}