// SplitEase - A simple, offline-first expense splitting web app.
// Vanilla JS, no dependencies, with Gemini AI integration.
(function () {
  'use strict';

  /* ---------- Helper Functions ---------- */
  const $ = (id) => document.getElementById(id);
  const uuid = () =>
    crypto?.randomUUID?.() ||
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );

  /**
   * Displays a short-lived notification message (a "toast").
   * @param {string} msg The message to display.
   * @param {string} type The type of toast (e.g., 'error').
   */
  const toast = (msg, type = '') => {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ` ${type}` : '');
    el.textContent = msg;
    $('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  /**
   * Saves the current state to localStorage.
   */
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving state to localStorage", e);
      toast("Could not save data. Your browser storage might be full.", "error");
    }
  };

  /**
   * Loads the state from localStorage.
   */
  const load = () => {
    try {
      const storedState = localStorage.getItem(KEY);
      if (storedState) {
        state = JSON.parse(storedState);
      }
    } catch (e) {
      console.error("Error loading state from localStorage", e);
      state = getInitialState();
    }
  };
  
  const currency = (n, code) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n);
    } catch (e) {
      return `${code} ${(+n).toFixed(2)}`;
    }
  };

  /* ---------- State Management ---------- */
  const KEY = 'splitEaseState';
  const getInitialState = () => ({
    trips: [],
    activeTripId: null,
    theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  });
  let state = getInitialState();

  /* ---------- Gemini API Integration ---------- */

  /**
   * Calls the Gemini API to parse a natural language expense string.
   * @param {string} text The user's input string.
   * @param {Array<string>} memberNames Array of member names for context.
   * @returns {Promise<object>} The parsed expense object.
   */
  async function callGeminiToParseExpense(text, memberNames) {
    const apiKey = ""; // This will be handled by the execution environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const prompt = `
      You are an expert expense parser. Analyze the following text and extract the expense details.
      The available members in the group are: ${memberNames.join(', ')}.
      The word "me" or "I" refers to the person who paid, but you should not determine the payer.
      Your task is to identify the description, the total amount, and the list of participants from the available members.
      If a name is mentioned that is not in the members list, do not include it.
      If no participants are mentioned, assume the expense is for all members.
      Text to parse: "${text}"
    `;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            description: { type: "STRING" },
            amount: { type: "NUMBER" },
            participants: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["description", "amount", "participants"]
        }
      }
    };
    
    // Fetch with exponential backoff
    let response;
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break;
        } catch (error) {
            // Network or other fetch error
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }

    if (!response || !response.ok) {
        throw new Error('Failed to reach the AI model after multiple attempts.');
    }

    const result = await response.json();
    if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0]) {
      return JSON.parse(result.candidates[0].content.parts[0].text);
    } else {
      throw new Error('Invalid response structure from AI model.');
    }
  }


  /* ---------- Core Application Logic ---------- */
  
  function calculateBalances(trip) {
    const balances = {};
    trip.members.forEach(m => balances[m.id] = 0);
    
    trip.expenses.forEach(ex => {
      if (!ex.participantIds || ex.participantIds.length === 0) return;
      const share = ex.amount / ex.participantIds.length;
      balances[ex.payerId] += ex.amount;
      ex.participantIds.forEach(pid => {
        balances[pid] -= share;
      });
    });

    Object.keys(balances).forEach(k => {
      if (Math.abs(balances[k]) < 0.005) balances[k] = 0;
    });

    return balances;
  }

  function minimizeSettlements(balances, members) {
    const debtors = [];
    const creditors = [];

    for (const [id, amount] of Object.entries(balances)) {
      if (amount < -0.01) debtors.push({ id, amount });
      else if (amount > 0.01) creditors.push({ id, amount });
    }

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const paymentAmount = Math.min(-debtor.amount, creditor.amount);

      settlements.push({
        from: members.find(m => m.id === debtor.id).name,
        to: members.find(m => m.id === creditor.id).name,
        amount: +paymentAmount.toFixed(2)
      });

      debtor.amount += paymentAmount;
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
      li.style.fontWeight = '500';
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
    if (!trip) {
      state.activeTripId = null;
      render();
      return;
    }

    $('trip-title').textContent = `${trip.name}`;

    const membersList = $('members-list');
    membersList.innerHTML = '';
    trip.members.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m.name;
      membersList.appendChild(li);
    });

    const payerSelect = $('expense-payer');
    payerSelect.innerHTML = '';
    const participantsDiv = $('expense-participants');
    participantsDiv.innerHTML = '<p style="font-size: 0.9rem; color: var(--secondary);">Split with:</p>';
    
    trip.members.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      payerSelect.appendChild(option);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; align-items: center; margin-top: 0.5rem;';
      wrapper.innerHTML = `
        <input type="checkbox" id="chk-${m.id}" value="${m.id}" checked style="width: 1.1rem; height: 1.1rem; margin-right: 0.75rem;">
        <label for="chk-${m.id}">${m.name}</label>
      `;
      participantsDiv.appendChild(wrapper);
    });

    const expensesList = $('expenses-list');
    expensesList.innerHTML = '';
    [...trip.expenses].reverse().forEach(ex => {
      const payer = trip.members.find(m => m.id === ex.payerId)?.name || 'N/A';
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${ex.description}</strong><br><em style="font-size:0.9rem; color: var(--secondary);">Paid by ${payer}</em></div> <div>${currency(ex.amount, trip.currency)}</div>`;
      expensesList.appendChild(li);
    });

    const balances = calculateBalances(trip);
    const balancesList = $('balances-list');
    balancesList.innerHTML = '';
    Object.entries(balances).forEach(([id, amount]) => {
      const name = trip.members.find(m => m.id === id)?.name || 'N/A';
      const li = document.createElement('li');
      let amountText;
      if (Math.abs(amount) < 0.01) {
        amountText = `is settled up`;
        li.style.color = 'var(--secondary)';
      } else if (amount < 0) {
        amountText = `owes ${currency(-amount, trip.currency)}`;
        li.style.color = '#f59e0b';
      } else {
        amountText = `is owed ${currency(amount, trip.currency)}`;
        li.style.color = '#22c55e';
      }
      li.innerHTML = `<span>${name}</span> <span>${amountText}</span>`;
      balancesList.appendChild(li);
    });

    const settlementsList = $('settlements-list');
    settlementsList.innerHTML = '';
    const settlements = minimizeSettlements(balances, trip.members);
    if (settlements.length === 0) {
      settlementsList.innerHTML = '<li>All debts are settled! 🎉</li>';
    } else {
      settlements.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${s.from}</strong> <span style="color: var(--secondary); margin: 0 0.5rem;">→</span> <strong>${s.to}</strong> <span style="margin-left: auto;">${currency(s.amount,trip.currency)}</span>`;
        li.style.alignItems = 'baseline';
        settlementsList.appendChild(li);
      });
    }
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

  $('add-member-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const name = $('member-name').value.trim();
    if (!name) return;
    trip.members.push({ id: uuid(), name });
    e.target.reset();
    save();
    render();
    toast('Member added.');
  };

  $('add-expense-form').onsubmit = e => {
    e.preventDefault();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const desc = $('expense-desc').value.trim();
    const amount = parseFloat($('expense-amount').value);
    if (!desc || !(amount > 0)) return;
    const payerId = $('expense-payer').value;
    const participantIds = [...document.querySelectorAll('#expense-participants input:checked')].map(c => c.value);
    if (participantIds.length === 0) {
      toast('Please select at least one participant.', 'error');
      return;
    }
    trip.expenses.push({ id: uuid(), description: desc, amount: +amount.toFixed(2), payerId, participantIds });
    e.target.reset();
    $('ai-expense-input').value = '';
    save();
    render();
    toast('Expense added.');
  };

  $('parse-expense-btn').onclick = async () => {
    const text = $('ai-expense-input').value.trim();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!text || !trip || trip.members.length === 0) {
      toast('Please add members and enter text to parse.', 'error');
      return;
    }

    const btn = $('parse-expense-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Parsing...';

    try {
      const memberNames = trip.members.map(m => m.name);
      const parsed = await callGeminiToParseExpense(text, memberNames);

      $('expense-desc').value = parsed.description || '';
      $('expense-amount').value = parsed.amount || '';

      // Uncheck all participants first
      trip.members.forEach(m => {
        const checkbox = $(`chk-${m.id}`);
        if (checkbox) checkbox.checked = false;
      });

      // Check participants returned by the AI
      if (parsed.participants && parsed.participants.length > 0) {
        parsed.participants.forEach(name => {
          const member = trip.members.find(m => m.name.toLowerCase() === name.toLowerCase());
          if (member) {
            const checkbox = $(`chk-${member.id}`);
            if (checkbox) checkbox.checked = true;
          }
        });
      } else { // if AI returns no one, assume all
          trip.members.forEach(m => {
            const checkbox = $(`chk-${m.id}`);
            if (checkbox) checkbox.checked = true;
        });
      }
      toast('Expense details parsed!');
    } catch (error) {
      console.error('Gemini API Error:', error);
      toast('Could not parse expense with AI.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Parse with AI';
    }
  };

  $('back-btn').onclick = () => {
    state.activeTripId = null;
    save();
    render();
  };

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

  /* ---------- Data Export / Import ---------- */

  $('download-json-btn').onclick = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('JSON data exported.');
  };
  
  $('download-csv-btn').onclick = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    let csvContent = "Description,Amount,Currency,Payer,Participants\r\n";
    trip.expenses.forEach(ex => {
        const payer = trip.members.find(m => m.id === ex.payerId)?.name || 'N/A';
        const participants = ex.participantIds.map(pid => trip.members.find(m => m.id === pid)?.name || 'N/A').join('; ');
        const description = `"${ex.description.replace(/"/g, '""')}"`;
        const row = [description, ex.amount, trip.currency, payer, `"${participants}"`].join(',');
        csvContent += row + "\r\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip.name.replace(/\s+/g, '_')}_expenses.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('CSV data exported.');
  };

  $('import-btn').onclick = () => $('import-file').click();
  
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
        const newId = uuid();
        state.trips.push({ ...data, id: newId });
        save();
        renderDashboard();
        toast('Trip imported successfully!');
      } catch (err) {
        toast('Invalid or corrupted JSON file.', 'error');
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ---------- Service Worker Registration ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.error('Service Worker registration failed: ', err);
        });
    });
  }

  /* ---------- App Initialization ---------- */
  load();
  render();
})();

