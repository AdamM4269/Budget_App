const STORAGE_KEY = 'clair-budget-v1';
const euro = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
const monthName = date => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date).replace(/^./, char => char.toUpperCase());
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const starter = {
  month: '2025-03', carryover: 0, safety: 1840,
  incomes: [
    { id: uid(), name: 'Esker', amount: 2300, type: 'Salaire' },
    { id: uid(), name: 'Chorales', amount: 200, type: 'Salaire' },
    { id: uid(), name: 'Chorales EI', amount: 300, type: 'EI', ei: true },
    { id: uid(), name: 'HCL', amount: 1800, type: 'Salaire' }
  ],
  charges: [
    { id: uid(), name: 'Crédit maison', amount: 1430, type: 'Fixe' }, { id: uid(), name: 'Taxe foncière', amount: 37.5, type: 'Fixe' },
    { id: uid(), name: 'Assurance habitation', amount: 27.5, type: 'Fixe' }, { id: uid(), name: 'Électricité', amount: 100, type: 'Fixe' },
    { id: uid(), name: 'Eau', amount: 30, type: 'Fixe' }, { id: uid(), name: 'Wifi', amount: 30, type: 'Fixe' },
    { id: uid(), name: 'Spotify', amount: 13, type: 'Fixe' }, { id: uid(), name: 'VOD', amount: 50, type: 'Fixe' },
    { id: uid(), name: 'Transports en commun', amount: 150, type: 'Fixe' }, { id: uid(), name: 'Nourriture', amount: 450, type: 'Variable' },
    { id: uid(), name: 'Psy', amount: 120, type: 'Fixe' }
  ],
  envelopes: [
    { name: 'Épargne', percent: 40, icon: '↗', color: '#cdeee1' }, { name: 'Perso', percent: 20, icon: '♡', color: '#f5d77c' },
    { name: 'Loisirs', percent: 30, icon: '✦', color: '#c9bee9' }, { name: 'Tampon', percent: 10, icon: '◌', color: '#a8c9e8' }
  ], expenses: []
};
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || starter;
state.envelopeCarryover = state.envelopeCarryover || {};
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const netIncome = () => state.incomes.reduce((sum, income) => sum + Number(income.amount) * (income.ei ? .7 : 1), 0);
const totalCharges = () => state.charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
const remaining = () => netIncome() - totalCharges() + Number(state.carryover || 0);
const individualRemaining = () => Math.max(0, remaining()) / 2;
const categoryFor = envelope => ({ Perso: 'Dépenses personnelles', Épargne: 'Épargne', Loisirs: 'Loisirs', Tampon: 'Tampon' }[envelope.name] || envelope.name);
const spentFor = envelope => state.expenses.filter(expense => expense.category === categoryFor(envelope)).reduce((sum, expense) => sum + Number(expense.amount), 0);
const baseAllocationFor = envelope => individualRemaining() * envelope.percent / 100;
const allocationFor = envelope => baseAllocationFor(envelope) + Number(state.envelopeCarryover[envelope.name] || 0);
const get = id => document.getElementById(id);

function render() {
  const date = new Date(`${state.month}-01T12:00:00`); const label = monthName(date);
  ['sidebarMonth', 'breadcrumbMonth', 'currentMonthLabel'].forEach(id => get(id).textContent = label);
  get('remainingAmount').textContent = euro(individualRemaining()); get('netIncome').textContent = euro(netIncome());
  const individualCarryover = Number(state.carryover || 0) / 2 + Object.values(state.envelopeCarryover).reduce((sum, value) => sum + Number(value), 0);
  get('totalCharges').textContent = euro(totalCharges()); get('carryoverAmount').textContent = euro(individualCarryover);
  get('incomeTotalBottom').textContent = euro(netIncome()); get('chargesTotalBottom').textContent = euro(totalCharges());
  renderEnvelopes(); renderRows('incomeTable', state.incomes, 'income'); renderRows('chargeTable', state.charges, 'charge'); renderExpenses();
}
function renderEnvelopes() {
  get('envelopeGrid').innerHTML = state.envelopes.map(item => {
    const allocation = allocationFor(item);
    const spent = spentFor(item);
    const progress = allocation ? spent / allocation * 100 : spent ? 100 : 0;
    return `<article class="envelope${spent > allocation ? ' over-budget' : ''}" style="--accent:${item.color}"><div class="envelope-head"><span class="envelope-icon">${item.icon}</span><span class="eyebrow">${item.percent} %</span></div><h3>${item.name}</h3><div class="envelope-amount">${euro(allocation)}</div><div class="envelope-progress" aria-label="${euro(spent)} dépensés sur ${euro(allocation)}"><div class="envelope-progress-fill" style="width:${Math.min(100, progress)}%"></div></div><div class="envelope-spent">${euro(spent)} / ${euro(allocation)} <span>dépensé</span></div><div class="envelope-meta">Budget alloué <strong>${item.percent} %</strong></div></article>`;
  }).join('');
}
function renderRows(target, rows, kind) {
  get(target).innerHTML = rows.map(row => `<div class="table-row"><span class="row-name">${row.name}</span><span class="row-tag">${row.ei ? '−30 % EI' : row.type}</span><strong class="row-amount">${euro(row.amount * (row.ei ? .7 : 1))}</strong><button class="row-action" data-edit="${kind}" data-id="${row.id}" aria-label="Modifier ${row.name}">⋮</button></div>`).join('');
}
function renderExpenses() {
  const total = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  get('expenseCount').textContent = `${state.expenses.length} dépense${state.expenses.length > 1 ? 's' : ''}`; get('expenseTotal').textContent = euro(total);
  get('expenseList').innerHTML = state.expenses.length ? state.expenses.map(item => `<div class="expense-item"><span class="expense-icon">${item.icon || '↗'}</span><div><strong>${item.name}</strong><div class="expense-date">${item.category}</div></div><strong>${euro(item.amount)}</strong><button class="delete-expense" data-delete-expense="${item.id}" aria-label="Supprimer ${item.name}">×</button></div>`).join('') : '<div class="empty-expenses">Aucune dépense enregistrée pour le moment.</div>';
}
function openModal(type, data = null) {
  const isExpense = type === 'expense', isBudget = type === 'budget', isMonth = type === 'month';
  get('modalEyebrow').textContent = isMonth ? 'PRÉPARER LE MOIS SUIVANT' : isBudget ? 'RÉPARTITION DU BUDGET' : isExpense ? 'SORTIE PONCTUELLE' : type === 'income' ? 'ENTRÉE DU MOIS' : 'CHARGE COMMUNE';
  get('modalTitle').textContent = isMonth ? 'Nouveau mois' : isBudget ? 'Modifier les enveloppes' : data ? 'Modifier l’entrée' : `Ajouter ${isExpense ? 'une dépense' : type === 'income' ? 'un revenu' : 'une charge'}`;
  if (isMonth) { get('modalForm').innerHTML = `<div class="step-note">Les charges actuelles seront reconduites. Ajoutez les nouveaux revenus, puis le solde disponible de ce mois sera reporté automatiquement.</div><div class="form-field"><label for="monthToOpen">Mois à ouvrir</label><input id="monthToOpen" type="month" value="${nextMonthValue()}"></div><div class="month-confirm"><button type="button" class="cancel-btn" id="modalCancel">Annuler</button><button type="button" class="primary-btn form-submit" id="openMonthSubmit">Ouvrir le mois</button></div>`; }
  else if (isBudget) { get('modalForm').innerHTML = state.envelopes.map((item, index) => `<div class="form-field"><label for="budget-${index}">${item.name}</label><input id="budget-${index}" type="number" min="0" max="100" value="${item.percent}" required></div>`).join('') + '<button class="primary-btn form-submit">Enregistrer la répartition</button>'; }
  else { get('modalForm').innerHTML = `<div class="form-field"><label for="entryName">Libellé</label><input id="entryName" value="${data?.name || ''}" required placeholder="Ex. Salaire principal"></div><div class="form-field"><label for="entryAmount">Montant (€)</label><input id="entryAmount" type="number" min="0" step="0.01" value="${data?.amount || ''}" required placeholder="0,00"></div>${type === 'income' ? '<div class="form-field"><label for="entryType">Type</label><select id="entryType"><option>Salaire</option><option>EI</option><option>Autre</option></select></div><div class="form-field"><label><input id="entryEi" type="checkbox" ' + (data?.ei ? 'checked' : '') + '> Appliquer la retenue EI de 30 %</label></div>' : isExpense ? '<div class="form-field"><label for="entryCategory">Budget utilisé</label><select id="entryCategory"><option>Épargne</option><option>Dépenses personnelles</option><option>Loisirs</option><option>Tampon</option><option>Autre</option></select></div>' : '<div class="form-field"><label for="entryType">Nature</label><select id="entryType"><option>Fixe</option><option>Variable</option></select></div>'}<button class="primary-btn form-submit">Enregistrer</button>`; }
  get('modalBackdrop').hidden = false; get('modalForm').onsubmit = event => { event.preventDefault(); submitModal(type, data); }; get('modalCancel')?.addEventListener('click', closeModal); get('openMonthSubmit')?.addEventListener('click', () => submitModal(type, data));
}
function nextMonthValue() { const date = new Date(`${state.month}-01T12:00:00`); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 7); }
function submitModal(type, data) {
  if (type === 'month') {
    const newMonth = get('monthToOpen').value;
    if (!newMonth) return;
    state.envelopeCarryover = Object.fromEntries(state.envelopes.map(item => [item.name, Math.max(0, allocationFor(item) - spentFor(item))]));
    state.carryover = 0;
    state.month = newMonth;
    state.expenses = [];
    save(); closeModal(); render(); return;
  }
  if (type === 'budget') { const values = state.envelopes.map((item, index) => ({ ...item, percent: Number(get(`budget-${index}`).value) })); if (values.reduce((sum, item) => sum + item.percent, 0) !== 100) return alert('La répartition doit totaliser exactement 100 %.'); state.envelopes = values; save(); closeModal(); render(); return; }
  const item = { id: data?.id || uid(), name: get('entryName').value.trim(), amount: Number(get('entryAmount').value), type: get('entryType')?.value || 'Autre' };
  if (type === 'income') item.ei = get('entryEi')?.checked || item.type === 'EI';
  if (type === 'expense') { item.category = get('entryCategory').value; state.expenses = data ? state.expenses.map(row => row.id === data.id ? { ...item, category: item.category } : row) : [...state.expenses, { ...item, category: item.category }]; }
  else { const list = type === 'income' ? 'incomes' : 'charges'; state[list] = data ? state[list].map(row => row.id === data.id ? item : row) : [...state[list], item]; }
  save(); closeModal(); render();
}
function closeModal() { get('modalBackdrop').hidden = true; }

const sidebar = get('sidebar');
const menuToggle = get('menuToggle');
const closeSidebar = () => { sidebar.classList.remove('is-open'); get('sidebarOverlay').classList.remove('is-visible'); menuToggle.setAttribute('aria-expanded', 'false'); };
menuToggle.onclick = () => { const isOpen = sidebar.classList.toggle('is-open'); get('sidebarOverlay').classList.toggle('is-visible', isOpen); menuToggle.setAttribute('aria-expanded', String(isOpen)); };
get('sidebarClose').onclick = closeSidebar;
get('sidebarOverlay').onclick = closeSidebar;
document.querySelectorAll('.sidebar .nav-link, .sidebar .brand').forEach(link => link.addEventListener('click', closeSidebar));

document.addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]'); if (edit) openModal(edit.dataset.edit, state[edit.dataset.edit === 'income' ? 'incomes' : 'charges'].find(item => item.id === edit.dataset.id));
  const remove = event.target.closest('[data-delete-expense]'); if (remove) { state.expenses = state.expenses.filter(item => item.id !== remove.dataset.deleteExpense); save(); render(); }
});
get('addIncomeButton').onclick = () => openModal('income'); get('addChargeButton').onclick = () => openModal('charge'); get('quickExpenseButton').onclick = () => openModal('expense'); get('editBudgetsButton').onclick = () => openModal('budget'); get('newMonthButton').onclick = () => openModal('month'); get('modalClose').onclick = closeModal; get('modalBackdrop').onclick = event => { if (event.target.id === 'modalBackdrop') closeModal(); };
get('previousMonth').onclick = () => moveMonth(-1); get('nextMonth').onclick = () => moveMonth(1); get('exportButton').onclick = () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `clair-${state.month}.json`; link.click(); URL.revokeObjectURL(link.href); };
function moveMonth(delta) { const date = new Date(`${state.month}-01T12:00:00`); date.setMonth(date.getMonth() + delta); state.month = date.toISOString().slice(0, 7); save(); render(); }
render();
