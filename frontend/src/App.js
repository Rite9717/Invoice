import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8080/api';
const API_ORIGIN = 'http://localhost:8080';
const LOCAL_BILLS_KEY = 'invoice-desk-generated-bills';

const demoData = {
  clients: [
    { id: 1, companyName: 'Sentinal Platform', contactName: 'Ritesh Kumar', email: 'riteshnkumar261@gmail.com', phone: '+91 98765 43210', gstNumber: '29ABCDE1234F1Z5', address: 'Bengaluru, Karnataka' },
    { id: 2, companyName: 'Acme Retail Pvt Ltd', contactName: 'Nisha Rao', email: 'billing@acmeretail.in', phone: '+91 90000 11111', gstNumber: '07AAACA1234A1Z1', address: 'New Delhi' },
  ],
  products: [
    { id: 1, clientId: 1, name: 'GST Billing Module', sku: 'SW-GST-01', stock: 18, lowStockAt: 5, price: 25000, hsnCode: '998314', lowStock: false },
    { id: 2, clientId: 1, name: 'Support Retainer', sku: 'SRV-SUP-01', stock: 4, lowStockAt: 5, price: 15000, hsnCode: '998313', lowStock: true },
    { id: 3, clientId: 2, name: 'Retail POS Integration', sku: 'INT-POS-01', stock: 9, lowStockAt: 3, price: 30000, hsnCode: '998319', lowStock: false },
  ],
  customers: [
    { id: 1, clientId: 1, name: 'North Star Traders', email: 'accounts@northstar.in', phone: '+91 88888 11111', gstNumber: '29ABCDE7654F1Z5', state: 'Karnataka', address: 'Mysuru, Karnataka' },
    { id: 2, clientId: 1, name: 'Metro Build Co', email: 'payables@metrobuild.in', phone: '+91 88888 22222', gstNumber: '27ABCDE7654F1Z5', state: 'Maharashtra', address: 'Pune, Maharashtra' },
    { id: 3, clientId: 2, name: 'Blue Bay Stores', email: 'finance@bluebay.in', phone: '+91 88888 33333', gstNumber: '07ABCDE7654F1Z5', state: 'Delhi', address: 'New Delhi' },
  ],
  invoices: [
    { id: 1, clientId: 1, customerId: 1, invoiceNumber: 'INV-2026-001', issueDate: '2026-06-05', dueDate: '2026-06-20', taxPercent: 18, gstType: 'CGST_SGST', paidAmount: 50000, paymentStatus: 'PARTIAL', status: 'SENT', items: [{ description: 'Spring Boot + React MVP sprint', hsnCode: '998314', quantity: 1, unitPrice: 75000 }, { description: 'Deployment setup', hsnCode: '998313', quantity: 1, unitPrice: 15000 }] },
    { id: 2, clientId: 2, customerId: 3, invoiceNumber: 'INV-2026-002', issueDate: '2026-06-10', dueDate: '2026-06-25', taxPercent: 18, gstType: 'IGST', paidAmount: 0, paymentStatus: 'UNPAID', status: 'DRAFT', items: [{ description: 'Monthly support retainer', hsnCode: '998313', quantity: 1, unitPrice: 25000 }] },
  ],
  payments: [{ id: 1, invoiceId: 1, amount: 50000, mode: 'UPI', paidOn: '2026-06-11', note: 'Advance received' }],
  audits: [
    { id: 1, action: 'Approved client organization', actor: 'CA Super Admin', detail: 'Sentinal Platform' },
    { id: 2, action: 'Created invoice', actor: 'Ritesh Kumar', detail: 'INV-2026-001 with GST calculation' },
    { id: 3, action: 'Low stock alert', actor: 'System', detail: 'Support Retainer is below threshold' },
  ],
  report: { gstr1ReadyInvoices: 1, paidInvoices: 0, partialInvoices: 1, unpaidInvoices: 1 },
};

const seededUsers = {
  'admin@invoice.local': { id: 1, name: 'CA Super Admin', email: 'admin@invoice.local', role: 'CA_SUPER_ADMIN', clientId: null, authProvider: 'password' },
  'client@invoice.local': { id: 2, name: 'Ritesh Kumar', email: 'client@invoice.local', role: 'CLIENT_ADMIN', clientId: 1, authProvider: 'password' },
  'customer@invoice.local': { id: 3, name: 'North Star Buyer', email: 'customer@invoice.local', role: 'CUSTOMER', clientId: 1, authProvider: 'password' },
};

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
}

function subtotal(invoice) {
  return invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function total(invoice) {
  return invoice.total || subtotal(invoice) * (1 + (invoice.taxPercent || 0) / 100);
}

function taxSplit(invoice) {
  const tax = subtotal(invoice) * ((invoice.taxPercent || 0) / 100);
  return invoice.gstType === 'IGST'
    ? { cgst: 0, sgst: 0, igst: tax }
    : { cgst: tax / 2, sgst: tax / 2, igst: 0 };
}

async function api(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function scoped(list, user) {
  if (!user || user.role === 'CA_SUPER_ADMIN') return list;
  return list.filter((item) => item.clientId === user.clientId);
}

function readLocalBills() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BILLS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalBill(invoice) {
  const existing = readLocalBills();
  const withoutDuplicate = existing.filter((item) => item.id !== invoice.id && item.invoiceNumber !== invoice.invoiceNumber);
  localStorage.setItem(LOCAL_BILLS_KEY, JSON.stringify([invoice, ...withoutDuplicate]));
}

function mergeLocalBills(invoices, user) {
  const visibleLocalBills = scoped(readLocalBills(), user);
  const existingKeys = new Set(invoices.map((invoice) => `${invoice.id}-${invoice.invoiceNumber}`));
  const missingLocalBills = visibleLocalBills.filter((invoice) => !existingKeys.has(`${invoice.id}-${invoice.invoiceNumber}`));
  return [...missingLocalBills, ...invoices];
}

function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [status, setStatus] = useState('');
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [audits, setAudits] = useState([]);
  const [report, setReport] = useState(demoData.report);
  const [summary, setSummary] = useState(null);
  const [customerView, setCustomerView] = useState('billing');
  const [authForm, setAuthForm] = useState({ name: 'Ritesh Kumar', email: 'admin@invoice.local', password: 'admin123', role: 'CLIENT_ADMIN' });
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: 1,
    customerId: 1,
    gstType: 'CGST_SGST',
    status: 'DRAFT',
    items: [{ description: '', hsnCode: '', quantity: 1, unitPrice: '' }],
  });
  const [paymentForm, setPaymentForm] = useState({ invoiceId: 1, amount: 25000, mode: 'UPI', note: 'Payment received' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    if (!oauthToken || user) return;

    async function finishOAuth() {
      setStatus('Finishing OAuth login...');
      try {
        const oauthUser = await api('/auth/me', oauthToken);
        setToken(oauthToken);
        setUser(oauthUser);
        await loadWorkspace(oauthToken, oauthUser);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        setStatus('OAuth login completed, but the app could not load the session');
      }
    }

    finishOAuth();
  }, [user]);

  const visibleInvoices = useMemo(() => scoped(invoices, user), [invoices, user]);
  const visibleClients = useMemo(() => (user?.role === 'CA_SUPER_ADMIN' ? clients : clients.filter((client) => client.id === user?.clientId)), [clients, user]);
  const visibleCustomers = useMemo(() => scoped(customers, user), [customers, user]);
  const visibleProducts = useMemo(() => scoped(products, user), [products, user]);
  const visiblePayments = useMemo(() => payments.filter((payment) => visibleInvoices.some((invoice) => invoice.id === payment.invoiceId)), [payments, visibleInvoices]);

  const dashboard = useMemo(() => {
    if (summary) return summary;
    const billed = visibleInvoices.reduce((sum, invoice) => sum + total(invoice), 0);
    const paid = visibleInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
    return {
      invoiceCount: visibleInvoices.length,
      clientCount: visibleClients.length,
      totalAmount: billed,
      paidAmount: paid,
      pendingAmount: billed - paid,
      lowStockCount: visibleProducts.filter((product) => product.lowStock || product.stock <= product.lowStockAt).length,
    };
  }, [summary, visibleClients, visibleInvoices, visibleProducts]);

  async function loadWorkspace(nextToken, nextUser) {
    try {
      const [invoiceData, summaryData, productData, customerData, paymentData, reportData, auditData] = await Promise.all([
        api('/invoices', nextToken),
        api('/invoices/summary', nextToken),
        api('/master/products', nextToken),
        api('/master/customers', nextToken),
        api('/payments', nextToken),
        api('/reports/overview', nextToken),
        api('/reports/audit', nextToken),
      ]);
      const clientData = nextUser.role === 'CA_SUPER_ADMIN' ? await api('/clients', nextToken) : [await api('/clients/me', nextToken)];
      const mergedInvoices = mergeLocalBills(invoiceData, nextUser);
      setInvoices(mergedInvoices);
      setSummary(readLocalBills().length ? null : summaryData);
      setProducts(productData);
      setCustomers(customerData);
      setPayments(paymentData);
      setReport(reportData);
      setAudits(auditData);
      setClients(clientData);
      setStatus('Connected to Spring Boot API');
    } catch {
      setClients(nextUser.role === 'CA_SUPER_ADMIN' ? demoData.clients : demoData.clients.filter((client) => client.id === nextUser.clientId));
      setProducts(scoped(demoData.products, nextUser));
      setCustomers(scoped(demoData.customers, nextUser));
      setInvoices(mergeLocalBills(scoped(demoData.invoices, nextUser), nextUser));
      setPayments(demoData.payments);
      setAudits(demoData.audits);
      setReport(demoData.report);
      setSummary(null);
      setStatus('Using browser demo data until the backend is started');
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setStatus('Signing in...');
    try {
      const body = mode === 'register'
        ? { ...authForm, clientId: authForm.role === 'CA_SUPER_ADMIN' ? null : 1 }
        : { email: authForm.email, password: authForm.password };
      const result = await api(mode === 'register' ? '/auth/register' : '/auth/login', '', { method: 'POST', body: JSON.stringify(body) });
      setToken(result.token);
      setUser(result.user);
      await loadWorkspace(result.token, result.user);
    } catch {
      const fallbackUser = seededUsers[authForm.email] || { id: Date.now(), name: authForm.name || 'Demo User', email: authForm.email, role: authForm.role, clientId: authForm.role === 'CA_SUPER_ADMIN' ? null : 1, authProvider: 'browser-demo' };
      setToken('browser-demo-token');
      setUser(fallbackUser);
      await loadWorkspace('browser-demo-token', fallbackUser);
    }
  }

  function oauthLogin(provider) {
    window.location.href = `${API_ORIGIN}/oauth2/authorization/${provider}`;
  }

  async function createInvoice(event) {
    event.preventDefault();
    const selectedClientId = user?.role === 'CA_SUPER_ADMIN' ? Number(invoiceForm.clientId) : Number(user?.clientId || invoiceForm.clientId);
    const selectedCustomerId = user?.role === 'CUSTOMER'
      ? Number(visibleCustomers[0]?.id || invoiceForm.customerId || 0)
      : Number(invoiceForm.customerId);
    const lineItems = invoiceForm.items
      .filter((item) => item.description.trim() || item.hsnCode.trim() || Number(item.unitPrice) > 0)
      .map((item) => ({
        description: item.description.trim(),
        hsnCode: item.hsnCode.trim(),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
      }));
    const newInvoice = {
      clientId: selectedClientId,
      customerId: selectedCustomerId,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      taxPercent: 18,
      gstType: invoiceForm.gstType,
      status: user?.role === 'CUSTOMER' ? 'GENERATED' : invoiceForm.status,
      items: lineItems,
    };
    try {
      const saved = await api('/invoices', token, { method: 'POST', body: JSON.stringify(newInvoice) });
      if (user?.role === 'CUSTOMER') {
        saveLocalBill(saved);
      }
      setInvoices((current) => [saved, ...current]);
      setStatus(user?.role === 'CUSTOMER' ? 'Final bill created' : 'Invoice created with GST calculation');
    } catch {
      const fallbackInvoice = {
        ...newInvoice,
        id: Date.now(),
        invoiceNumber: `BILL-${Date.now().toString().slice(-6)}`,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      };
      if (user?.role === 'CUSTOMER') {
        saveLocalBill(fallbackInvoice);
      }
      setInvoices((current) => [fallbackInvoice, ...current]);
      setStatus(user?.role === 'CUSTOMER' ? 'Final bill created' : 'Invoice added to browser demo data');
    }
    if (user?.role === 'CUSTOMER') {
      setCustomerView('bills');
      setInvoiceForm((current) => ({
        ...current,
        items: [{ description: '', hsnCode: '', quantity: 1, unitPrice: '' }],
      }));
    }
    setSummary(null);
  }

  function updateInvoiceItem(index, field, value) {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function addInvoiceItem() {
    setInvoiceForm((current) => ({
      ...current,
      items: [...current.items, { description: '', hsnCode: '', quantity: 1, unitPrice: '' }],
    }));
  }

  function removeInvoiceItem(index) {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function recordPayment(event) {
    event.preventDefault();
    const request = { invoiceId: Number(paymentForm.invoiceId), amount: Number(paymentForm.amount), mode: paymentForm.mode, note: paymentForm.note };
    try {
      const saved = await api('/payments', token, { method: 'POST', body: JSON.stringify(request) });
      setPayments((current) => [saved, ...current]);
      setStatus('Payment recorded and invoice status updated');
    } catch {
      setPayments((current) => [{ ...request, id: Date.now(), paidOn: new Date().toISOString().slice(0, 10) }, ...current]);
      setInvoices((current) => current.map((invoice) => invoice.id === request.invoiceId ? { ...invoice, paidAmount: Number(invoice.paidAmount || 0) + request.amount, paymentStatus: 'PARTIAL' } : invoice));
      setStatus('Payment recorded in browser demo data');
    }
    setSummary(null);
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-block">
            <span className="brand-mark">GST</span>
            <div>
              <p className="eyebrow">Secure role based platform</p>
              <h1>Invoice Desk</h1>
            </div>
          </div>
          <div className="mode-switch">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>
          <form onSubmit={submitAuth} className="auth-form">
            {mode === 'register' && <label>Name<input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>}
            <label>Email<input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            {mode === 'register' && (
              <label>Role
                <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
                  <option value="CLIENT_ADMIN">Client Admin</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="CA_SUPER_ADMIN">CA / Super Admin</option>
                </select>
              </label>
            )}
            <button className="primary-button" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <div className="oauth-grid">
            <button onClick={() => oauthLogin('google')}>Google OAuth</button>
            <button onClick={() => oauthLogin('microsoft')}>Microsoft OAuth</button>
          </div>
          <div className="demo-credentials">
            <span>CA: admin@invoice.local / admin123</span>
            <span>Client Admin: client@invoice.local / client123</span>
            <span>Customer: customer@invoice.local / customer123</span>
          </div>
          {status && <p className="status-line">{status}</p>}
        </section>
      </main>
    );
  }

  if (user.role === 'CUSTOMER') {
    return (
      <main className="customer-shell">
        <aside className="customer-side-panel">
          <div className="brand-block">
            <span className="brand-mark">GST</span>
            <div>
              <strong>Invoice Desk</strong>
              <small>Customer</small>
            </div>
          </div>
          <nav className="customer-menu">
            <button className={customerView === 'billing' ? 'active' : ''} onClick={() => setCustomerView('billing')}>
              Billing / Invoice
            </button>
            <button className={customerView === 'bills' ? 'active' : ''} onClick={() => setCustomerView('bills')}>
              Bills
            </button>
          </nav>
          <button className="ghost-button" onClick={() => setUser(null)}>Sign out</button>
        </aside>

        <section className="customer-main">
          <header className="customer-topbar">
            <div>
              <p className="eyebrow">{customerView === 'billing' ? 'Create bill' : 'Generated bills'}</p>
              <h1>{customerView === 'billing' ? 'Billing / Invoice' : 'Bills'}</h1>
            </div>
          </header>

          {customerView === 'billing' && (
            <form onSubmit={createInvoice} className="customer-invoice-card">
              <div className="bill-form-heading">
                <div>
                  <p className="eyebrow">Bill items</p>
                  <h2>Enter item details</h2>
                </div>
                <label>
                  GST type
                  <select value={invoiceForm.gstType} onChange={(event) => setInvoiceForm({ ...invoiceForm, gstType: event.target.value })}>
                    <option value="CGST_SGST">Same state</option>
                    <option value="IGST">Other state</option>
                  </select>
                </label>
              </div>

              <BillItemsTable
                items={invoiceForm.items}
                onChange={updateInvoiceItem}
                onAdd={addInvoiceItem}
                onRemove={removeInvoiceItem}
              />

              <div className="bill-footer-actions">
                <button className="customer-submit" type="submit">Final Bill</button>
                {status && <p className="customer-status">{status}</p>}
              </div>
            </form>
          )}

          {customerView === 'bills' && (
            <section className="bills-section">
              {visibleInvoices.length === 0 && (
                <div className="empty-bills">
                  <h2>No bills yet</h2>
                  <button className="primary-button" onClick={() => setCustomerView('billing')}>Create bill</button>
                </div>
              )}
              {visibleInvoices.map((invoice) => (
                <BillCard key={invoice.id} invoice={invoice} customer={visibleCustomers[0]} />
              ))}
            </section>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block compact">
          <span className="brand-mark">GST</span>
          <div>
            <strong>Invoice Desk</strong>
            <small>{user.role.replaceAll('_', ' ').toLowerCase()}</small>
          </div>
        </div>
        <nav>
          <a href="#flow">Workflow</a>
          <a href="#master">Master Data</a>
          <a href="#invoices">Invoices</a>
          <a href="#payments">Payments</a>
          <a href="#reports">Reports</a>
        </nav>
        <button className="ghost-button" onClick={() => setUser(null)}>Sign out</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{user.authProvider} login</p>
            <h2>System Architecture Dashboard</h2>
          </div>
          <span className={`role-pill ${user.role.toLowerCase()}`}>{user.role.replaceAll('_', ' ')}</span>
        </header>

        <section className="architecture-ribbon">
          <span>Secure</span><span>Role Based</span><span>GST Compliant</span><span>Payment Tracking</span><span>GSTR-1 Export</span>
        </section>

        <section className="metric-grid">
          <article><span>Total billed</span><strong>{formatMoney(Number(dashboard.totalAmount))}</strong></article>
          <article><span>Pending</span><strong>{formatMoney(Number(dashboard.pendingAmount))}</strong></article>
          <article><span>Invoices</span><strong>{dashboard.invoiceCount}</strong></article>
          <article><span>Low stock alerts</span><strong>{dashboard.lowStockCount}</strong></article>
        </section>

        <section id="flow" className="flow-grid">
          {['1. User & Access', '2. Master Data', '3. Invoice Management', '4. Payment Management', '5. Reports & Compliance'].map((title, index) => (
            <article key={title} className="flow-card">
              <strong>{title}</strong>
              <span>{['Registration, CA approval, RBAC', 'Organizations, products, customers', 'GST calculation, invoice number, PDF/email hooks', 'Paid/partial status and notifications', 'Filters, audit logs, GSTR-1 export'][index]}</span>
            </article>
          ))}
        </section>

        {(user.role === 'CA_SUPER_ADMIN' || user.role === 'CLIENT_ADMIN') && (
          <section className="tool-band">
            <div><p className="eyebrow">Invoice workflow</p><h3>Create GST invoice</h3></div>
            <form onSubmit={createInvoice} className="invoice-form">
              <select value={invoiceForm.clientId} onChange={(event) => setInvoiceForm({ ...invoiceForm, clientId: event.target.value })}>
                {visibleClients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
              </select>
              <select value={invoiceForm.customerId} onChange={(event) => setInvoiceForm({ ...invoiceForm, customerId: event.target.value })}>
                {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <input value={invoiceForm.items[0]?.description || ''} onChange={(event) => updateInvoiceItem(0, 'description', event.target.value)} placeholder="Description" />
              <input type="number" min="1" value={invoiceForm.items[0]?.unitPrice || ''} onChange={(event) => updateInvoiceItem(0, 'unitPrice', event.target.value)} placeholder="Price" />
              <select value={invoiceForm.gstType} onChange={(event) => setInvoiceForm({ ...invoiceForm, gstType: event.target.value })}>
                <option value="CGST_SGST">CGST + SGST</option>
                <option value="IGST">IGST</option>
              </select>
              <button className="primary-button" type="submit">Create</button>
            </form>
          </section>
        )}

        <section id="master" className="split-grid">
          <DataList title="Organizations" rows={visibleClients} fields={['companyName', 'gstNumber', 'email']} />
          <DataList title="Products & Inventory" rows={visibleProducts} fields={['name', 'sku', 'stock']} flag="lowStock" />
          <DataList title="Customers" rows={visibleCustomers} fields={['name', 'gstNumber', 'state']} />
        </section>

        <section id="invoices" className="content-section">
          <div className="section-heading"><h3>Invoices and GST</h3>{status && <span>{status}</span>}</div>
          <div className="invoice-table architecture-table">
            <div className="table-row header"><span>Invoice</span><span>Customer</span><span>Status</span><span>GST</span><span>Payment</span><span>Total</span></div>
            {visibleInvoices.map((invoice) => {
              const customer = customers.find((item) => item.id === invoice.customerId) || demoData.customers.find((item) => item.id === invoice.customerId);
              const split = taxSplit(invoice);
              return (
                <div className="table-row" key={invoice.id}>
                  <span>{invoice.invoiceNumber}</span>
                  <span>{customer?.name || 'Customer'}</span>
                  <span className="status-badge">{invoice.status}</span>
                  <span>{invoice.gstType} | CGST {formatMoney(split.cgst)} SGST {formatMoney(split.sgst)} IGST {formatMoney(split.igst)}</span>
                  <span className="status-badge">{invoice.paymentStatus}</span>
                  <strong>{formatMoney(total(invoice))}</strong>
                </div>
              );
            })}
          </div>
        </section>

        {(user.role === 'CA_SUPER_ADMIN' || user.role === 'CLIENT_ADMIN') && (
          <section id="payments" className="tool-band">
            <div><p className="eyebrow">Payment modes</p><h3>Record payment</h3></div>
            <form onSubmit={recordPayment} className="payment-form">
              <select value={paymentForm.invoiceId} onChange={(event) => setPaymentForm({ ...paymentForm, invoiceId: event.target.value })}>
                {visibleInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber}</option>)}
              </select>
              <input type="number" min="1" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
              <select value={paymentForm.mode} onChange={(event) => setPaymentForm({ ...paymentForm, mode: event.target.value })}>
                <option>UPI</option><option>Bank</option><option>Cash</option><option>Other</option>
              </select>
              <button className="primary-button" type="submit">Record</button>
            </form>
          </section>
        )}

        <section className="split-grid">
          <DataList title="Payments" rows={visiblePayments} fields={['invoiceId', 'amount', 'mode']} />
          <DataList title="Audit Trail" rows={audits} fields={['actor', 'action', 'detail']} />
          <article id="reports" className="report-panel">
            <p className="eyebrow">Reports & Compliance</p>
            <h3>GSTR-1 Summary</h3>
            <span>Ready invoices: {report.gstr1ReadyInvoices}</span>
            <span>Paid: {report.paidInvoices}</span>
            <span>Partial: {report.partialInvoices}</span>
            <span>Unpaid: {report.unpaidInvoices}</span>
            <a className="primary-button export-link" href={`${API_BASE}/reports/gstr1.csv`} target="_blank" rel="noreferrer">Export CSV</a>
          </article>
        </section>

        <section className="integration-grid">
          <article>Email Service<br /><span>Send invoices and alerts</span></article>
          <article>PDF Generator<br /><span>Generate and download invoice PDF</span></article>
          <article>GST Compliance<br /><span>GSTR-1 JSON/CSV export</span></article>
          <article>Security<br /><span>RBAC, encryption-ready, backups-ready</span></article>
        </section>
      </section>
    </main>
  );
}

function DataList({ title, rows, fields, flag }) {
  return (
    <article className="data-list">
      <div className="section-heading"><h3>{title}</h3></div>
      {rows.map((row) => (
        <div className="data-row" key={`${title}-${row.id}`}>
          <strong>{row[fields[0]]}</strong>
          <span>{row[fields[1]]}</span>
          <span>{row[fields[2]]}</span>
          {flag && row[flag] && <em>Low stock</em>}
        </div>
      ))}
    </article>
  );
}

function BillItemsTable({ items, onChange, onAdd, onRemove }) {
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  return (
    <div className="bill-entry">
      <div className="bill-row bill-header">
        <span>S.No</span>
        <span>Description</span>
        <span>HSN</span>
        <span>Quantity</span>
        <span>Price</span>
        <span></span>
      </div>
      {items.map((item, index) => (
        <div className="bill-row" key={`bill-row-${index}`}>
          <strong>{index + 1}</strong>
          <input
            value={item.description}
            onChange={(event) => onChange(index, 'description', event.target.value)}
            placeholder="Item name"
            required={index === 0}
          />
          <input
            value={item.hsnCode}
            onChange={(event) => onChange(index, 'hsnCode', event.target.value)}
            placeholder="HSN"
          />
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(event) => onChange(index, 'quantity', event.target.value)}
          />
          <input
            type="number"
            min="0"
            value={item.unitPrice}
            onChange={(event) => onChange(index, 'unitPrice', event.target.value)}
            placeholder="0"
            required={index === 0}
          />
          <button type="button" className="mini-button" onClick={() => onRemove(index)}>Remove</button>
        </div>
      ))}
      <div className="bill-actions">
        <button type="button" className="ghost-button" onClick={onAdd}>Add row</button>
        <strong>Total: {formatMoney(total)}</strong>
      </div>
    </div>
  );
}

function BillCard({ invoice, customer }) {
  return (
    <article className="bill-card">
      <div className="bill-card-header">
        <div>
          <p className="eyebrow">Bill</p>
          <h2>{invoice.invoiceNumber}</h2>
        </div>
        <button className="primary-button print-button" onClick={() => window.print()}>Print</button>
      </div>

      <div className="bill-meta">
        <span>Date: {invoice.issueDate}</span>
        <span>Customer: {customer?.name || 'Customer'}</span>
        <span>Status: {invoice.status}</span>
      </div>

      <div className="bill-print-table">
        <div className="bill-print-row bill-print-head">
          <span>S.No</span>
          <span>Description</span>
          <span>HSN</span>
          <span>Quantity</span>
          <span>Price</span>
          <span>Amount</span>
        </div>
        {invoice.items.map((item, index) => (
          <div className="bill-print-row" key={`${invoice.id}-${index}`}>
            <span>{index + 1}</span>
            <span>{item.description}</span>
            <span>{item.hsnCode || '-'}</span>
            <span>{item.quantity}</span>
            <span>{formatMoney(item.unitPrice)}</span>
            <strong>{formatMoney(item.quantity * item.unitPrice)}</strong>
          </div>
        ))}
      </div>

      <div className="bill-total-line">
        <span>Total</span>
        <strong>{formatMoney(total(invoice))}</strong>
      </div>
    </article>
  );
}

export default App;
