const STORAGE_KEY = 'uti_business_platform';

const appState = {
  currentUserId: null,
  users: [],
  transactions: [],
  messages: [],
  alerts: [],
  invoices: [],
  company: {
    name: 'Under The Influenza',
    bankName: '',
    bankNumber: '',
    bankHolder: '',
    linked: false,
  },
  podcast: {
    episodes: 28,
    guests: 17,
    pendingApproval: 4,
    productionStatus: 'On schedule',
  },
};

const ui = {
  startup: document.getElementById('startup'),
  app: document.getElementById('app'),
  authScreen: document.getElementById('authScreen'),
  dashboardScreen: document.getElementById('dashboardScreen'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  loginPhone: document.getElementById('loginPhone'),
  loginPassword: document.getElementById('loginPassword'),
  regName: document.getElementById('regName'),
  regSurname: document.getElementById('regSurname'),
  regPhone: document.getElementById('regPhone'),
  regEmail: document.getElementById('regEmail'),
  regBusinessCard: document.getElementById('regBusinessCard'),
  regPassword: document.getElementById('regPassword'),
  regOtp: document.getElementById('regOtp'),
  otpStatus: document.getElementById('otpStatus'),
  userBadge: document.getElementById('userBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  statsGrid: document.getElementById('statsGrid'),
  overviewContent: document.getElementById('overviewContent'),
  alertsList: document.getElementById('alertsList'),
  usersList: document.getElementById('usersList'),
  messagesList: document.getElementById('messagesList'),
  transactionsList: document.getElementById('transactionsList'),
  invoicesList: document.getElementById('invoicesList'),
  companyStatus: document.getElementById('companyStatus'),
  podcastStats: document.getElementById('podcastStats'),
  messageInput: document.getElementById('messageInput'),
  bankName: document.getElementById('bankName'),
  bankNumber: document.getElementById('bankNumber'),
  bankHolder: document.getElementById('bankHolder'),
  toast: document.getElementById('toast'),
};

let otpCode = '';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    seedState();
    saveState();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    Object.assign(appState, parsed);
  } catch (error) {
    seedState();
    saveState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function seedState() {
  appState.users = [
    {
      id: 'u-admin',
      fullName: 'Lerato',
      surname: 'Mokoena',
      phone: '0712345678',
      email: 'admin@undertheinfluenza.com',
      password: 'admin123',
      role: 'Admin',
      status: 'active',
      locked: false,
      failedAttempts: 0,
      lastLogin: '2026-09-20 08:30',
      businessCard: 'https://businesscard.example/lerato',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-finance',
      fullName: 'Aphiwe',
      surname: 'Ndlovu',
      phone: '0823456789',
      email: 'finance@undertheinfluenza.com',
      password: 'finance123',
      role: 'Finance Manager',
      status: 'active',
      locked: false,
      failedAttempts: 0,
      lastLogin: '2026-09-17 14:10',
      businessCard: 'https://businesscard.example/aphiwe',
      createdAt: new Date().toISOString(),
    },
  ];

  appState.transactions = [
    {
      id: 'tx-101',
      title: 'Podcast sponsorship payment',
      amount: 2500,
      vendor: 'BlueWave Media',
      status: 'pending',
      createdBy: 'Lerato Mokoena',
      createdAt: '2026-09-21',
      requiredApprovals: 2,
      approvals: ['Lerato Mokoena'],
    },
    {
      id: 'tx-102',
      title: 'Guest booking deposit',
      amount: 1800,
      vendor: 'The Studio Co',
      status: 'approved',
      createdBy: 'Aphiwe Ndlovu',
      createdAt: '2026-09-20',
      requiredApprovals: 2,
      approvals: ['Lerato Mokoena', 'Aphiwe Ndlovu'],
    },
  ];

  appState.messages = [
    {
      from: 'System',
      to: 'All users',
      text: 'Welcome to Under The Influenza. Please confirm campaign approvals on the dashboard.',
      time: new Date().toISOString(),
    },
  ];

  appState.alerts = [
    {
      id: 'alert-1',
      type: 'info',
      text: 'Weekly finance reconciliation due tomorrow.',
      time: new Date().toISOString(),
    },
  ];

  appState.invoices = [
    {
      id: 'inv-1',
      title: 'Episode 24 Production Invoice',
      uploadedBy: 'Lerato Mokoena',
      fileName: 'episode-24-invoice.pdf',
      date: '2026-09-21',
    },
  ];

  appState.company = {
    name: 'Under The Influenza',
    bankName: 'FNB Business',
    bankNumber: '6267895412',
    bankHolder: 'Under The Influenza Pty Ltd',
    linked: true,
  };

  appState.podcast = {
    episodes: 28,
    guests: 17,
    pendingApproval: 4,
    productionStatus: 'On schedule',
  };
}

function showStartup() {
  ui.startup.classList.remove('hidden');
  ui.app.classList.add('hidden');
  setTimeout(() => {
    ui.startup.classList.add('hidden');
    ui.app.classList.remove('hidden');
    renderAuthForm();
  }, 2600);
}

function renderAuthForm() {
  const current = appState.currentUserId;
  if (current) {
    ui.authScreen.classList.add('hidden');
    ui.dashboardScreen.classList.add('active-screen');
    return;
  }

  ui.authScreen.classList.remove('hidden');
  ui.dashboardScreen.classList.remove('active-screen');
}

function setAuthTab(type) {
  const forms = document.querySelectorAll('.auth-form');
  const toggles = document.querySelectorAll('.auth-toggle');
  forms.forEach((form) => form.classList.toggle('active-form', form.id === (type === 'login' ? 'loginForm' : 'registerForm')));
  toggles.forEach((btn) => btn.classList.toggle('active', btn.dataset.auth === type));
}

function renderStats() {
  const totalUsers = appState.users.length;
  const activeUsers = appState.users.filter((user) => user.status === 'active' && !user.locked).length;
  const pendingTx = appState.transactions.filter((tx) => tx.status === 'pending').length;
  const docs = appState.invoices.length;

  const stats = [
    { label: 'Total Users', value: totalUsers },
    { label: 'Active Users', value: activeUsers },
    { label: 'Pending Tx', value: pendingTx },
    { label: 'Invoices', value: docs },
  ];

  ui.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <div class="stat-card">
          <div class="label">${stat.label}</div>
          <div class="value">${stat.value}</div>
        </div>
      `
    )
    .join('');
}

function renderOverview() {
  const user = getCurrentUser();
  ui.overviewContent.innerHTML = `
    <div class="content-grid two-grid">
      <div>
        <h4>Company Summary</h4>
        <p class="list-small">Company: ${appState.company.name}</p>
        <p class="list-small">Bank Account: ${appState.company.linked ? 'Linked and active' : 'Not linked yet'}</p>
        <p class="list-small">Account Manager: ${user ? user.fullName + ' ' + user.surname : 'N/A'}</p>
      </div>
      <div>
        <h4>Podcast Health</h4>
        <p class="list-small">Episodes: ${appState.podcast.episodes}</p>
        <p class="list-small">Guests: ${appState.podcast.guests}</p>
        <p class="list-small">Production Status: ${appState.podcast.productionStatus}</p>
      </div>
    </div>
  `;
}

function renderAlerts() {
  if (!appState.alerts.length) {
    ui.alertsList.innerHTML = '<div class="alert-item info"><div>No alerts right now.</div></div>';
    return;
  }

  ui.alertsList.innerHTML = appState.alerts
    .slice()
    .reverse()
    .map(
      (alert) => `
        <div class="alert-item ${alert.type}">
          <span>${alert.text}</span>
          <span class="alert-tag ${alert.type}">${alert.type}</span>
        </div>
      `
    )
    .join('');
}

function renderUsers() {
  ui.usersList.innerHTML = appState.users
    .map(
      (user) => `
        <div class="user-item">
          <div class="user-meta">
            <strong>${user.fullName} ${user.surname}</strong>
            <small>${user.role}</small>
            <small>Last login: ${user.lastLogin || 'Never'}</small>
          </div>
          <span class="status-pill ${user.locked ? 'locked' : user.status}">${user.locked ? 'Blocked' : user.status}</span>
        </div>
      `
    )
    .join('');
}

function renderMessages() {
  ui.messagesList.innerHTML = appState.messages
    .slice()
    .reverse()
    .map(
      (message) => `
        <div class="message-item">
          <strong>${message.from} → ${message.to}</strong>
          <span>${message.text}</span>
          <small class="list-small">${new Date(message.time).toLocaleString()}</small>
        </div>
      `
    )
    .join('');
}

function renderTransactions() {
  ui.transactionsList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${appState.transactions
          .map(
            (tx) => `
              <tr>
                <td>
                  <strong>${tx.title}</strong><br />
                  <small class="list-small">${tx.vendor}</small>
                </td>
                <td>R ${Number(tx.amount).toLocaleString()}</td>
                <td><span class="status-pill ${tx.status === 'pending' ? 'pending' : 'active'}">${tx.status}</span></td>
                <td>
                  <div class="action-row">
                    <button class="action-btn approve-btn" data-approve="${tx.id}">Approve</button>
                    <button class="action-btn reject-btn" data-reject="${tx.id}">Reject</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderInvoices() {
  ui.invoicesList.innerHTML = appState.invoices
    .map(
      (invoice) => `
        <div class="invoice-item">
          <strong>${invoice.title}</strong>
          <small class="list-small">Uploaded by ${invoice.uploadedBy} on ${invoice.date}</small>
          <small class="list-small">File: ${invoice.fileName}</small>
        </div>
      `
    )
    .join('');
}

function renderCompanyStatus() {
  const statusText = appState.company.linked
    ? `Business account linked with ${appState.company.bankName}`
    : 'No business account linked yet.';

  ui.companyStatus.textContent = statusText;
  ui.bankName.value = appState.company.bankName || '';
  ui.bankNumber.value = appState.company.bankNumber || '';
  ui.bankHolder.value = appState.company.bankHolder || '';
}

function renderPodcastStats() {
  ui.podcastStats.innerHTML = `
    <div class="podcast-metric">
      <div class="label">Episodes</div>
      <div class="value">${appState.podcast.episodes}</div>
    </div>
    <div class="podcast-metric">
      <div class="label">Guests</div>
      <div class="value">${appState.podcast.guests}</div>
    </div>
    <div class="podcast-metric">
      <div class="label">Pending Approvals</div>
      <div class="value">${appState.podcast.pendingApproval}</div>
    </div>
    <div class="podcast-metric">
      <div class="label">Production</div>
      <div class="value">${appState.podcast.productionStatus}</div>
    </div>
  `;
}

function renderDashboard() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    renderAuthForm();
    return;
  }

  ui.userBadge.textContent = `${currentUser.fullName} ${currentUser.surname} (${currentUser.role})`;
  ui.authScreen.classList.add('hidden');
  ui.dashboardScreen.classList.add('active-screen');
  renderStats();
  renderOverview();
  renderAlerts();
  renderUsers();
  renderMessages();
  renderTransactions();
  renderInvoices();
  renderCompanyStatus();
  renderPodcastStats();
}

function getCurrentUser() {
  return appState.users.find((user) => user.id === appState.currentUserId) || null;
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => ui.toast.classList.remove('show'), 2500);
}

function addAlert(text, type = 'info') {
  appState.alerts.push({
    id: `alert-${Date.now()}`,
    type,
    text,
    time: new Date().toISOString(),
  });
  renderAlerts();
  saveState();
}

function addMessage(from, to, text) {
  appState.messages.push({
    from,
    to,
    text,
    time: new Date().toISOString(),
  });
  renderMessages();
  saveState();
}

function generateOtp() {
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  ui.otpStatus.textContent = `OTP sent: ${otpCode}`;
  showToast('OTP generated. Use the code in the form to create your profile.');
}

function handleRegister(event) {
  event.preventDefault();

  const fullName = ui.regName.value.trim();
  const surname = ui.regSurname.value.trim();
  const phone = ui.regPhone.value.trim();
  const email = ui.regEmail.value.trim();
  const businessCard = ui.regBusinessCard.value.trim();
  const password = ui.regPassword.value.trim();
  const otp = ui.regOtp.value.trim();

  if (!fullName || !surname || !phone || !email || !password) {
    showToast('Please complete all required profile fields.');
    return;
  }

  if (otp !== otpCode || !otpCode) {
    showToast('Invalid OTP. Please generate and enter the correct OTP.');
    return;
  }

  const existingUser = appState.users.find((user) => user.phone === phone || user.email === email);
  if (existingUser) {
    showToast('This cellphone number or email is already registered.');
    return;
  }

  const newUser = {
    id: `u-${Date.now()}`,
    fullName,
    surname,
    phone,
    email,
    password,
    role: 'Team Member',
    status: 'active',
    locked: false,
    failedAttempts: 0,
    lastLogin: '',
    businessCard,
    createdAt: new Date().toISOString(),
  };

  appState.users.push(newUser);
  appState.currentUserId = newUser.id;
  newUser.lastLogin = new Date().toLocaleString();
  addMessage('System', 'All users', `New profile created for ${newUser.fullName} ${newUser.surname}. Welcome to Under The Influenza.`);
  addAlert(`New user profile created for ${newUser.fullName} ${newUser.surname}.`, 'info');
  saveState();
  renderDashboard();
  showToast('WELCOME TO UNDER THE INFLUENZA');
  ui.registerForm.reset();
  ui.otpStatus.textContent = 'OTP not sent yet';
  otpCode = '';
}

function handleLogin(event) {
  event.preventDefault();

  const phone = ui.loginPhone.value.trim();
  const password = ui.loginPassword.value.trim();

  const user = appState.users.find((item) => item.phone === phone);

  if (!user) {
    showToast('User not found. Please check your cellphone number.');
    return;
  }

  if (user.locked) {
    showToast('This account has been blocked after repeated failed attempts.');
    return;
  }

  if (user.password !== password) {
    const today = getTodayKey();
    if (!user.lastAttempt || user.lastAttempt.slice(0, 10) !== today) {
      user.failedAttempts = 0;
    }
    user.failedAttempts += 1;
    user.lastAttempt = new Date().toISOString();

    if (user.failedAttempts >= 3) {
      user.locked = true;
      user.status = 'locked';
      addAlert(`Unauthorized login attempt detected on ${user.phone}. User account has been blocked.`, 'security');
      addMessage('System', 'All users', `Unauthorized access alert: ${user.phone} has reached 3 failed attempts and has been blocked.`);
      showToast('3 failed attempts. Account blocked and all users have been alerted.');
      saveState();
      renderDashboard();
      return;
    }

    showToast(`Incorrect password. ${3 - user.failedAttempts} attempt(s) remaining before lockout.`);
    saveState();
    return;
  }

  user.failedAttempts = 0;
  user.lastLogin = new Date().toLocaleString();
  user.status = 'active';
  user.locked = false;
  appState.currentUserId = user.id;
  saveState();
  renderDashboard();
  showToast('WELCOME TO UNDER THE INFLUENZA');
  addMessage('System', 'All users', `${user.fullName} ${user.surname} has logged in successfully.`);
}

function handleLogout() {
  appState.currentUserId = null;
  renderAuthForm();
  ui.loginForm.reset();
  ui.registerForm.reset();
  ui.otpStatus.textContent = 'OTP not sent yet';
  otpCode = '';
  showToast('Logged out successfully.');
}

function handleTransactionAction(event) {
  const approveId = event.target.dataset.approve;
  const rejectId = event.target.dataset.reject;
  const tx = appState.transactions.find((item) => item.id === (approveId || rejectId));
  if (!tx) return;

  if (approveId) {
    tx.status = 'approved';
    tx.approvals.push(getCurrentUser().fullName + ' ' + getCurrentUser().surname);
    addAlert(`Transaction approved: ${tx.title}`, 'info');
    showToast('Transaction approved successfully.');
  }

  if (rejectId) {
    tx.status = 'rejected';
    addAlert(`Transaction rejected: ${tx.title}`, 'security');
    showToast('Transaction rejected.');
  }

  saveState();
  renderDashboard();
}

function handleInvoiceUpload(event) {
  event.preventDefault();
  const title = document.getElementById('invoiceTitle').value.trim();
  const fileInput = document.getElementById('invoiceFile');
  const fileName = fileInput.files && fileInput.files[0] ? fileInput.files[0].name : 'uploaded-document.pdf';

  if (!title) {
    showToast('Please enter an invoice or document title.');
    return;
  }

  const currentUser = getCurrentUser();
  appState.invoices.push({
    id: `inv-${Date.now()}`,
    title,
    uploadedBy: `${currentUser.fullName} ${currentUser.surname}`,
    fileName,
    date: new Date().toISOString().slice(0, 10),
  });

  appState.podcast.pendingApproval += 1;
  addAlert(`New invoice uploaded: ${title}. Awaiting approval.`, 'info');
  saveState();
  renderDashboard();
  event.target.reset();
  showToast('Document uploaded successfully.');
}

function handleBankLink(event) {
  event.preventDefault();
  appState.company.bankName = ui.bankName.value.trim();
  appState.company.bankNumber = ui.bankNumber.value.trim();
  appState.company.bankHolder = ui.bankHolder.value.trim();
  appState.company.linked = Boolean(appState.company.bankName && appState.company.bankNumber && appState.company.bankHolder);

  if (!appState.company.linked) {
    showToast('Please fill in all bank account fields to link the business account.');
    return;
  }

  addAlert(`Business bank account linked for ${appState.company.name}.`, 'info');
  saveState();
  renderDashboard();
  showToast('Business account linked successfully.');
}

function handleSendMessage() {
  const message = ui.messageInput.value.trim();
  if (!message) return;

  const user = getCurrentUser();
  addMessage(user.fullName + ' ' + user.surname, 'All users', message);
  ui.messageInput.value = '';
}

function setupEvents() {
  document.querySelectorAll('.auth-toggle').forEach((btn) => {
    btn.addEventListener('click', () => setAuthTab(btn.dataset.auth));
  });

  ui.loginForm.addEventListener('submit', handleLogin);
  ui.registerForm.addEventListener('submit', handleRegister);
  ui.logoutBtn.addEventListener('click', handleLogout);
  ui.sendOtpBtn = document.getElementById('sendOtpBtn');
  ui.sendOtpBtn.addEventListener('click', generateOtp);
  document.getElementById('refreshDataBtn').addEventListener('click', renderDashboard);
  document.getElementById('sendMessageBtn').addEventListener('click', handleSendMessage);
  document.getElementById('invoiceForm').addEventListener('submit', handleInvoiceUpload);
  document.getElementById('bankAccountForm').addEventListener('submit', handleBankLink);
  document.getElementById('transactionsList').addEventListener('click', (event) => {
    if (event.target.matches('[data-approve]')) {
      const id = event.target.dataset.approve;
      const tx = appState.transactions.find((item) => item.id === id);
      if (tx) {
        tx.status = 'approved';
        addAlert(`Transaction approved: ${tx.title}`, 'info');
        showToast('Transaction approved successfully.');
        saveState();
        renderDashboard();
      }
    }

    if (event.target.matches('[data-reject]')) {
      const id = event.target.dataset.reject;
      const tx = appState.transactions.find((item) => item.id === id);
      if (tx) {
        tx.status = 'rejected';
        addAlert(`Transaction rejected: ${tx.title}`, 'security');
        showToast('Transaction rejected.');
        saveState();
        renderDashboard();
      }
    }
  });

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function init() {
  loadState();
  setupEvents();
  showStartup();
  renderDashboard();
}

init();
