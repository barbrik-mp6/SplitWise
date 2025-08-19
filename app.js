/*
 * =================================================================
 * SplitEase - Expense Splitting Web App
 * =================================================================
 * A simple, offline-first expense splitting web app.
 * This version includes features for editing/deleting expenses and
 * members, custom expense categories, and unequal splitting.
 * All data is saved locally in the browser.
 * =================================================================
 */
(function () {
  'use strict';

  // =================================================================
  // SECTION: Helper Functions
  // =================================================================
  
  /**
   * Shorthand for document.getElementById.
   * @param {string} id The ID of the element to find.
   * @returns {HTMLElement}
   */
  const $ = (id) => document.getElementById(id);

  /**
   * Generates a universally unique identifier (UUID).
   * @returns {string}
   */
  const uuid = () =>
    crypto?.randomUUID?.() ||
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );

  /**
   * Displays a short-lived notification message (a "toast").
   * @param {string} msg The message to display.
   * @param {string} type The type of toast for styling (e.g., 'error').
   */
  const toast = (msg, type = '') => {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ` ${type}` : '');
    el.textContent = msg;
    $('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  /**
   * Formats a number into a currency string.
   * @param {number} n The number to format.
   * @param {string} code The currency code (e.g., 'USD', 'INR').
   * @returns {string}
   */
  const currency = (n, code) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n);
    } catch (e) {
      return `${code} ${(+n).toFixed(2)}`;
    }
  };

  // =================================================================
  // SECTION: State Management
  // =================================================================
  
  // Using a new key to avoid conflicts with older versions of the app's data.
  const KEY = 'splitEaseState_v2';

  // Defines the default structure for the application's state.
  const getInitialState = () => ({
    trips: [],
    activeTripId: null,
    theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  });

  // The 'state' object is the single source of truth for the entire app.
  let state = getInitialState();

  /**
   * Saves the current state to the browser's localStorage.
   */
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving state:", e);
      toast("Could not save data. Storage might be full.", "error");
    }
  };

  /**
   * Loads the state from localStorage when the app starts.
   */
  const load = () => {
    try {
      const storedState = localStorage.getItem(KEY);
      if (storedState) {
        state = JSON.parse(storedState);
      }
    } catch (e) {
      console.error("Error loading state:", e);
      state = getInitialState(); // Reset to a clean state if loading fails.
    }
  };

  // =================================================================
  // SECTION: Core Calculation Logic
  // =================================================================

  /**
   * Calculates the final balance for each member of a trip.
   * @param {object} trip The trip object containing members and expenses.
   * @returns {object} An object mapping member IDs to their balance.
   */
  function calculateBalances(trip) {
    const balances = {};
    trip.members.forEach(m => balances[m.id] = 0);

    trip.expenses.forEach(ex => {
      balances[ex.payerId] += ex.amount;
      if (ex.splitType === 'equal') {
        const share = ex.amount / ex.participantIds.length;
        ex.participantIds.forEach(pid => {
          balances[pid] -= share;
        });
      } else { // Unequal split
        for (const [memberId, share] of Object.entries(ex.shares)) {
          balances[memberId] -= share;
        }
      }
    });
    return balances;
  }

  /**
   * Determines the simplest set of transactions to settle all debts.
   * @param {object} balances The balances object from calculateBalances.
   * @param {Array} members The members array for the trip.
   * @returns {Array} A list of settlement objects {from, to, amount}.
   */
  function minimizeSettlements(balances, members) {
    const debtors = [];
    const creditors = [];
    for (const [id, amount] of Object.entries(balances)) {
      if (amount < -0.01) debtors.push({ id, amount: amount });
      else if (amount > 0.01) creditors.push({ id, amount: amount });
    }

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const payment = Math.min(-debtor.amount, creditor.amount);

      settlements.push({
        from: members.find(m => m.id === debtor.id).name,
        to: members.find(m => m.id === creditor.id).name,
        amount: +payment.toFixed(2)
      });

      debtor.amount += payment;
      creditor.amount -= payment;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j++;
    }
    return settlements;
  }

  // =================================================================
  // SECTION: Rendering Functions
  // =================================================================

  /**
   * Main render function that determines which view to show.
   */
  function render() {
    document.documentElement.setAttribute('data-theme', state.theme);
    $('theme-toggle').textContent = state.theme === 'dark' ? '☀️' : '🌙';

    if (state.activeTripId) {
      $('dashboard-view').classList.add('hidden');
      $('trip-view').classList.remove('hidden');
      renderTripView();
    } else {
      $('dashboard-view').classList.remove('hidden');
      $('trip-view').classList.add('hidden');
      renderDashboard();
    }
  }

  /**
   * Renders the main dashboard showing the list of trips.
   */
  function renderDashboard() {
    const tripsList = $('trips-list');
    tripsList.innerHTML = '';
    if (state.trips.length === 0) {
      $('empty-state').classList.remove('hidden');
      return;
    }
    $('empty-state').classList.add('hidden');
    state.trips.forEach(trip => {
      const li = document.createElement('li');
      li.className = 'trip-item';
      li.innerHTML = `<span>${trip.name} (${trip.currency})</span><span>→</span>`;
      li.onclick = () => {
        state.activeTripId = trip.id;
        save();
        render();
      };
      tripsList.appendChild(li);
    });
  }

  /**
   * Renders the detailed view for the currently active trip.
   */
  function renderTripView() {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) {
      state.activeTripId = null;
      render();
      return;
    }
    $('trip-title').textContent = trip.name;
    renderMembers(trip);
    renderPayerAndParticipants(trip);
    renderBalances(trip);
    renderSettlements(trip);
  }

  /**
   * Renders the list of members with edit and delete buttons.
   */
  function renderMembers(trip) {
    const list = $('members-list');
    list.innerHTML = '';
    trip.members.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${m.name}</span>
        <div class="actions">
            <button class="secondary small edit-member-btn" data-id="${m.id}" title="Edit Name">Edit</button>
            <button class="danger small delete-member-btn" data-id="${m.id}" title="Delete Member">Del</button>
        </div>`;
      list.appendChild(li);
    });
  }

  /**
   * Populates the payer dropdown and participant checkboxes in the expense form.
   */
  function renderPayerAndParticipants(trip) {
    const payerSelect = $('expense-payer');
    const participantsEqualDiv = $('participants-equal');
    const participantsUnequalDiv = $('participants-unequal');
    payerSelect.innerHTML = '';
    participantsEqualDiv.innerHTML = '';
    participantsUnequalDiv.innerHTML = '';

    trip.members.forEach(m => {
      // Payer dropdown
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      payerSelect.appendChild(option);

      // Equal split checkboxes
      participantsEqualDiv.innerHTML += `
        <div class="checkbox-wrapper">
          <input type="checkbox" id="chk-${m.id}" value="${m.id}" checked>
          <label for="chk-${m.id}">${m.name}</label>
        </div>`;
      
      // Unequal split inputs
      participantsUnequalDiv.innerHTML += `
        <div class="unequal-input-wrapper">
            <label for="uneq-${m.id}">${m.name}</label>
            <input type="number" id="uneq-${m.id}" data-member-id="${m.id}" min="0" step="0.01" placeholder="0.00">
        </div>`;
    });
  }
  
  /**
   * Renders the balances list showing who owes and who is owed.
   */
  function renderBalances(trip) {
    const balances = calculateBalances(trip);
    const balancesList = $('balances-list');
    balancesList.innerHTML = '';
    Object.entries(balances).forEach(([id, amount]) => {
      const name = trip.members.find(m => m.id === id)?.name || 'N/A';
      const li = document.createElement('li');
      let text;
      if (Math.abs(amount) < 0.01) {
        text = `is settled up`;
        li.className = 'settled';
      } else if (amount < 0) {
        text = `owes ${currency(-amount, trip.currency)}`;
        li.className = 'owes';
      } else {
        text = `is owed ${currency(amount, trip.currency)}`;
        li.className = 'owed';
      }
      li.innerHTML = `<span>${name}</span> <span>${text}</span>`;
      balancesList.appendChild(li);
    });
  }

  /**
   * Renders the simplified list of settlement transactions.
   */
  function renderSettlements(trip) {
    const balances = calculateBalances(trip);
    const settlements = minimizeSettlements(balances, trip.members);
    const settlementsList = $('settlements-list');
    settlementsList.innerHTML = '';
    if (settlements.length === 0) {
      settlementsList.innerHTML = '<li>All debts are settled! 🎉</li>';
    } else {
      settlements.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${s.from}</strong> → <strong>${s.to}</strong> <span>${currency(s.amount, trip.currency)}</span>`;
        settlementsList.appendChild(li);
      });
    }
  }

  /**
   * Renders the list of expenses inside the modal view.
   */
  function renderExpensesModal(trip) {
    const list = $('expenses-list-modal');
    list.innerHTML = '';
    if (trip.expenses.length === 0) {
      list.innerHTML = '<li>No expenses have been added yet.</li>';
      return;
    }
    // Sort expenses by most recent date first
    [...trip.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(ex => {
      const payer = trip.members.find(m => m.id === ex.payerId)?.name || 'N/A';
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <strong>${ex.description}</strong> (${ex.category || 'Uncategorized'})<br>
          <em>Paid by ${payer} on ${new Date(ex.date).toLocaleDateString()}</em>
        </div>
        <div class="actions">
          <span class="expense-amount">${currency(ex.amount, trip.currency)}</span>
          <button class="secondary small edit-expense-btn" data-expense-id="${ex.id}">Edit</button>
          <button class="danger small delete-expense-btn" data-expense-id="${ex.id}">Del</button>
        </div>`;
      list.appendChild(li);
    });
  }

  // =================================================================
  // SECTION: Form Management
  // =================================================================

  /**
   * Populates the expense form with data from an existing expense for editing.
   */
  function populateExpenseForm(expense, trip) {
    $('editing-expense-id').value = expense.id;
    $('expense-form-title').textContent = 'Edit Expense';
    $('expense-desc').value = expense.description;
    $('expense-amount').value = expense.amount;
    $('expense-date').value = expense.date;
    $('expense-payer').value = expense.payerId;

    // Set category, handling custom categories
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

    // Set split type and populate participants/shares
    if (expense.splitType === 'equal') {
      $('split-equal-btn').click();
      trip.members.forEach(m => $(`chk-${m.id}`).checked = false);
      expense.participantIds.forEach(pid => {
        const chk = $(`chk-${pid}`);
        if (chk) chk.checked = true;
      });
    } else {
      $('split-unequal-btn').click();
      trip.members.forEach(m => $(`uneq-${m.id}`).value = '0.00');
      for (const [memberId, share] of Object.entries(expense.shares)) {
        const input = $(`uneq-${memberId}`);
        if (input) input.value = share.toFixed(2);
      }
    }

    $('add-expense-btn').textContent = 'Update Expense';
    $('cancel-edit-btn').classList.remove('hidden');
    $('expenses-modal').classList.remove('visible'); // Close modal
    $('add-expense-form').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Resets the expense form to its default state.
   */
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

  // =================================================================
  // SECTION: Event Handlers
  // =================================================================

  $('create-trip-form').onsubmit = e => {
    e.preventDefault();
    const name = $('trip-name').value.trim();
    const curr = $('trip-currency').value.trim().toUpperCase();
    if (!name || !curr) return;
    state.trips.push({ id: uuid(), name, currency: curr, members: [], expenses: [] });
    e.target.reset();
    save();
    render();
    toast('Group created!');
  };

  $('add-member-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const name = $('member-name').value.trim();
    if (!name) return;
    trip.members.push({ id: uuid(), name });
    e.target.reset();
    save();
    renderTripView();
    toast('Member added.');
  };

  $('add-expense-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
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
      toast('Please fill all fields.', 'error');
      return;
    }

    if (expenseData.splitType === 'equal') {
      expenseData.participantIds = [...document.querySelectorAll('#participants-equal input:checked')].map(c => c.value);
      if (expenseData.participantIds.length === 0) {
        toast('Select at least one participant.', 'error');
        return;
      }
    } else { // Unequal
      const inputs = [...document.querySelectorAll('#participants-unequal input')];
      const sum = inputs.reduce((total, input) => total + parseFloat(input.value || 0), 0);
      if (Math.abs(sum - expenseData.amount) > 0.01) {
        toast('Sum of shares must equal total amount.', 'error');
        return;
      }
      expenseData.shares = {};
      inputs.forEach(input => {
        const share = parseFloat(input.value || 0);
        if (share > 0) expenseData.shares[input.dataset.memberId] = share;
      });
    }

    if (editingId) { // Update existing expense
      const index = trip.expenses.findIndex(ex => ex.id === editingId);
      if (index > -1) {
        trip.expenses[index] = { ...trip.expenses[index], ...expenseData };
        toast('Expense updated.');
      }
    } else { // Add new expense
      trip.expenses.push({ id: uuid(), ...expenseData });
      toast('Expense added.');
    }

    resetExpenseForm();
    save();
    renderTripView();
  };

  $('back-btn').onclick = () => {
    state.activeTripId = null;
    save();
    render();
  };
  
  $('delete-trip-btn').onclick = () => {
    if (confirm('Delete this group and all its data permanently?')) {
      state.trips = state.trips.filter(t => t.id !== state.activeTripId);
      state.activeTripId = null;
      save();
      render();
      toast('Group deleted.');
    }
  };

  $('theme-toggle').onclick = () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    save();
    render();
  };

  // Event delegation for member edit/delete buttons
  $('members-list').onclick = e => {
      const trip = state.trips.find(t => t.id === state.activeTripId);
      if (!trip) return;
      const memberId = e.target.dataset.id;
      if (!memberId) return;

      if (e.target.classList.contains('delete-member-btn')) {
          if (confirm('Are you sure you want to remove this member?')) {
              trip.members = trip.members.filter(m => m.id !== memberId);
              save();
              renderTripView();
              toast('Member removed.');
          }
      } else if (e.target.classList.contains('edit-member-btn')) {
          const member = trip.members.find(m => m.id === memberId);
          const newName = prompt('Enter new name:', member.name);
          if (newName && newName.trim()) {
              member.name = newName.trim();
              save();
              renderTripView();
              toast('Member updated.');
          }
      }
  };

  // Event delegation for expense edit/delete buttons inside the modal
  $('expenses-list-modal').onclick = e => {
      const trip = state.trips.find(t => t.id === state.activeTripId);
      if (!trip) return;
      const expenseId = e.target.expenseId;
      if (!expenseId) return;

      if (e.target.classList.contains('delete-expense-btn')) {
          if (confirm('Delete this expense?')) {
              trip.expenses = trip.expenses.filter(ex => ex.id !== expenseId);
              save();
              renderTripView(); // Update main view balances
              renderExpensesModal(trip); // Re-render modal list
              toast('Expense deleted.');
          }
      } else if (e.target.classList.contains('edit-expense-btn')) {
          const expense = trip.expenses.find(ex => ex.id === expenseId);
          if (expense) populateExpenseForm(expense, trip);
      }
  };

  // Handlers for UI interactions in the expense form
  $('cancel-edit-btn').onclick = resetExpenseForm;
  $('expense-category').onchange = () => {
    $('custom-category-input').classList.toggle('hidden', $('expense-category').value !== 'Custom');
  };
  $('split-equal-btn').onclick = () => {
    $('split-equal-btn').classList.add('active');
    $('split-unequal-btn').classList.remove('active');
    $('participants-equal').classList.remove('hidden');
    $('participants-unequal').classList.add('hidden');
  };
  $('split-unequal-btn').onclick = () => {
    $('split-unequal-btn').classList.add('active');
    $('split-equal-btn').classList.remove('active');
    $('participants-unequal').classList.remove('hidden');
    $('participants-equal').classList.add('hidden');
  };

  // Handlers for the expenses modal
  $('view-expenses-btn').onclick = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (trip) {
      renderExpensesModal(trip);
      $('expenses-modal').classList.add('visible');
    }
  };
  $('close-expenses-modal').onclick = () => $('expenses-modal').classList.remove('visible');
  $('expenses-modal').onclick = e => {
    if (e.target.id === 'expenses-modal') {
      $('expenses-modal').classList.remove('visible');
    }
  };

  // =================================================================
  // SECTION: Data Import / Export
  // =================================================================

  $('export-json-btn').onclick = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  $('export-csv-btn').onclick = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    let csv = "Description,Amount,Currency,Payer,Date,Category\r\n";
    trip.expenses.forEach(ex => {
      const payer = trip.members.find(m => m.id === ex.payerId)?.name || 'N/A';
      const row = [ `"${ex.description}"`, ex.amount, trip.currency, payer, ex.date, ex.category ].join(',');
      csv += row + "\r\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip.name.replace(/\s+/g, '_')}_expenses.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  $('import-json-btn').onclick = () => $('import-file').click();
  $('import-file').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.name || !data.currency || !Array.isArray(data.members) || !Array.isArray(data.expenses)) {
          throw new Error('Invalid file structure.');
        }
        state.trips.push({ ...data, id: uuid() });
        save();
        renderDashboard();
        toast('Trip imported!');
      } catch (err) {
        toast('Invalid JSON file.', 'error');
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // =================================================================
  // SECTION: Service Worker Registration
  // =================================================================

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.error('Service Worker registration failed: ', err);
      });
    });
  }

  // =================================================================
  // SECTION: App Initialization
  // =================================================================
  
  load();
  render();

})();
