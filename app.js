(function () {
  'use strict';

  /* ---------- Helper Functions ---------- */
  const $ = (id) => document.getElementById(id);
  const uuid = () => crypto.randomUUID?.() || ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const toast = (msg, type = '') => {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ` ${type}` : '');
    el.textContent = msg;
    $('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };
  const currency = (n, code) => {
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, minimumFractionDigits: 2 }).format(n);
    } catch (e) {
        return `${code} ${(+n).toFixed(2)}`;
    }
  };

  /* ---------- State Management ---------- */
  const KEY = 'splitEaseState_v2';
  const getInitialState = () => ({
    trips: [],
    activeTripId: null,
    theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  });
  let state = getInitialState();

  const save = () => { localStorage.setItem(KEY, JSON.stringify(state)); };
  const load = () => {
    const stored = localStorage.getItem(KEY);
    if (stored) { state = JSON.parse(stored); }
  };

  /* ---------- Core Application Logic ---------- */
  function calculateBalances(trip) { /* ... NO CHANGE ... */ }
  function minimizeSettlements(balances, members) { /* ... NO CHANGE ... */ }

  /* ---------- Rendering Functions ---------- */
  function render() { /* ... NO CHANGE ... */ }
  function renderDashboard() { /* ... NO CHANGE ... */ }

  function renderTripView() {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) { state.activeTripId = null; render(); return; }

    $('trip-title').textContent = `${trip.name}`;
    $('expense-date').valueAsDate = new Date();

    renderMembers(trip);
    renderPayerAndParticipants(trip);
    renderBalancesAndStats(trip);
    renderSettlements(trip);
  }

  function renderMembers(trip) {
    const list = $('members-list');
    list.innerHTML = '';
    trip.members.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${m.name}</span>
        <div class="actions">
            <button class="secondary edit-member" data-id="${m.id}">Edit</button>
            <button class="danger delete-member" data-id="${m.id}">Del</button>
        </div>`;
      list.appendChild(li);
    });
  }

  function renderPayerAndParticipants(trip) { /* ... NO CHANGE ... */ }
  function renderBalancesAndStats(trip) { /* ... NO CHANGE ... */ }
  function renderSettlements(trip) { /* ... NO CHANGE ... */ }
  
  function renderExpensesModal(trip) {
    const list = $('expenses-list-modal');
    list.innerHTML = '';
    if (trip.expenses.length === 0) {
        list.innerHTML = '<li>No expenses have been added yet.</li>';
        return;
    }
    [...trip.expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(ex => {
        const payer = trip.members.find(m => m.id === ex.payerId)?.name || 'N/A';
        const li = document.createElement('li');
        li.innerHTML = `<div>
                          <strong>${ex.description}</strong> (${ex.category})<br>
                          <em style="font-size:0.9rem; color: var(--secondary);">
                             Paid by ${payer} on ${new Date(ex.date).toLocaleDateString()}
                          </em>
                        </div> 
                        <div class="actions">
                            <span style="font-weight: 600; margin-right: 1rem;">${currency(ex.amount, trip.currency)}</span>
                            <button class="secondary edit-expense-btn" data-expense-id="${ex.id}">Edit</button>
                            <button class="danger delete-expense-btn" data-expense-id="${ex.id}">Del</button>
                        </div>`;
        list.appendChild(li);
    });
  }

  /* ---------- Form Management Functions ---------- */

  function populateExpenseForm(expense, trip) {
    $('editing-expense-id').value = expense.id;
    $('expense-form-title').textContent = 'Edit Expense';
    $('expense-desc').value = expense.description;
    $('expense-amount').value = expense.amount;
    $('expense-date').value = expense.date;
    $('expense-payer').value = expense.payerId;
    
    // Handle category
    const categoryOption = $(`expense-category`).querySelector(`option[value="${expense.category}"]`);
    if (categoryOption) {
        $('expense-category').value = expense.category;
        $('custom-category-input').classList.add('hidden');
    } else {
        $('expense-category').value = 'Custom';
        const customInput = $('custom-category-input');
        customInput.classList.remove('hidden');
        customInput.value = expense.category;
    }

    // Handle split type
    if (expense.splitType === 'equal') {
        $('split-equal-btn').click();
        // Uncheck all first
        trip.members.forEach(m => $(`chk-${m.id}`).checked = false);
        // Check participants
        expense.participantIds.forEach(pid => {
            const chk = $(`chk-${pid}`);
            if (chk) chk.checked = true;
        });
    } else { // unequal
        $('split-unequal-btn').click();
        // Reset all to 0 first
        trip.members.forEach(m => $(`uneq-${m.id}`).value = '0.00');
        // Populate shares
        for (const [memberId, share] of Object.entries(expense.shares)) {
            const input = $(`uneq-${memberId}`);
            if (input) input.value = share.toFixed(2);
        }
    }
    
    $('add-expense-btn').textContent = 'Update Expense';
    $('cancel-edit-btn').classList.remove('hidden');
    $('expenses-modal').classList.remove('visible');
    $('add-expense-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function resetExpenseForm() {
    $('editing-expense-id').value = '';
    $('expense-form-title').textContent = 'Add Expense';
    $('add-expense-form').reset();
    $('expense-date').valueAsDate = new Date();
    $('expense-category').value = "";
    $('custom-category-input').classList.add('hidden');
    $('add-expense-btn').textContent = 'Add Expense';
    $('cancel-edit-btn').classList.add('hidden');
    $('split-equal-btn').click();
  }

  /* ---------- Event Handlers ---------- */
  
  $('create-trip-form').onsubmit = (e) => { /* ... NO CHANGE ... */ };
  $('back-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('add-member-form').onsubmit = (e) => { /* ... NO CHANGE ... */ };
  $('members-list').onclick = (e) => { /* ... NO CHANGE ... */ };
  $('expense-category').onchange = () => { /* ... NO CHANGE ... */ };
  $('split-equal-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('split-unequal-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('participants-unequal').addEventListener('input', () => { /* ... NO CHANGE ... */ });

  $('add-expense-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip || trip.members.length === 0) { toast('Add members first!', 'error'); return; }

    const editingId = $('editing-expense-id').value;

    const expenseData = {
        description: $('expense-desc').value.trim(),
        amount: parseFloat($('expense-amount').value),
        date: $('expense-date').value,
        payerId: $('expense-payer').value,
        category: $('expense-category').value === 'Custom' ? $('custom-category-input').value.trim() : $('expense-category').value,
        splitType: $('split-equal-btn').classList.contains('active') ? 'equal' : 'unequal',
    };
    
    if (!expenseData.description || !expenseData.amount || !expenseData.date || !expenseData.category) {
      toast('Please fill out all expense fields.', 'error');
      return;
    }

    if (expenseData.splitType === 'equal') {
        expenseData.participantIds = [...document.querySelectorAll('#participants-equal input:checked')].map(c => c.value);
        if (expenseData.participantIds.length === 0) { toast('Select at least one participant.', 'error'); return; }
    } else {
        const inputs = [...document.querySelectorAll('#participants-unequal input')];
        const sum = inputs.reduce((total, input) => total + parseFloat(input.value || 0), 0);
        if (Math.abs(sum - expenseData.amount) > 0.01) { toast('The sum of shares must equal the total amount.', 'error'); return; }
        
        expenseData.shares = {};
        inputs.forEach(input => {
            const share = parseFloat(input.value || 0);
            if (share > 0) expenseData.shares[input.dataset.memberId] = share;
        });
    }

    if (editingId) { // UPDATE existing expense
        const expenseIndex = trip.expenses.findIndex(ex => ex.id === editingId);
        if (expenseIndex > -1) {
            trip.expenses[expenseIndex] = { ...trip.expenses[expenseIndex], ...expenseData };
            toast('Expense updated.');
        }
    } else { // ADD new expense
        trip.expenses.push({ id: uuid(), ...expenseData });
        toast('Expense added.');
    }

    resetExpenseForm();
    save();
    renderTripView();
  };

  $('cancel-edit-btn').onclick = resetExpenseForm;
  
  $('view-expenses-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('close-expenses-modal').onclick = () => { /* ... NO CHANGE ... */ };
  $('expenses-modal').onclick = (e) => { /* ... NO CHANGE ... */ };

  $('expenses-list-modal').onclick = (e) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    
    const target = e.target;
    const expenseId = target.dataset.expenseId;
    if (!expenseId) return;

    if (target.classList.contains('delete-expense-btn')) {
        if (confirm('Are you sure you want to delete this expense?')) {
            trip.expenses = trip.expenses.filter(ex => ex.id !== expenseId);
            save();
            renderTripView();
            renderExpensesModal(trip); // Re-render the modal list
            toast('Expense deleted.');
        }
    } else if (target.classList.contains('edit-expense-btn')) {
        const expense = trip.expenses.find(ex => ex.id === expenseId);
        if (expense) {
            populateExpenseForm(expense, trip);
        }
    }
  };
  
  $('delete-trip-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('theme-toggle').onclick = () => { /* ... NO CHANGE ... */ };
  
  /* ---------- Data Import / Export Handlers ---------- */
  $('export-json-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('export-csv-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('import-json-btn').onclick = () => { /* ... NO CHANGE ... */ };
  $('import-file').onchange = (e) => { /* ... NO CHANGE ... */ };
  
  /* ---------- App Initialization ---------- */
  load();
  render();

  /* ---------- Service Worker Registration ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.error('Service Worker registration failed: ', err);
        });
    });
  }
})();
          
