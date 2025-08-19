class SplitEaseApp {
    constructor() {
        this.data = {
            trips: [],
            currentTripId: null,
            settings: {
                theme: 'light'
            }
        };
        
        this.currentSection = 'dashboard';
        this.sidebarOpen = false;
        this.categories = [
            "Food & Drinks",
            "Travel & Transport", 
            "Accommodation",
            "Shopping",
            "Entertainment",
            "Other"
        ];
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupTheme();
        this.updateUI();
        this.setupHistoryAPI();
        
        // Load sample data if no trips exist
        if (this.data.trips.length === 0) {
            this.loadSampleData();
        }
        // Ensure UI is updated for the initially loaded section
        this.navigateToSection(this.currentSection, false);
    }

    setupEventListeners() {
        // Hamburger menu toggle for sidebar
        document.getElementById('hamburgerBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleSidebar();
        });

        // Sidebar overlay click to close sidebar
        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            this.closeSidebar();
        });

        // Sidebar navigation links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Theme toggle in header
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Theme toggle in settings section
        document.getElementById('themeToggleSettings').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Trip selector change event
        document.getElementById('currentTripSelector').addEventListener('change', (e) => {
            this.selectTrip(e.target.value);
        });

        // Create trip button and form handling
        document.getElementById('createTripBtn').addEventListener('click', () => {
            this.showCreateTripModal();
        });

        document.getElementById('createTripForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTrip();
        });

        document.getElementById('cancelTripBtn').addEventListener('click', () => {
            this.hideCreateTripModal();
        });

        // Add member button and form handling (now combined for Add/Edit)
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.showMemberModal(); // Show modal for adding
        });

        document.getElementById('memberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMemberFormSubmit(); // New handler for both add/edit
        });

        document.getElementById('cancelMemberBtn').addEventListener('click', () => {
            this.hideMemberModal(); // Hide the unified member modal
        });

        // Add expense form handling (now combined for Add/Edit)
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExpenseFormSubmit(); // New handler for both add/edit
        });

        // Cancel edit expense button
        document.getElementById('cancelEditExpenseBtn').addEventListener('click', () => {
            this.resetExpenseForm();
            this.showToast('Expense edit cancelled.', 'info');
        });

        // Event listener for currency change in trip selector to update expense form symbol
        document.getElementById('currentTripSelector').addEventListener('change', () => {
            this.updateCurrencySymbol();
        });

        // Split Type radio button change event
        document.querySelectorAll('input[name="splitType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateParticipantsSplitUI();
            });
        });
        document.getElementById('expenseAmount').addEventListener('input', () => {
            this.updateParticipantsSplitUI(); // Update when amount changes
        });


        // Export/Import data functionality
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e);
        });

        // Clear All Data button with confirmation
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.showConfirmationModal('Are you sure you want to clear ALL app data? This cannot be undone!', () => {
                this.clearAllData();
            });
        });

        // Close modals on backdrop click
        document.getElementById('createTripModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideCreateTripModal();
            }
        });

        document.getElementById('memberModal').addEventListener('click', (e) => { // Updated ID
            if (e.target === e.currentTarget) {
                this.hideMemberModal(); // Updated ID
            }
        });

        document.getElementById('confirmationModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideConfirmationModal();
            }
        });

        // Set today's date as default for expense form on load
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];

        // Ensure proper sidebar behavior on window resize for larger screens
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024) {
                // If desktop, ensure sidebar is visible and overlay is hidden
                this.sidebarOpen = false; // Reset state
                document.getElementById('sidebar').classList.remove('-translate-x-full');
                document.getElementById('sidebarOverlay').classList.add('hidden');
            } else {
                // If mobile, ensure sidebar is hidden if not explicitly opened
                if (!this.sidebarOpen) {
                    document.getElementById('sidebar').classList.add('-translate-x-full');
                    document.getElementById('sidebarOverlay').classList.add('hidden');
                }
            }
        });
    }

    // Handles browser history navigation (back/forward buttons)
    setupHistoryAPI() {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.section) {
                this.navigateToSection(e.state.section, false); // Do not push state again
            }
        });

        // Replace initial state to ensure consistency
        history.replaceState({ section: this.currentSection }, '', `#${this.currentSection}`);
    }

    // Navigates to a specified section of the app
    navigateToSection(section, pushState = true) {
        // Hide all sections first
        document.querySelectorAll('.section').forEach(s => {
            s.classList.add('hidden');
        });

        // Show the target section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        } else {
            console.error(`Section with ID ${section}Section not found.`);
            // Fallback to dashboard if a section is not found
            this.currentSection = 'dashboard';
            document.getElementById('dashboardSection').classList.remove('hidden');
        }

        // Update active state for sidebar links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update breadcrumb text
        const breadcrumb = document.getElementById('currentSection');
        if (breadcrumb) {
            breadcrumb.textContent = section.charAt(0).toUpperCase() + section.slice(1);
        }

        this.currentSection = section;

        // Push state to browser history if required
        if (pushState) {
            history.pushState({ section }, '', `#${section}`);
        }

        // Close sidebar on mobile after navigation
        if (window.innerWidth < 1024 && this.sidebarOpen) {
            this.closeSidebar();
        }

        // Update data specific to the current section
        this.updateSectionData(section);
    }

    // Updates UI elements specific to the given section
    updateSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.updateDashboard();
                this.renderCategoryChart(); // Render chart on dashboard
                break;
            case 'members':
                this.updateMembersList();
                break;
            case 'expenses':
                this.resetExpenseForm(); // Reset form when navigating to expenses section
                this.updateExpenseForm();
                this.updateExpensesList();
                break;
            case 'balances':
                this.updateBalances();
                break;
            case 'settlements':
                this.updateSettlements();
                break;
            case 'settings':
                // No specific data update needed for settings, but ensures currency symbol is correct
                this.updateCurrencySymbol();
                break;
        }
    }

    // Toggles the visibility of the sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (!this.sidebarOpen) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            this.sidebarOpen = true;
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            this.sidebarOpen = false;
        }
    }

    // Closes the sidebar explicitly
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        this.sidebarOpen = false;
    }

    // Sets up the initial theme based on localStorage or default
    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.data.settings.theme = savedTheme;
        this.applyTheme(savedTheme);
    }

    // Toggles between light and dark themes
    toggleTheme() {
        const newTheme = this.data.settings.theme === 'light' ? 'dark' : 'light';
        this.data.settings.theme = newTheme;
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // Applies the given theme to the HTML document and updates toggle switch UI
    applyTheme(theme) {
        const html = document.documentElement;
        const toggleSlider = document.getElementById('themeToggleSlider');
        const toggleButton = document.getElementById('themeToggleSettings');
        
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-color-scheme', 'dark'); // For explicit dark mode control in CSS
            if (toggleSlider) {
                toggleSlider.classList.remove('translate-x-1');
                toggleSlider.classList.add('translate-x-6');
            }
            if (toggleButton) {
                toggleButton.classList.remove('bg-gray-200');
                toggleButton.classList.add('bg-primary-500');
            }
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-color-scheme', 'light'); // For explicit light mode control in CSS
            if (toggleSlider) {
                toggleSlider.classList.remove('translate-x-6');
                toggleSlider.classList.add('translate-x-1');
            }
            if (toggleButton) {
                toggleButton.classList.remove('bg-primary-500');
                toggleButton.classList.add('bg-gray-200');
            }
        }
    }

    // Loads sample data if no trips are found, useful for first-time users
    loadSampleData() {
        const sampleData = {
            trips: [
                {
                    id: "trip1",
                    name: "Weekend Getaway",
                    currency: "USD",
                    members: [
                        {id: "m1", name: "Alice"},
                        {id: "m2", name: "Bob"},
                        {id: "m3", name: "Charlie"}
                    ],
                    expenses: [
                        {
                            id: "e1",
                            description: "Hotel Room",
                            amount: 300,
                            payerId: "m1",
                            participantIds: ["m1", "m2", "m3"],
                            splitType: "equal",
                            category: "Accommodation",
                            date: "2025-08-15"
                        },
                        {
                            id: "e2", 
                            description: "Dinner",
                            amount: 120,
                            payerId: "m2",
                            participantIds: ["m1", "m2", "m3"],
                            splitType: "equal",
                            category: "Food & Drinks",
                            date: "2025-08-16"
                        },
                        {
                            id: "e3", 
                            description: "Tickets",
                            amount: 60,
                            payerId: "m3",
                            participantIds: ["m1", "m2"],
                            splitType: "equal",
                            category: "Entertainment",
                            date: "2025-08-16"
                        },
                         {
                            id: "e4", 
                            description: "Gas",
                            amount: 50,
                            payerId: "m1",
                            participantIds: ["m1", "m2", "m3"],
                            splitType: "equal",
                            category: "Travel & Transport",
                            date: "2025-08-17"
                        },
                        {
                            id: "e5", 
                            description: "Souvenirs",
                            amount: 80,
                            payerId: "m2",
                            participantIds: ["m2", "m3"],
                            splitType: "equal",
                            category: "Shopping",
                            date: "2025-08-17"
                        }
                    ]
                }
            ],
            currentTripId: "trip1" // Set the sample trip as current
        };

        this.data.trips = sampleData.trips;
        this.data.currentTripId = sampleData.currentTripId;
        this.saveData();
        this.showToast('Sample data loaded!', 'info');
        this.updateUI(); // Ensure UI reflects sample data
    }

    // Loads application data from localStorage
    loadData() {
        const saved = localStorage.getItem('splitease-data');
        if (saved) {
            try {
                this.data = { ...this.data, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error parsing saved data:', e);
                // Optionally clear corrupted data or notify user
                localStorage.removeItem('splitease-data');
                this.showToast('Corrupted data detected and cleared. Starting fresh.', 'error');
            }
        }
    }

    // Saves current application data to localStorage
    saveData() {
        localStorage.setItem('splitease-data', JSON.stringify(this.data));
    }

    // Retrieves the currently selected trip object
    getCurrentTrip() {
        return this.data.trips.find(trip => trip.id === this.data.currentTripId);
    }

    // Updates all major UI components that depend on trip data
    updateUI() {
        this.updateTripSelector();
        this.updateDashboard();
        this.updateExpenseForm(); // Update payer and participants lists
        this.updateExpensesList(); // Update expense history
        this.updateBalances(); // Update balances section
        this.updateSettlements(); // Update settlements section
        this.updateCurrencySymbol(); // Update currency symbol in expense form
    }

    // Populates and updates the trip selection dropdown
    updateTripSelector() {
        const selector = document.getElementById('currentTripSelector');
        // Store current selected value to try and re-select it after update
        const previouslySelectedId = selector.value;
        selector.innerHTML = '<option value="">Select Trip</option>'; 
        
        if (this.data.trips.length === 0) {
            selector.disabled = true;
            selector.innerHTML = '<option value="">No Trips Available</option>';
            this.data.currentTripId = null; 
            this.saveData();
        } else {
            selector.disabled = false;
        }

        this.data.trips.forEach(trip => {
            const option = document.createElement('option');
            option.value = trip.id;
            option.textContent = trip.name;
            selector.appendChild(option);
        });

        // Try to re-select the previously selected trip or fall back
        if (this.data.currentTripId && this.data.trips.some(t => t.id === this.data.currentTripId)) {
            selector.value = this.data.currentTripId;
        } else if (previouslySelectedId && this.data.trips.some(t => t.id === previouslySelectedId)) {
            // If the currentTripId was null/invalid but a previously selected one is valid
            this.data.currentTripId = previouslySelectedId;
            selector.value = previouslySelectedId;
            this.saveData();
        }
        else if (this.data.trips.length > 0) {
            // If no valid current trip, default to the first available trip
            this.data.currentTripId = this.data.trips[0].id;
            selector.value = this.data.currentTripId;
            this.saveData();
        } else {
            // No trips at all
            this.data.currentTripId = null;
        }
        
        this.updateCurrencySymbol(); // Update currency symbol based on the newly selected trip
    }

    // Updates the dashboard statistics and recent expenses list
    updateDashboard() {
        const trip = this.getCurrentTrip();
        
        // Get elements
        const totalExpensesElem = document.getElementById('totalExpenses');
        const totalMembersElem = document.getElementById('totalMembers');
        const yourBalanceElem = document.getElementById('yourBalance');
        const recentExpensesListElem = document.getElementById('recentExpensesList');
        const tripsListElem = document.getElementById('tripsList');
        const categoryChartElem = document.getElementById('categoryChart');


        if (!trip) {
            // Display empty states
            totalExpensesElem.textContent = '$0.00';
            totalMembersElem.textContent = '0';
            yourBalanceElem.textContent = '$0.00';
            
            recentExpensesListElem.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l2-2m0 0l2 2m-2-2V8m5.429 8.429A8 8 0 115.571 6.571M13 10H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1v-6a1 1 0 00-1-1z"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No expenses recorded for this trip yet.</p>
                </div>
            `;
            tripsListElem.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 19.523 5.754 20 7.5 20s3.332-.477 4.5-1.247m0 0V5c2.148 0 3.268.937 4.5 1.253v13C19.832 19.523 21.418 20 23 20s3.332-.477 4.5-1.247"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No trips created yet. Click "Create New Trip" to get started!</p>
                </div>
            `;
            categoryChartElem.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No expenses to display charts.</p>
                </div>
            `;
            return;
        }

        // Calculate and update stats
        const totalExpenses = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        totalExpensesElem.textContent = this.formatCurrency(totalExpenses, trip.currency);
        totalMembersElem.textContent = trip.members.length.toString();

        // Calculate user balance (assuming current user is the first member for simplicity)
        const balances = this.calculateBalances(trip);
        // Find a balance for an existing member, if no members, balance is 0
        const userBalance = trip.members.length > 0 ? (balances[trip.members[0]?.id] || 0) : 0; // Use optional chaining for safety
        yourBalanceElem.textContent = this.formatCurrency(userBalance, trip.currency);

        // Update recent expenses and trips list
        this.updateRecentExpenses(trip);
        this.updateTripsList();
        this.renderCategoryChart(); // Render chart
    }

    // Updates the list of recent expenses on the dashboard
    updateRecentExpenses(trip) {
        const container = document.getElementById('recentExpensesList');
        
        if (!trip.expenses || trip.expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l2-2m0 0l2 2m-2-2V8m5.429 8.429A8 8 0 115.571 6.571M13 10H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1v-6a1 1 0 00-1-1z"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No expenses recorded for this trip yet.</p>
                </div>
            `;
            return;
        }

        // Sort expenses by date descending and take the top 5
        const recentExpenses = [...trip.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        container.innerHTML = recentExpenses.map(expense => {
            const payer = trip.members.find(m => m.id === expense.payerId);
            const categoryClass = expense.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, ''); // Fix for category class generation
            return `
                <div class="expense-item flex items-center justify-between py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-2">
                    <div class="flex-1">
                        <div class="font-medium text-gray-900 dark:text-white">${expense.description}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                            Paid by ${payer?.name || 'Unknown'} • <span class="px-2 py-1 text-xs rounded-full category-${categoryClass}">${expense.category}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold text-gray-900 dark:text-white">${this.formatCurrency(expense.amount, trip.currency)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${new Date(expense.date).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Updates the list of trips on the dashboard and adds click handlers
    updateTripsList() {
        const container = document.getElementById('tripsList');
        
        if (this.data.trips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 19.523 5.754 20 7.5 20s3.332-.477 4.5-1.247m0 0V5c2.148 0 3.268.937 4.5 1.253v13C19.832 19.523 21.418 20 23 20s3.332-.477 4.5-1.247"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No trips created yet. Click "Create New Trip" to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.trips.map(trip => {
            const totalExpenses = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const isActive = trip.id === this.data.currentTripId;
            
            return `
                <div class="trip-card p-4 rounded-lg cursor-pointer mb-2 ${isActive ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'}">
                    <div class="font-medium">${trip.name}</div>
                    <div class="text-sm ${isActive ? 'opacity-90' : 'text-gray-500 dark:text-gray-400'}">
                        ${trip.members.length} members • ${this.formatCurrency(totalExpenses, trip.currency)}
                    </div>
                    <div class="flex justify-end mt-2 space-x-2">
                        <button onclick="event.stopPropagation(); app.deleteTrip('${trip.id}')" class="text-red-300 hover:text-red-100 ${isActive ? 'text-red-200 hover:text-red-50' : 'text-red-500 hover:text-red-700'} p-1 rounded-full" aria-label="Delete trip">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers for selecting trip
        container.querySelectorAll('.trip-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectTrip(card.dataset.tripId);
            });
        });
    }

    // Selects a trip and updates the UI
    selectTrip(tripId) {
        if (this.data.currentTripId === tripId) {
            // If already selected, do nothing
            return;
        }

        const trip = this.data.trips.find(t => t.id === tripId);
        if (trip) {
            this.data.currentTripId = tripId;
            this.saveData();
            this.updateUI(); // Re-render all UI elements
            this.updateSectionData(this.currentSection); // Update the current visible section
            this.showToast(`Switched to "${trip.name}"`, 'success');
        } else if (tripId === "" || !trip) { // Handle "Select Trip" option or if trip not found
            this.data.currentTripId = null;
            this.saveData();
            this.updateUI();
            this.updateSectionData(this.currentSection);
            this.showToast('No trip selected or selected trip not found.', 'info');
        }
    }

    // Deletes a trip after confirmation
    deleteTrip(tripId) {
        this.showConfirmationModal('Are you sure you want to delete this trip and all its data? This cannot be undone!', () => {
            this.executeDeleteTrip(tripId);
        });
    }

    executeDeleteTrip(tripId) {
        const initialTripCount = this.data.trips.length;
        this.data.trips = this.data.trips.filter(trip => trip.id !== tripId);
        
        if (this.data.trips.length < initialTripCount) {
            if (this.data.currentTripId === tripId) {
                // If the deleted trip was the current one, select the first available trip or null
                this.data.currentTripId = this.data.trips.length > 0 ? this.data.trips[0].id : null;
            }
            this.saveData();
            this.updateUI();
            this.showToast('Trip deleted successfully!', 'success');
        } else {
            this.showToast('Failed to delete trip.', 'error');
        }
    }

    // Shows the "Create New Trip" modal
    showCreateTripModal() {
        document.getElementById('createTripModal').classList.remove('hidden');
        document.getElementById('tripName').focus();
    }

    // Hides the "Create New Trip" modal and resets the form
    hideCreateTripModal() {
        document.getElementById('createTripModal').classList.add('hidden');
        document.getElementById('createTripForm').reset();
    }

    // Creates a new trip with provided name and currency
    createTrip() {
        const nameInput = document.getElementById('tripName');
        const currencyInput = document.getElementById('tripCurrency');
        
        const name = nameInput.value.trim();
        const currency = currencyInput.value;

        if (!name) {
            this.showToast('Please enter a trip name', 'error');
            return;
        }

        // Check for duplicate trip names
        if (this.data.trips.some(trip => trip.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('A trip with this name already exists. Please choose a different name.', 'error');
            return;
        }

        const trip = {
            id: 'trip_' + Date.now(), // Unique ID for the trip
            name,
            currency,
            members: [],
            expenses: []
        };

        this.data.trips.push(trip);
        this.data.currentTripId = trip.id; // Make the new trip the current one
        this.saveData();
        this.hideCreateTripModal();
        this.updateUI(); // Re-render UI to show new trip selected
        this.showToast(`Trip "${name}" created!`, 'success');
    }

    // Shows the "Add/Edit Member" modal
    showMemberModal(memberId = null) {
        const trip = this.getCurrentTrip();
        if (!trip) {
            this.showToast('Please create or select a trip first before adding/editing members.', 'warning');
            return;
        }

        const modalTitle = document.getElementById('memberModalTitle');
        const memberNameInput = document.getElementById('memberName');
        const memberIdInput = document.getElementById('memberId');
        const submitMemberBtn = document.getElementById('submitMemberBtn');

        if (memberId) {
            // Edit mode
            const member = trip.members.find(m => m.id === memberId);
            if (member) {
                modalTitle.textContent = 'Edit Member';
                memberNameInput.value = member.name;
                memberIdInput.value = member.id;
                submitMemberBtn.textContent = 'Save Changes';
            } else {
                this.showToast('Member not found!', 'error');
                return;
            }
        } else {
            // Add mode
            modalTitle.textContent = 'Add Member';
            memberNameInput.value = '';
            memberIdInput.value = '';
            submitMemberBtn.textContent = 'Add Member';
        }
        
        document.getElementById('memberModal').classList.remove('hidden');
        memberNameInput.focus();
    }

    // Hides the "Add/Edit Member" modal and resets the form
    hideMemberModal() {
        document.getElementById('memberModal').classList.add('hidden');
        document.getElementById('memberForm').reset();
    }

    // Handles form submission for both adding and editing members
    handleMemberFormSubmit() {
        const memberId = document.getElementById('memberId').value;
        if (memberId) {
            this.editMember();
        } else {
            this.addMember();
        }
    }

    // Adds a new member to the current trip
    addMember() {
        const trip = this.getCurrentTrip();
        if (!trip) return; 

        const nameInput = document.getElementById('memberName');
        const name = nameInput.value.trim();
        if (!name) {
            this.showToast('Please enter a member name', 'error');
            return;
        }

        // Check for duplicate member names within the current trip
        if (trip.members.some(member => member.name.toLowerCase() === name.toLowerCase())) {
            this.showToast(`Member "${name}" already exists in this trip.`, 'error');
            return;
        }

        const member = {
            id: 'member_' + Date.now(), // Unique ID for the member
            name
        };

        trip.members.push(member);
        this.saveData();
        this.hideMemberModal();
        this.updateMembersList(); 
        this.updateExpenseForm(); 
        this.updateBalances(); // Refresh balances
        this.updateSettlements(); // Refresh settlements
        this.showToast(`${name} added to the trip!`, 'success');
    }

    // Edits an existing member's name
    editMember() {
        const trip = this.getCurrentTrip();
        if (!trip) return;

        const memberId = document.getElementById('memberId').value;
        const newName = document.getElementById('memberName').value.trim();

        if (!newName) {
            this.showToast('Member name cannot be empty!', 'error');
            return;
        }

        // Check for duplicate name (excluding the current member being edited)
        if (trip.members.some(m => m.id !== memberId && m.name.toLowerCase() === newName.toLowerCase())) {
            this.showToast(`Member "${newName}" already exists. Please choose a different name.`, 'error');
            return;
        }

        const memberToEdit = trip.members.find(m => m.id === memberId);
        if (memberToEdit) {
            memberToEdit.name = newName;
            this.saveData();
            this.hideMemberModal();
            this.updateMembersList();
            this.updateExpenseForm();
            this.updateBalances();
            this.updateSettlements();
            this.showToast(`Member name updated to "${newName}".`, 'success');
        } else {
            this.showToast('Member not found for editing.', 'error');
        }
    }

    // Updates the list of members in the "Members" section
    updateMembersList() {
        const trip = this.getCurrentTrip();
        const container = document.getElementById('membersList');
        
        if (!trip || trip.members.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h2a2 2 0 002-2V8a2 2 0 00-2-2h-2m-4 5V3a2 2 0 00-2-2H7a2 2 0 00-2 2v8m12 0H5m12 0a2 2 0 012 2v6m-4-6a2 2 0 00-2 2v6m0-4a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2h4"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No members added to this trip yet. Add some to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = trip.members.map(member => `
            <div class="member-item bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 p-3 flex items-center justify-between border border-gray-200 dark:border-gray-700">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center font-medium text-lg mr-3 flex-shrink-0">
                        ${member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white">${member.name}</div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="app.showMemberModal('${member.id}')" class="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150" aria-label="Edit member">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="app.removeMember('${member.id}')" class="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150" aria-label="Remove member">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Removes a member from the current trip after checking for associated expenses
    removeMember(memberId) {
        const trip = this.getCurrentTrip();
        if (!trip) return;

        // Prevent removal if member is a payer or participant in any expense
        const hasExpenses = trip.expenses.some(exp => 
            exp.payerId === memberId || exp.participantIds.includes(memberId)
        );

        if (hasExpenses) {
            this.showToast('Cannot remove member with existing expenses. Please remove their expenses first.', 'error');
            return;
        }

        const memberName = trip.members.find(m => m.id === memberId)?.name;
        this.showConfirmationModal(`Are you sure you want to remove member "${memberName}"?`, () => {
            trip.members = trip.members.filter(m => m.id !== memberId);
            this.saveData();
            this.updateMembersList(); 
            this.updateExpenseForm(); 
            this.updateBalances(); 
            this.updateSettlements(); 
            this.showToast(`Member "${memberName}" removed.`, 'success');
        });
    }

    // Updates the payer and participant dropdowns/checkboxes in the expense form
    updateExpenseForm() {
        const trip = this.getCurrentTrip();
        const payerSelect = document.getElementById('expensePayer');
        const participantsSplitContainer = document.getElementById('participantsSplitContainer');
        const expenseFormElements = document.querySelectorAll('#expenseForm input, #expenseForm select, #expenseForm button[type="submit"]');
        const splitTypeRadios = document.querySelectorAll('input[name="splitType"]');


        if (!trip || trip.members.length === 0) {
            // Disable and show placeholder if no trip or no members
            payerSelect.innerHTML = '<option value="">No members added</option>';
            payerSelect.disabled = true;
            participantsSplitContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No members added to this trip.</p>';
            expenseFormElements.forEach(element => {
                if (element.id !== 'expenseDate') element.disabled = true; // Keep date enabled
            });
            splitTypeRadios.forEach(radio => radio.disabled = true);
            document.getElementById('submitExpenseBtn').disabled = true;
            this.updateCurrencySymbol(); // Keep currency symbol updated even if disabled
            return;
        } else {
            // Enable form elements
            payerSelect.disabled = false;
            expenseFormElements.forEach(element => element.disabled = false);
            splitTypeRadios.forEach(radio => radio.disabled = false);
            document.getElementById('submitExpenseBtn').disabled = false;

        }

        // Populate payer select
        payerSelect.innerHTML = trip.members.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');

        // Update participants split UI based on selected split type
        this.updateParticipantsSplitUI();
        this.updateCurrencySymbol(); // Update currency symbol when members are available
    }

    // Updates the currency symbol displayed next to the amount input based on the current trip's currency
    updateCurrencySymbol() {
        const trip = this.getCurrentTrip();
        const currencySymbolElem = document.getElementById('currencySymbol');
        if (currencySymbolElem) {
            currencySymbolElem.textContent = this.getCurrencySymbol(trip?.currency || 'USD');
        }
    }

    // Dynamically updates the participants split UI based on the selected split type
    updateParticipantsSplitUI(expense = null) {
        const trip = this.getCurrentTrip();
        const container = document.getElementById('participantsSplitContainer');
        const splitType = document.querySelector('input[name="splitType"]:checked').value;
        const totalAmount = parseFloat(document.getElementById('expenseAmount').value) || 0;
        const currencySymbol = this.getCurrencySymbol(trip?.currency || 'USD');
        const feedbackElement = document.getElementById('splitAmountFeedback');

        if (!trip || trip.members.length === 0) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No members added to this trip.</p>';
            feedbackElement.textContent = '';
            return;
        }

        let html = '';
        if (splitType === 'equal') {
            html = trip.members.map(member => `
                <div class="participant-checkbox flex items-center">
                    <input type="checkbox" id="participant_${member.id}" value="${member.id}" 
                           ${expense ? (expense.participantIds.includes(member.id) ? 'checked' : '') : 'checked'} 
                           class="form-checkbox h-4 w-4 text-primary-600 rounded">
                    <label for="participant_${member.id}" class="ml-2 text-gray-700 dark:text-gray-300">${member.name}</label>
                </div>
            `).join('');
            feedbackElement.textContent = '';
        } else if (splitType === 'uneven_amount') {
            let currentTotalSplit = 0;
            html = trip.members.map(member => {
                const memberShare = expense && expense.splitType === 'uneven_amount' && expense.shares ? (expense.shares[member.id] || 0) : 0;
                currentTotalSplit += memberShare;
                return `
                    <div class="flex items-center space-x-2">
                        <label for="share_${member.id}" class="text-gray-700 dark:text-gray-300 w-24">${member.name}</label>
                        <div class="relative flex-1">
                            <span class="currency-symbol absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">${currencySymbol}</span>
                            <input type="number" id="share_${member.id}" data-member-id="${member.id}" 
                                   value="${memberShare.toFixed(2)}" step="0.01" 
                                   class="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white uneven-share-input" 
                                   placeholder="0.00">
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners for input changes to update feedback
            setTimeout(() => { // Use setTimeout to ensure elements are rendered
                document.querySelectorAll('.uneven-share-input').forEach(input => {
                    input.addEventListener('input', () => this.updateSplitAmountFeedback());
                });
                this.updateSplitAmountFeedback(); // Initial feedback update
            }, 0);
        }
        container.innerHTML = html;
    }

    // Updates the feedback message for uneven split amounts
    updateSplitAmountFeedback() {
        const totalAmount = parseFloat(document.getElementById('expenseAmount').value) || 0;
        let currentSplitSum = 0;
        document.querySelectorAll('.uneven-share-input').forEach(input => {
            currentSplitSum += parseFloat(input.value) || 0;
        });

        const remaining = totalAmount - currentSplitSum;
        const feedbackElement = document.getElementById('splitAmountFeedback');
        const currencySymbol = this.getCurrencySymbol(this.getCurrentTrip()?.currency || 'USD');

        if (Math.abs(remaining) < 0.01) { // Allow for tiny floating point inaccuracies
            feedbackElement.textContent = `Total split: ${currencySymbol}${currentSplitSum.toFixed(2)}. All good!`;
            feedbackElement.className = 'text-sm mt-2 text-green-600 dark:text-green-400';
        } else if (remaining > 0) {
            feedbackElement.textContent = `Remaining to split: ${currencySymbol}${remaining.toFixed(2)}`;
            feedbackElement.className = 'text-sm mt-2 text-orange-600 dark:text-orange-400';
        } else {
            feedbackElement.textContent = `Over-split by: ${currencySymbol}${Math.abs(remaining).toFixed(2)}`;
            feedbackElement.className = 'text-sm mt-2 text-red-600 dark:text-red-400';
        }
    }

    // Resets the expense form to its initial state for adding a new expense
    resetExpenseForm() {
        document.getElementById('expenseId').value = '';
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseCategory').value = this.categories[0]; // Default category
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('expensePayer').value = ''; // Reset payer
        
        // Reset split type to 'equal' and update UI
        document.querySelector('input[name="splitType"][value="equal"]').checked = true;
        this.updateParticipantsSplitUI(); // This will re-render participants to checkboxes

        document.getElementById('expenseFormTitle').textContent = 'New Expense';
        document.getElementById('submitExpenseBtn').textContent = 'Add Expense';
        document.getElementById('cancelEditExpenseBtn').classList.add('hidden');
        this.updateExpenseForm(); // Re-populate based on current trip data
    }

    // Handles form submission for both adding and editing expenses
    handleExpenseFormSubmit() {
        const expenseId = document.getElementById('expenseId').value;
        if (expenseId) {
            this.editExpense(expenseId);
        } else {
            this.addExpense();
        }
    }

    // Adds a new expense to the current trip
    addExpense() {
        const trip = this.getCurrentTrip();
        if (!trip) {
            this.showToast('Please create or select a trip first.', 'error');
            return;
        }
        if (trip.members.length === 0) {
            this.showToast('Please add members to the trip before adding expenses.', 'error');
            return;
        }

        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const payerId = document.getElementById('expensePayer').value;
        const date = document.getElementById('expenseDate').value;
        const splitType = document.querySelector('input[name="splitType"]:checked').value;

        // Basic validation
        if (!description) {
            this.showToast('Please enter a description for the expense.', 'error');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            this.showToast('Please enter a valid amount greater than zero.', 'error');
            return;
        }
        if (!payerId) {
            this.showToast('Please select who paid for the expense.', 'error');
            return;
        }

        let participantIds = [];
        let shares = {};

        if (splitType === 'equal') {
            participantIds = Array.from(document.querySelectorAll('#participantsSplitContainer input[type="checkbox"]:checked'))
                .map(input => input.value);
            if (participantIds.length === 0) {
                this.showToast('Please select at least one participant for the expense.', 'error');
                return;
            }
        } else if (splitType === 'uneven_amount') {
            let currentSplitSum = 0;
            const shareInputs = document.querySelectorAll('.uneven-share-input');
            if (shareInputs.length === 0) {
                 this.showToast('Please enter amounts for participants in uneven split.', 'error');
                 return;
            }

            shareInputs.forEach(input => {
                const memberId = input.dataset.memberId;
                const shareAmount = parseFloat(input.value) || 0;
                if (shareAmount > 0) {
                    shares[memberId] = shareAmount;
                    participantIds.push(memberId); // Participants are those with a share > 0
                    currentSplitSum += shareAmount;
                }
            });

            if (participantIds.length === 0) {
                this.showToast('Please enter amounts for at least one participant in uneven split.', 'error');
                return;
            }

            if (Math.abs(currentSplitSum - amount) > 0.01) { // Allow for floating point inaccuracies
                this.showToast(`Uneven split amounts do not sum up to the total amount. Remaining: ${this.formatCurrency(amount - currentSplitSum, trip.currency)}`, 'error');
                return;
            }
        }

        const expense = {
            id: 'expense_' + Date.now(),
            description,
            amount,
            category,
            payerId,
            participantIds,
            splitType,
            shares: splitType === 'uneven_amount' ? shares : null, // Store shares only for uneven split
            date: date || new Date().toISOString().split('T')[0] 
        };

        trip.expenses.push(expense);
        this.saveData();
        
        this.resetExpenseForm(); 
        this.updateExpensesList(); 
        this.updateDashboard(); 
        this.updateBalances(); 
        this.updateSettlements(); 
        this.showToast('Expense added successfully!', 'success');
    }

    // Populates the expense form for editing an existing expense
    populateExpenseFormForEdit(expenseId) {
        const trip = this.getCurrentTrip();
        if (!trip) {
            this.showToast('No trip selected.', 'error');
            return;
        }

        const expense = trip.expenses.find(e => e.id === expenseId);
        if (!expense) {
            this.showToast('Expense not found.', 'error');
            return;
        }

        document.getElementById('expenseId').value = expense.id;
        document.getElementById('expenseDescription').value = expense.description;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expenseCategory').value = expense.category;
        document.getElementById('expensePayer').value = expense.payerId;
        document.getElementById('expenseDate').value = expense.date;

        // Set the correct split type radio button
        document.querySelector(`input[name="splitType"][value="${expense.splitType}"]`).checked = true;
        this.updateParticipantsSplitUI(expense); // Pass expense to pre-fill shares

        document.getElementById('expenseFormTitle').textContent = 'Edit Expense';
        document.getElementById('submitExpenseBtn').textContent = 'Save Changes';
        document.getElementById('cancelEditExpenseBtn').classList.remove('hidden');

        // Navigate to expenses section if not already there
        if (this.currentSection !== 'expenses') {
            this.navigateToSection('expenses');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top of form
        document.getElementById('expenseDescription').focus();
    }

    // Edits an existing expense
    editExpense(expenseId) {
        const trip = this.getCurrentTrip();
        if (!trip) return;

        const expenseToEdit = trip.expenses.find(e => e.id === expenseId);
        if (!expenseToEdit) {
            this.showToast('Expense not found for editing.', 'error');
            return;
        }

        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const payerId = document.getElementById('expensePayer').value;
        const date = document.getElementById('expenseDate').value;
        const splitType = document.querySelector('input[name="splitType"]:checked').value;

        if (!description || isNaN(amount) || amount <= 0 || !payerId) {
            this.showToast('Please fill in all fields correctly.', 'error');
            return;
        }

        let participantIds = [];
        let shares = {};

        if (splitType === 'equal') {
            participantIds = Array.from(document.querySelectorAll('#participantsSplitContainer input[type="checkbox"]:checked'))
                .map(input => input.value);
            if (participantIds.length === 0) {
                this.showToast('Please select at least one participant for the expense.', 'error');
                return;
            }
            shares = null; // Clear shares if switching to equal
        } else if (splitType === 'uneven_amount') {
            let currentSplitSum = 0;
            const shareInputs = document.querySelectorAll('.uneven-share-input');
            if (shareInputs.length === 0) {
                 this.showToast('Please enter amounts for participants in uneven split.', 'error');
                 return;
            }

            shareInputs.forEach(input => {
                const memberId = input.dataset.memberId;
                const shareAmount = parseFloat(input.value) || 0;
                if (shareAmount > 0) {
                    shares[memberId] = shareAmount;
                    participantIds.push(memberId);
                    currentSplitSum += shareAmount;
                }
            });

            if (participantIds.length === 0) {
                this.showToast('Please enter amounts for at least one participant in uneven split.', 'error');
                return;
            }

            if (Math.abs(currentSplitSum - amount) > 0.01) { 
                this.showToast(`Uneven split amounts do not sum up to the total amount. Remaining: ${this.formatCurrency(amount - currentSplitSum, trip.currency)}`, 'error');
                return;
            }
        }

        // Update expense properties
        expenseToEdit.description = description;
        expenseToEdit.amount = amount;
        expenseToEdit.category = category;
        expenseToEdit.payerId = payerId;
        expenseToEdit.participantIds = participantIds;
        expenseToEdit.splitType = splitType;
        expenseToEdit.shares = shares;
        expenseToEdit.date = date;

        this.saveData();
        this.resetExpenseForm();
        this.updateExpensesList();
        this.updateDashboard();
        this.updateBalances();
        this.updateSettlements();
        this.showToast('Expense updated successfully!', 'success');
    }

    // Updates the list of expenses in the "Expense History" section
    updateExpensesList() {
        const trip = this.getCurrentTrip();
        const container = document.getElementById('expensesList');
        
        if (!trip || trip.expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l2-2m0 0l2 2m-2-2V8m5.429 8.429A8 8 0 115.571 6.571M13 10H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1v-6a1 1 0 00-1-1z"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No expenses recorded yet. Add one using the form!</p>
                </div>
            `;
            return;
        }

        // Sort expenses by date descending
        const sortedExpenses = [...trip.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sortedExpenses.map(expense => {
            const payer = trip.members.find(m => m.id === expense.payerId);
            let participantsDisplay = '';
            if (expense.splitType === 'equal') {
                participantsDisplay = expense.participantIds.map(id => 
                    trip.members.find(m => m.id === id)?.name
                ).filter(Boolean).join(', ');
            } else if (expense.splitType === 'uneven_amount' && expense.shares) {
                participantsDisplay = Object.entries(expense.shares).map(([memberId, shareAmount]) => {
                    const memberName = trip.members.find(m => m.id === memberId)?.name;
                    return `${memberName}: ${this.formatCurrency(shareAmount, trip.currency)}`;
                }).join(', ');
            }

            const categoryClass = expense.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '');
            
            return `
                <div class="expense-item border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-medium text-gray-900 dark:text-white">${expense.description}</h4>
                                <span class="px-2 py-1 text-xs rounded-full category-${categoryClass}">
                                    ${expense.category}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Paid by <strong>${payer?.name || 'Unknown'}</strong>
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Split: ${expense.splitType === 'equal' ? 'Equally' : 'Unevenly'} between: ${participantsDisplay}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-500">
                                ${new Date(expense.date).toLocaleDateString()}
                            </p>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <div class="font-bold text-lg text-gray-900 dark:text-white mb-2">
                                ${this.formatCurrency(expense.amount, trip.currency)}
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="app.populateExpenseFormForEdit('${expense.id}')" class="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150" aria-label="Edit expense">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button onclick="app.removeExpense('${expense.id}')" class="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150" aria-label="Remove expense">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Removes an expense from the current trip
    removeExpense(expenseId) {
        const trip = this.getCurrentTrip();
        if (!trip) return;

        this.showConfirmationModal('Are you sure you want to remove this expense?', () => {
            const initialExpenseCount = trip.expenses.length;
            trip.expenses = trip.expenses.filter(e => e.id !== expenseId);
            
            if (trip.expenses.length < initialExpenseCount) {
                this.saveData();
                this.updateExpensesList();
                this.updateDashboard();
                this.updateBalances();
                this.updateSettlements();
                this.showToast('Expense removed.', 'success');
            } else {
                this.showToast('Failed to remove expense.', 'error');
            }
        });
    }

    // Calculates the net balance for each member in a trip
    calculateBalances(trip) {
        const balances = {};
        
        // Initialize balances for all members to 0
        trip.members.forEach(member => {
            balances[member.id] = 0;
        });

        // Process each expense
        trip.expenses.forEach(expense => {
            // Payer gets credited the full amount
            balances[expense.payerId] = (balances[expense.payerId] || 0) + expense.amount;
            
            if (expense.splitType === 'equal') {
                const shareAmount = expense.amount / expense.participantIds.length;
                expense.participantIds.forEach(participantId => {
                    balances[participantId] = (balances[participantId] || 0) - shareAmount;
                });
            } else if (expense.splitType === 'uneven_amount' && expense.shares) {
                Object.entries(expense.shares).forEach(([memberId, shareAmount]) => {
                    balances[memberId] = (balances[memberId] || 0) - shareAmount;
                });
            }
        });

        return balances;
    }

    // Updates the display of individual member balances
    updateBalances() {
        const trip = this.getCurrentTrip();
        const container = document.getElementById('balancesList');
        
        if (!trip || trip.members.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 6v2m0 6v2"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">Add some expenses to see balances here.</p>
                </div>
            `;
            return;
        }

        const balances = this.calculateBalances(trip);
        
        // Sort members to ensure consistent display order
        const sortedMembers = [...trip.members].sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = sortedMembers.map(member => {
            const balance = balances[member.id] || 0;
            // Determine class for styling based on balance (positive, negative, or zero)
            const balanceClass = balance > 0.01 ? 'balance-positive' : balance < -0.01 ? 'balance-negative' : '';
            const statusText = balance > 0.01 ? 'gets back' : balance < -0.01 ? 'owes' : 'is settled';
            
            return `
                <div class="balance-item bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 p-3 flex items-center justify-between border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center font-medium text-lg mr-3 flex-shrink-0">
                            ${member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">${member.name}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">${statusText}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold ${balanceClass}">
                            ${this.formatCurrency(Math.abs(balance), trip.currency)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Calculates the minimum number of transactions to settle all debts
    calculateSettlements(trip) {
        const balances = this.calculateBalances(trip);
        const settlements = [];
        
        const debtors = []; 
        const creditors = []; 
        
        Object.entries(balances).forEach(([memberId, balance]) => {
            if (balance < -0.01) { 
                debtors.push({ id: memberId, amount: Math.abs(balance) });
            } else if (balance > 0.01) { 
                creditors.push({ id: memberId, amount: balance });
            }
        });

        let d = 0; 
        let c = 0; 

        while (d < debtors.length && c < creditors.length) {
            const debtor = debtors[d];
            const creditor = creditors[c];

            const settleAmount = Math.min(debtor.amount, creditor.amount);

            if (settleAmount > 0.01) { 
                settlements.push({
                    from: debtor.id,
                    to: creditor.id,
                    amount: settleAmount
                });
            }
            
            debtor.amount -= settleAmount;
            creditor.amount -= settleAmount;

            if (debtor.amount <= 0.01) {
                d++;
            }
            if (creditor.amount <= 0.01) {
                c++;
            }
        }

        return settlements;
    }

    // Updates the display of settlement suggestions
    updateSettlements() {
        const trip = this.getCurrentTrip();
        const container = document.getElementById('settlementsList');
        
        if (!trip || trip.members.length === 0 || trip.expenses.length === 0) { // Also check for expenses
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.001 12.001 0 002.944 12c.045 4.095 1.777 7.846 4.75 10.432M12 21.056c3.045-.045 5.795-1.777 8.382-4.75A11.955 11.955 0 0021.056 12C20.945 8.09 19.213 4.339 16.24 1.75"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">Add some expenses to see settlements here.</p>
                </div>
            `;
            return;
        }

        const settlements = this.calculateSettlements(trip);
        
        if (settlements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.001 12.001 0 002.944 12c.045 4.095 1.777 7.846 4.75 10.432M12 21.056c3.045-.045 5.795-1.777 8.382-4.75A11.955 11.955 0 0021.056 12C20.945 8.09 19.213 4.339 16.24 1.75"></path></svg>
                    <p class="text-green-600 dark:text-green-400">🎉 Everyone is settled up! No outstanding payments.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = settlements.map(settlement => {
            const fromMember = trip.members.find(m => m.id === settlement.from);
            const toMember = trip.members.find(m => m.id === settlement.to);
            
            return `
                <div class="settlement-item bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 p-3 flex items-center justify-between border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center flex-1">
                        <div class="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-medium text-sm mr-2 flex-shrink-0">
                            ${fromMember?.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-gray-700 dark:text-gray-300 font-medium mr-2">${fromMember?.name}</span>
                        <svg class="w-5 h-5 text-gray-400 mx-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                        <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-medium text-sm mr-2 flex-shrink-0">
                            ${toMember?.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-gray-700 dark:text-gray-300 font-medium">${toMember?.name}</span>
                    </div>
                    <div class="text-lg font-bold text-primary-600 ml-4 flex-shrink-0">
                        ${this.formatCurrency(settlement.amount, trip.currency)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Helper function to get currency symbol
    getCurrencySymbol(currencyCode) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'INR': '₹',
            'JPY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'CHF': 'Fr',
            'CNY': '¥'
        };
        return symbols[currencyCode] || '$'; // Default to $ if not found
    }

    // Formats a number as currency string
    formatCurrency(amount, currency = 'USD') {
        const symbol = this.getCurrencySymbol(currency);
        return `${symbol}${amount.toFixed(2)}`;
    }

    // Renders a bar chart showing spending by category
    renderCategoryChart() {
        const trip = this.getCurrentTrip();
        const chartContainer = document.getElementById('categoryChart');
        
        if (!trip || trip.expenses.length === 0) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
                    <p class="text-gray-500 dark:text-gray-400">No expenses to display charts.</p>
                </div>
            `;
            return;
        }

        const categorySpending = {};
        let maxSpending = 0;

        // Calculate total spending per category
        trip.expenses.forEach(expense => {
            categorySpending[expense.category] = (categorySpending[expense.category] || 0) + expense.amount;
            if (categorySpending[expense.category] > maxSpending) {
                maxSpending = categorySpending[expense.category];
            }
        });

        // Sort categories by spending amount (descending)
        const sortedCategories = Object.entries(categorySpending).sort(([, a], [, b]) => b - a);

        let chartHtml = `<div class="w-full h-full flex flex-col justify-end p-2 md:p-4 relative">`;

        // Bar height scale factor
        const scaleFactor = 100 / (maxSpending || 1); // Max height of 100%

        // Generate bars
        sortedCategories.forEach(([category, amount]) => {
            const barHeight = Math.max(5, (amount * scaleFactor)); // Min height of 5px for visibility
            const categoryClass = category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '');
            chartHtml += `
                <div class="flex items-center mb-2 last:mb-0">
                    <div class="text-xs md:text-sm text-gray-700 dark:text-gray-300 w-24 flex-shrink-0 truncate">${category}</div>
                    <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative ml-2">
                        <div class="h-full rounded-full flex items-center category-${categoryClass} chart-bar" style="width: ${barHeight}%;">
                            <span class="absolute right-2 text-white text-xs font-semibold ${barHeight < 20 ? 'text-gray-800 dark:text-gray-200 left-full ml-1' : ''}">${this.formatCurrency(amount, trip.currency)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        chartHtml += `</div>`;
        chartContainer.innerHTML = chartHtml;
    }

    // Exports all application data as a JSON file
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `splitease-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link); // Append to body to make it clickable in all browsers
        link.click();
        document.body.removeChild(link); // Clean up
        
        this.showToast('All data exported successfully!', 'success');
    }

    // Exports current trip's expenses as a CSV file
    exportCSV() {
        const trip = this.getCurrentTrip();
        if (!trip || trip.expenses.length === 0) {
            this.showToast('No expenses in the current trip to export to CSV.', 'error');
            return;
        }

        const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Paid By', 'Participants'];
        const rows = trip.expenses.map(expense => {
            const payer = trip.members.find(m => m.id === expense.payerId);
            let participantsCsv = '';
            if (expense.splitType === 'equal') {
                participantsCsv = expense.participantIds.map(id => 
                    trip.members.find(m => m.id === id)?.name
                ).filter(Boolean).join('; ');
            } else if (expense.splitType === 'uneven_amount' && expense.shares) {
                participantsCsv = Object.entries(expense.shares).map(([memberId, shareAmount]) => {
                    const memberName = trip.members.find(m => m.id === memberId)?.name;
                    return `${memberName}: ${this.formatCurrency(shareAmount, trip.currency)}`;
                }).join('; ');
            }
            
            return [
                expense.date,
                expense.description,
                expense.category,
                expense.amount,
                trip.currency,
                payer?.name || 'Unknown',
                participantsCsv
            ];
        });

        const csvContent = [
            headers.map(field => `"${field.replace(/"/g, '""')}"`).join(','), // Quote headers and escape existing quotes
            ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')) // Quote fields and escape existing quotes
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${trip.name.replace(/\s+/g, '_')}-expenses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Expenses exported to CSV!', 'success');
    }

    // Imports data from a JSON file, merging or overwriting current data
    importData(event) {
        const file = event.target.files[0];
        if (!file) {
            this.showToast('No file selected for import.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data structure
                if (importedData.trips && Array.isArray(importedData.trips) &&
                    (importedData.settings === undefined || typeof importedData.settings === 'object')) {
                    
                    // Merge or replace based on complexity. For simplicity, we'll replace the core 'trips' and update settings.
                    this.data.trips = importedData.trips;
                    if (importedData.currentTripId && importedData.trips.some(t => t.id === importedData.currentTripId)) {
                        this.data.currentTripId = importedData.currentTripId;
                    } else if (this.data.trips.length > 0) {
                        this.data.currentTripId = this.data.trips[0].id; 
                    } else {
                        this.data.currentTripId = null;
                    }

                    if (importedData.settings) {
                        this.data.settings = { ...this.data.settings, ...importedData.settings };
                    }

                    this.saveData();
                    this.updateUI();
                    this.showToast('Data imported successfully!', 'success');
                } else {
                    this.showToast('Invalid file format. Please import a valid SplitEase JSON export.', 'error');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                this.showToast('Error reading or parsing file. Please ensure it\'s a valid JSON.', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input to allow re-importing the same file
    }

    // Clears all stored application data
    clearAllData() {
        localStorage.removeItem('splitease-data');
        this.data = {
            trips: [],
            currentTripId: null,
            settings: {
                theme: 'light' // Keep theme settings
            }
        };
        this.saveData();
        this.updateUI();
        this.showToast('All app data cleared successfully. Starting fresh!', 'success');
        this.loadSampleData(); // Load sample data after clearing
    }

    // Displays a toast notification
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.error('Toast container not found!');
            return;
        }
        
        const toast = document.createElement('div');
        
        const bgColors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.className = `toast px-4 py-3 rounded-lg text-white ${bgColors[type]} shadow-lg max-w-sm`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds with a fade-out animation
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300); // Duration of the removing animation
        }, 3000);
    }

    // Shows a generic confirmation modal
    showConfirmationModal(message, callback) {
        const modal = document.getElementById('confirmationModal');
        const messageElem = document.getElementById('confirmationMessage');
        const confirmBtn = document.getElementById('confirmActionBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        messageElem.textContent = message;
        modal.classList.remove('hidden');

        // Remove previous event listeners to prevent multiple calls
        confirmBtn.onclick = null; // Clear existing handler
        cancelBtn.onclick = null; // Clear existing handler

        const newConfirmHandler = () => {
            callback();
            this.hideConfirmationModal();
        };

        const newCancelHandler = () => {
            this.hideConfirmationModal();
        };

        confirmBtn.addEventListener('click', newConfirmHandler, { once: true }); // Use { once: true } for auto-cleanup
        cancelBtn.addEventListener('click', newCancelHandler, { once: true });
    }

    // Hides the generic confirmation modal
    hideConfirmationModal() {
        document.getElementById('confirmationModal').classList.add('hidden');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SplitEaseApp();
});

// Service Worker for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
