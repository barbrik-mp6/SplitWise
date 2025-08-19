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
  function calculateBalances(trip) {
    const balances = {};
    trip.members.forEach(m => balances[m.id] = 0);

    trip.expenses.forEach(ex => {
        balances[ex.payerId] += ex.amount;
        if (ex.splitType === 'equal') {
            if (!ex.participantIds || ex.participantIds.length === 0) return;
            const share = ex.amount / ex.participantIds.length;
            ex.participantIds.forEach(pid => { balances[pid] -= share; });
        } else { // 'unequal'
            for (const [memberId, share] of Object.entries(ex.shares)) {
                balances[memberId] -= share;
            }
        }
    });

    Object.keys(balances).forEach(k => { if (Math.abs(balances[k]) < 0.01) balances[k] = 0; });
    return balances;
  }
  
  function minimizeSettlements(balances, members) {
    const debtors = [];
    const creditors = [];

    for (const [id, amount] of Object.entries(balances)) {
      if (amount < -0.01) debtors.push({ id, amount: -amount });
      else if (amount > 0.01) creditors.push({ id, amount });
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const paymentAmount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: members.find(m => m.id === debtor.id).name,
        to: members.find(m => m.id === creditor.id).name,
        amount: +paymentAmount.toFixed(2)
      });

      debtor.amount -= paymentAmount;
      creditor.amount -= paymentAmount;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j++;
    }
    return settlements;
  }

  /* ---------- Rendering Functions ---------- */
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
      li.style.cursor = 'pointer';
      li.innerHTML = `<span>${trip.name} (${trip.currency})</span><span style="font-size: 1.25rem; color: var(--secondary);">→</span>`;
      li.onclick = () => {
        state.activeTripId = trip.id;
        save();
        render();
      };
      tripsList.appendChild(li);
    });
  }

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
        <div class="member-actions">
            <button class="secondary edit-member" data-id="${m.id}">Edit</button>
            <button class="danger delete-member" data-id="${m.id}">Del</button>
        </div>`;
      list.appendChild(li);
    });
  }

  function renderPayerAndParticipants(trip) {
    const payerSelect = $('expense-payer');
    const participantsEqualDiv = $('participants-equal');
    const participantsUnequalDiv = $('participants-unequal');
    payerSelect.innerHTML = '';
    participantsEqualDiv.innerHTML = '<p style="font-size: 0.9rem; color: var(--secondary);">Split with:</p>';
    participantsUnequalDiv.innerHTML = '<p style="font-size: 0.9rem; color: var(--secondary);">Enter each person\'s share:</p><p id="unequal-total-tracker" style="font-weight: 500; text-align: right;"></p>';

    if (trip.members.length === 0) {
        payerSelect.innerHTML = '<option>Add members first</option>';
        return;
    }

    trip.members.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;
        payerSelect.appendChild(option);

        const eqWrapper = document.createElement('div');
        eqWrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        eqWrapper.innerHTML = `<input type="checkbox" id="chk-${m.id}" value="${m.id}" checked style="width: auto;"> <label for="chk-${m.id}">${m.name}</label>`;
        participantsEqualDiv.appendChild(eqWrapper);
        
        const unWrapper = document.createElement('div');
        unWrapper.style.cssText = 'display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;';
        unWrapper.innerHTML = `<label for="uneq-${m.id}" style="flex-basis: 50%;">${m.name}</label>
                               <input type="number" id="uneq-${m.id}" data-member-id="${m.id}" min="0" step="0.01" value="0.00" style="flex-grow: 1;">`;
        participantsUnequalDiv.appendChild(unWrapper);
    });
  }

  function renderBalancesAndStats(trip) {
    const balances = calculateBalances(trip);
    const balancesList = $('balances-list');
    balancesList.innerHTML = '';

    Object.entries(balances).forEach(([id, amount]) => {
        const name = trip.members.find(m => m.id === id)?.name || 'N/A';
        const li = document.createElement('li');
        let amountText;
        if (Math.abs(amount) < 0.01) {
            amountText = `is settled up`; li.style.color = 'var(--secondary)';
        } else if (amount < 0) {
            amountText = `owes ${currency(-amount, trip.currency)}`; li.style.color = 'var(--warning)';
        } else {
            amountText = `is owed ${currency(amount, trip.currency)}`; li.style.color = 'var(--success)';
        }
        li.innerHTML = `<span><strong>${name}</strong> ${amountText}</span>`;
        balancesList.appendChild(li);
    });
    
    const totalSpent = trip.expenses.reduce((sum, ex) => sum + ex.amount, 0);
    $('trip-stats').innerHTML = `<p><strong>Total Group Spending:</strong> ${currency(totalSpent, trip.currency)}</p>`;
  }

  function renderSettlements(trip) {
    const balances = calculateBalances(trip);
    const settlementsList = $('settlements-list');
    settlementsList.innerHTML = '';
    const settlements = minimizeSettlements(balances, trip.members);
    if (settlements.length === 0) {
        settlementsList.innerHTML = '<li>All debts are settled! 🎉</li>';
    } else {
        settlements.forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${s.from}</strong> → <strong>${s.to}</strong>: <span>${currency(s.amount,trip.currency)}</span>`;
            settlementsList.appendChild(li);
        });
    }
  }

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
        li.innerHTML = `<div><strong>${ex.description}</strong> (${ex.category})<br>
                        <em style="font-size:0.9rem; color: var(--secondary);">
                           Paid by ${payer} on ${new Date(ex.date).toLocaleDateString()}
                        </em>
                      </div> 
                      <div style="text-align: right;">${currency(ex.amount, trip.currency)}</div>`;
        list.appendChild(li);
    });
  }

  /* ---------- Event Handlers ---------- */
  
  $('create-trip-form').onsubmit = e => {
    e.preventDefault();
    const name = $('trip-name').value.trim();
    const curr = $('trip-currency').value.trim().toUpperCase();
    if (!name || !curr) return;
    state.trips.push({ id: uuid(), name, currency: curr, members: [], expenses: [] });
    e.target.reset();
    save();
    render();
    toast('Group created successfully!');
  };

  $('back-btn').onclick = () => { state.activeTripId = null; save(); render(); };

  $('add-member-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const names = $('member-name').value.trim().split(',').map(name => name.trim()).filter(Boolean);
    if (names.length === 0) return;
    names.forEach(name => trip.members.push({ id: uuid(), name }));
    e.target.reset();
    save();
    renderTripView();
    toast(`${names.length} member(s) added.`);
  };

  $('members-list').onclick = e => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const target = e.target;
    const memberId = target.dataset.id;
    if (!memberId) return;

    if (target.classList.contains('delete-member')) {
        const isUsed = trip.expenses.some(ex => ex.payerId === memberId || ex.participantIds?.includes(memberId) || (ex.shares && ex.shares[memberId]));
        if (isUsed) {
            toast('Cannot delete member involved in expenses.', 'error');
            return;
        }
        if (confirm('Are you sure you want to delete this member?')) {
            trip.members = trip.members.filter(m => m.id !== memberId);
            save(); renderTripView(); toast('Member deleted.');
        }
    } else if (target.classList.contains('edit-member')) {
        const member = trip.members.find(m => m.id === memberId);
        const newName = prompt('Enter new name:', member.name);
        if (newName && newName.trim()) {
            member.name = newName.trim();
            save(); renderTripView(); toast('Member updated.');
        }
    }
  };

  $('expense-category').onchange = () => {
    const customInput = $('custom-category-input');
    if ($('expense-category').value === 'Custom') {
        customInput.classList.remove('hidden');
        customInput.required = true;
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
    }
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
  
  $('participants-unequal').addEventListener('input', () => {
    const inputs = [...document.querySelectorAll('#participants-unequal input')];
    const sum = inputs.reduce((total, input) => total + parseFloat(input.value || 0), 0);
    const totalAmount = parseFloat($('expense-amount').value || 0);
    const tracker = $('unequal-total-tracker');
    tracker.textContent = `Total: ${sum.toFixed(2)} / ${totalAmount.toFixed(2)}`;
    tracker.style.color = Math.abs(sum - totalAmount) < 0.01 ? 'var(--success)' : 'var(--danger)';
  });

  $('add-expense-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip || trip.members.length === 0) { toast('Add members first!', 'error'); return; }

    const newExpense = {
        id: uuid(),
        description: $('expense-desc').value.trim(),
        amount: parseFloat($('expense-amount').value),
        date: $('expense-date').value,
        payerId: $('expense-payer').value,
        category: $('expense-category').value === 'Custom' ? $('custom-category-input').value.trim() : $('expense-category').value,
        splitType: $('split-equal-btn').classList.contains('active') ? 'equal' : 'unequal',
    };
    
    if (!newExpense.description || !newExpense.amount || !newExpense.date || !newExpense.category) {
      toast('Please fill out all expense fields.', 'error');
      return;
    }

    if (newExpense.splitType === 'equal') {
        newExpense.participantIds = [...document.querySelectorAll('#participants-equal input:checked')].map(c => c.value);
        if (newExpense.participantIds.length === 0) { toast('Select at least one participant.', 'error'); return; }
    } else {
        const inputs = [...document.querySelectorAll('#participants-unequal input')];
        const sum = inputs.reduce((total, input) => total + parseFloat(input.value || 0), 0);
        if (Math.abs(sum - newExpense.amount) > 0.01) { toast('The sum of shares must equal the total amount.', 'error'); return; }
        
        newExpense.shares = {};
        inputs.forEach(input => {
            const share = parseFloat(input.value || 0);
            if (share > 0) newExpense.shares[input.dataset.memberId] = share;
        });
    }

    trip.expenses.push(newExpense);
    e.target.reset();
    $('expense-date').valueAsDate = new Date();
    $('expense-category').value = "";
    save();
    renderTripView();
    toast('Expense added.');
  };
  
  $('view-expenses-btn').onclick = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (trip) {
        renderExpensesModal(trip);
        $('expenses-modal').classList.add('visible');
    }
  };
  $('close-expenses-modal').onclick = () => { $('expenses-modal').classList.remove('visible'); };
  $('expenses-modal').onclick = e => { if (e.target === $('expenses-modal')) $('expenses-modal').classList.remove('visible'); };
  
  $('delete-trip-btn').onclick = () => {
    if (confirm('Are you sure you want to permanently delete this group and all its data?')) {
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
        
