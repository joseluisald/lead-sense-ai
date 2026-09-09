import { api } from "@/lib/eden.ts";

export default function initAlpineStores(Alpine) {
  const emptyStats = {
    totalLeads: 0,
    verifiedLeads: 0,
    avgScore: 0,
    conversionRate: 0,
    probStats: [
      { name: 'HIGH', value: 0 },
      { name: 'MEDIUM', value: 0 },
      { name: 'LOW', value: 0 }
    ],
    dailyTrends: []
  };

  // --- ROOT STORE ---
  Alpine.data('leadSense', () => ({
    stats: structuredClone(emptyStats),
    apiStatus: 'Offline',
    loadingStats: false,

    get totalLeads() {
      return this.stats.totalLeads;
    },

    async init() {
      await this.fetchStats();
    },

    async fetchStats() {
      this.loadingStats = true;
      try {
        const { data, error } = await api.api.v1.stats.get();

        if (!error && data) {
          this.stats = {
            totalLeads: Number(data.totalLeads || 0),
            verifiedLeads: Number(data.verifiedLeads || 0),
            avgScore: Number(data.avgScore || 0),
            conversionRate: Math.min(Math.max(Number(data.conversionRate || 0), 0), 100),
            probStats: Array.isArray(data.probStats) ? data.probStats : emptyStats.probStats,
            dailyTrends: Array.isArray(data.dailyTrends) ? data.dailyTrends : []
          };
          this.apiStatus = 'Online';
        } else {
          this.stats = structuredClone(emptyStats);
          this.apiStatus = 'Offline';
        }
      } catch (err) {
        console.error('Falha ao conectar com o Backend Elysia:', err);
        this.stats = structuredClone(emptyStats);
        this.apiStatus = 'Offline';
      } finally {
        this.loadingStats = false;
      }
    },
  }));

  // --- SIDEBAR ---
  Alpine.data('sidebar', (initialSettingsOpen = false) => ({
    sidebarOpen: false,
    settingsOpen: initialSettingsOpen,
    userMenuOpen: false,
    user: { name: 'Administrador', email: '' },

    get userAvatar() {
      if (this.user.avatar) return this.user.avatar;

      const name = this.user.name || 'Admin';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=147cc0&color=fff`;
    },

    async init() {
      if (window.innerWidth >= 1024) {
        this.sidebarOpen = true;
      }

      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        try {
          this.user = { ...this.user, ...JSON.parse(storedUser) };
        } catch (e) {
          console.error('Erro ao processar dados do usuário:', e);
        }
      }
    },

    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
      if (!this.sidebarOpen) {
        this.userMenuOpen = false;
      }
    },

    toggleSettings() {
      this.settingsOpen = !this.settingsOpen;
      if (!this.sidebarOpen) {
        this.sidebarOpen = true;
      }
    },

    toggleUserMenu() {
      this.userMenuOpen = !this.userMenuOpen;
    },

    closeUserMenu() {
      this.userMenuOpen = false;
    },

    logout() {
      localStorage.removeItem('user');

      // Deleta o cookie setando a data de expiração pro passado
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      window.location.href = '/login';
    }
  }));

  // --- DASHBOARD ---
  Alpine.data('dashboard', () => ({
    leads: [],
    loadingLeads: true,

    async init() {
      await this.loadLeads();
    },

    async loadLeads() {
      this.loadingLeads = true;

      try {
        const { data, error } = await api.api.v1.leads.get();
        if (error) throw new Error('Falha ao carregar leads');

        this.leads = Array.isArray(data) ? data.slice(0, 5) : Array.isArray(data?.leads) ? data.leads.slice(0, 5) : [];
      } catch {
        this.leads = [];
      } finally {
        this.loadingLeads = false;
      }
    },

    get recentTrend() {
      return this.stats.dailyTrends.slice(-7);
    },

    get trendPoints() {
      const trend = this.recentTrend;
      if (!trend.length) return '';
      const max = Math.max(...trend.map((day) => Number(day.verified || 0) + Number(day.unverified || 0)), 1);

      return trend.map((day, index) => {
        const x = trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100;
        const total = Number(day.verified || 0) + Number(day.unverified || 0);
        const y = 94 - (total / max) * 78;
        return `${x},${y}`;
      }).join(' ');
    },

    formatDate(value) {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return 'Data indisponível';
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
    },

    statusLabel(status) {
      return {
        verified: 'Verificado',
        pending_verification: 'Pendente',
        rejected: 'Rejeitado'
      }[status] || status;
    },

    statusClass(status) {
      if (status === 'verified') return 'bg-cyan-500/10 text-cyan-400';
      if (status === 'rejected') return 'bg-red-500/10 text-red-400';
      return 'bg-amber-500/10 text-amber-400';
    },

    probabilityDotClass(name) {
      if (name === 'HIGH') return 'bg-cyan-500';
      if (name === 'MEDIUM') return 'bg-amber-400';
      return 'bg-red-400';
    },

    probabilityColorClass(name) {
      if (name === 'HIGH') return 'bg-cyan-500';
      if (name === 'MEDIUM') return 'bg-amber-400';
      return 'bg-red-400';
    },

    probabilityLabel(name) {
      return { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }[name] || name;
    },

    probabilityWidth(value) {
      const ratio = this.stats.totalLeads > 0 ? Number(value) / this.stats.totalLeads : 0;
      if (ratio >= 0.75) return 'w-full';
      if (ratio >= 0.5) return 'w-3/4';
      if (ratio >= 0.25) return 'w-1/2';
      if (ratio > 0) return 'w-1/4';
      return 'w-0';
    }
  }));

  // --- LEADS ---
  Alpine.data('leads', () => ({
    leads: [],
    loading: true,
    apiOnline: false,
    searchTerm: '',
    statusFilter: 'all',
    sortBy: 'newest',
    selectedLead: null,

    async init() {
      await this.loadLeads();
    },

    async loadLeads() {
      this.loading = true;

      try {
        const { data, error } = await api.api.v1.leads.get();
        if (error) throw new Error('API unavailable');

        this.leads = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : [];
        this.apiOnline = true;
      } catch {
        this.leads = [];
        this.apiOnline = false;
      } finally {
        this.loading = false;
      }
    },

    get filteredLeads() {
      const query = this.searchTerm.trim().toLowerCase();

      return this.leads
          .filter((lead) => {
            const matchesStatus = this.statusFilter === 'all' || lead.status === this.statusFilter;
            const searchableText = [lead.name, lead.email, lead.clientName, lead.phone].filter(Boolean).join(' ').toLowerCase();
            return matchesStatus && (!query || searchableText.includes(query));
          })
          .sort((firstLead, secondLead) => {
            if (this.sortBy === 'score') return Number(secondLead.score || 0) - Number(firstLead.score || 0);
            return new Date(String(secondLead.createdAt)).getTime() - new Date(String(firstLead.createdAt)).getTime();
          });
    },

    get verifiedCount() { return this.leads.filter((lead) => lead.status === 'verified').length; },
    get pendingCount() { return this.leads.filter((lead) => lead.status === 'pending_verification').length; },
    get rejectedCount() { return this.leads.filter((lead) => lead.status === 'rejected').length; },

    formatDate(value) {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return 'Data indisponível';
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    },

    statusLabel(status) { return { verified: 'Verificado', pending_verification: 'Pendente', rejected: 'Rejeitado' }[status] || 'Sem status'; },
    statusClass(status) {
      if (status === 'verified') return 'bg-cyan-500/10 text-cyan-400';
      if (status === 'rejected') return 'bg-red-500/10 text-red-400';
      return 'bg-amber-500/10 text-amber-400';
    },
    scoreClass(score) {
      const value = Number(score || 0);
      if (value >= 75) return 'text-blue-600';
      if (value >= 50) return 'text-amber-600';
      return 'text-slate-500';
    },

    openLead(lead) { this.selectedLead = lead; }
  }));

  // --- CLIENTS ---
  Alpine.data('clients', () => ({
    clients: [],
    loading: true,
    apiOnline: false,
    searchTerm: '',
    sortBy: 'newest',
    selectedClient: null,

    async init() {
      await this.loadClients();
    },

    async loadClients() {
      this.loading = true;

      try {
        const { data, error } = await api.api.v1.clients.get();
        if (error) throw new Error('API unavailable');

        this.clients = Array.isArray(data) ? data : Array.isArray(data?.clients) ? data.clients : [];
        this.apiOnline = true;
      } catch {
        this.clients = [];
        this.apiOnline = false;
      } finally {
        this.loading = false;
      }
    },

    get filteredClients() {
      const query = this.searchTerm.trim().toLowerCase();

      return this.clients
          .filter((client) => {
            const searchableText = [client.name, client.email, client.company, client.phone].filter(Boolean).join(' ').toLowerCase();
            return !query || searchableText.includes(query);
          })
          .sort((firstClient, secondClient) => {
            if (this.sortBy === 'name') return this.clientName(firstClient).localeCompare(this.clientName(secondClient), 'pt-BR');
            return new Date(String(secondClient.createdAt)).getTime() - new Date(String(firstClient.createdAt)).getTime();
          });
    },

    get activeCount() { return this.clients.filter((client) => !['inactive', 'disabled', 'blocked'].includes(String(client.status).toLowerCase())).length; },
    get leadsCount() { return this.clients.reduce((total, client) => total + this.clientLeadCount(client), 0); },

    clientName(client) { return client.name || client.company || 'Cliente sem nome'; },
    clientLeadCount(client) {
      if (client.leadsCount !== undefined) return Number(client.leadsCount || 0);
      if (client.totalLeads !== undefined) return Number(client.totalLeads || 0);
      return Array.isArray(client.leads) ? client.leads.length : 0;
    },
    clientStatus(client) { return client.status || 'active'; },

    statusLabel(status) { return { active: 'Ativo', inactive: 'Inativo', disabled: 'Desativado', blocked: 'Bloqueado' }[status] || status || 'Ativo'; },
    statusClass(status) {
      if (['inactive', 'disabled', 'blocked'].includes(status)) return 'bg-slate-100 text-slate-500';
      return 'bg-cyan-500/10 text-cyan-400';
    },

    formatDate(value) {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return 'Data indisponível';
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    },

    openClient(client) { this.selectedClient = client; }
  }));

  // --- LOGS ---
  Alpine.data('logs', () => ({
    logs: [],
    loading: true,
    apiOnline: false,
    searchTerm: '',
    methodFilter: 'all',
    resultFilter: 'all',
    sortBy: 'newest',
    selectedLog: null,

    async init() {
      await this.loadLogs();
    },

    async loadLogs() {
      this.loading = true;

      try {
        const { data, error } = await api.api.v1.logs.get();
        if (error) throw new Error('API unavailable');

        this.logs = Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : [];
        this.apiOnline = true;
      } catch {
        this.logs = [];
        this.apiOnline = false;
      } finally {
        this.loading = false;
      }
    },

    get filteredLogs() {
      const query = this.searchTerm.trim().toLowerCase();

      return this.logs
          .filter((log) => {
            const method = this.logMethod(log);
            const statusCode = this.logStatusCode(log);
            const matchesMethod = this.methodFilter === 'all' || method === this.methodFilter;
            const matchesResult = this.resultFilter === 'all' || (this.resultFilter === 'success' ? statusCode >= 200 && statusCode < 400 : statusCode >= 400);
            const searchableText = [method, this.logPath(log), log.message, log.ip].filter(Boolean).join(' ').toLowerCase();
            return matchesMethod && matchesResult && (!query || searchableText.includes(query));
          })
          .sort((firstLog, secondLog) => {
            if (this.sortBy === 'slowest') return this.logDuration(secondLog) - this.logDuration(firstLog);
            return new Date(String(this.logDate(secondLog))).getTime() - new Date(String(this.logDate(firstLog))).getTime();
          });
    },

    get successfulCount() { return this.logs.filter((log) => { const statusCode = this.logStatusCode(log); return statusCode >= 200 && statusCode < 400; }).length; },
    get failedCount() { return this.logs.filter((log) => this.logStatusCode(log) >= 400).length; },
    get averageDuration() {
      if (!this.logs.length) return 0;
      return Math.round(this.logs.reduce((total, log) => total + this.logDuration(log), 0) / this.logs.length);
    },

    logMethod(log) { return String(log.method || log.httpMethod || 'GET').toUpperCase(); },
    logPath(log) { return log.path || log.endpoint || log.url || '/'; },
    logStatusCode(log) { return Number(log.statusCode ?? log.status ?? log.responseStatus ?? 0); },
    logDuration(log) { return Number(log.duration ?? log.responseTime ?? log.latency ?? 0); },
    logDate(log) { return log.timestamp || log.createdAt || log.date; },

    statusLabel(log) {
      const statusCode = this.logStatusCode(log);
      if (!statusCode) return 'Sem resposta';
      if (statusCode < 400) return 'Sucesso';
      return 'Erro';
    },

    statusClass(log) {
      const statusCode = this.logStatusCode(log);
      if (statusCode >= 400) return 'bg-red-500/10 text-red-400';
      if (statusCode >= 200) return 'bg-cyan-500/10 text-cyan-400';
      return 'bg-slate-100 text-slate-500';
    },

    methodClass(log) {
      return {
        GET: 'bg-blue-500/10 text-blue-600',
        POST: 'bg-cyan-500/10 text-blue-600',
        PUT: 'bg-amber-500/10 text-amber-600',
        PATCH: 'bg-violet-500/10 text-violet-600',
        DELETE: 'bg-red-500/10 text-red-600'
      }[this.logMethod(log)] || 'bg-slate-100 text-slate-600';
    },

    formatDate(value) {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return 'Data indisponível';
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    },

    openLog(log) { this.selectedLog = log; }
  }));

  // --- SETTINGS ---
  Alpine.data('settingsForm', (section) => {
    const defaults = {
      email: {
        enabled: false, host: '', port: 587, username: '', password: '', fromEmail: '', fromName: '', secure: true
      },
      whatsapp: {
        enabled: false, provider: 'cloud_api', phoneNumber: '', apiUrl: '', token: '', instanceId: ''
      },
      rules: {
        autoValidate: true, blockDisposableEmails: true, requirePhone: false, minimumScore: 50, blockedDomains: []
      }
    };

    return {
      form: structuredClone(defaults[section]),
      loading: true,
      saving: false,
      testing: false,
      apiOnline: false,
      feedback: '',
      feedbackType: 'success',
      blockedDomainInput: '',

      async init() {
        await this.loadSettings();
      },

      async loadSettings() {
        this.loading = true;
        this.feedback = '';

        try {
          // Utilizando o Eden Treaty acessando dinamicamente a rota
          const { data, error } = await api.api.v1.settings[section].get();
          if (error) throw new Error('API unavailable');

          const payload = data?.settings || data?.data || data;
          const settings = section === 'email' ? payload?.smtp : section === 'whatsapp' ? payload?.provider : payload?.rules;
          this.form = { ...this.form, ...(settings || {}) };
          this.apiOnline = true;
        } catch {
          this.apiOnline = false;
        } finally {
          this.loading = false;
        }
      },

      async saveSettings() {
        this.saving = true;
        this.feedback = '';

        try {
          const body = section === 'email' ? { smtp: this.form } : section === 'whatsapp' ? { provider: this.form } : { rules: this.form };
          const { error } = await api.api.v1.settings[section].post(body);
          if (error) throw new Error('Settings could not be saved');

          this.feedback = 'Configurações salvas com sucesso.';
          this.feedbackType = 'success';
          this.apiOnline = true;
        } catch {
          this.feedback = 'Não foi possível salvar as configurações.';
          this.feedbackType = 'error';
          this.apiOnline = false;
        } finally {
          this.saving = false;
        }
      },

      async testEmailConnection() {
        this.testing = true;
        this.feedback = '';

        try {
          const email = String(this.form.fromEmail || '').trim();
          if (!email) throw new Error('Informe o e-mail de envio antes de testar.');

          const { error } = await api.api.v1.settings.email.test.post({ email });
          if (error) throw new Error('SMTP connection failed');

          this.feedback = 'Conexão SMTP testada com sucesso.';
          this.feedbackType = 'success';
        } catch {
          this.feedback = 'Não foi possível testar a conexão SMTP.';
          this.feedbackType = 'error';
        } finally {
          this.testing = false;
        }
      },

      addBlockedDomain() {
        const domain = this.blockedDomainInput.trim().toLowerCase();
        if (!domain || this.form.blockedDomains.includes(domain)) return;
        this.form.blockedDomains.push(domain);
        this.blockedDomainInput = '';
      },

      removeBlockedDomain(domain) {
        this.form.blockedDomains = this.form.blockedDomains.filter((item) => item !== domain);
      }
    };
  });

  // --- LOGIN ---
  Alpine.data('login', () => ({
    email: '',
    password: '',
    passwordVisible: false,
    remember: false,
    submitting: false,
    error: '',

    async submit() {
      this.error = '';
      this.submitting = true;

      try {
        // Envio direto pelo Eden Treaty
        const { data, error } = await api.api.v1.auth.signin.post({
          email: this.email,
          password: this.password
        });

        // O Eden coloca as respostas de erro do backend no objeto 'error'
        if (error) {
          // error.value costuma guardar o body da resposta de erro do Elysia
          throw new Error(error.value?.error || error.message || 'Não foi possível entrar.');
        }

        if (data) {
          localStorage.removeItem('user');
          localStorage.setItem('user', JSON.stringify(data.user));

          // Define o tempo de expiração do cookie (ex: 7 dias se 'Lembrar-me', senão expira ao fechar a aba)
          const maxAge = this.remember ? `max-age=${60 * 60 * 24 * 7}` : '';
          document.cookie = `auth_token=${data.token}; path=/; ${maxAge}; SameSite=Lax`;

          window.location.href = '/dashboard';
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.submitting = false;
      }
    }
  }));

  Alpine.data('signup', () => ({

  }));

  Alpine.data('resetPassword', () => ({

  }));

  Alpine.data('forgotPassword', () => ({

  }));
}
