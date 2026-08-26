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

const apiBaseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

function dashboard() {
  return {
    stats: structuredClone(emptyStats),
    leads: [],
    loading: true,
    apiOnline: false,

    async init() {
      await this.loadData();
    },

    async loadData() {
      this.loading = true;

      try {
        const [statsResponse, leadsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/stats`),
          fetch(`${apiBaseUrl}/api/leads`)
        ]);

        if (!statsResponse.ok || !leadsResponse.ok) throw new Error('API unavailable');

        const statsData = await statsResponse.json();
        const leadsData = await leadsResponse.json();

        this.stats = {
          totalLeads: Number(statsData.totalLeads || 0),
          verifiedLeads: Number(statsData.verifiedLeads || 0),
          avgScore: Number(statsData.avgScore || 0),
          conversionRate: Math.min(Math.max(Number(statsData.conversionRate || 0), 0), 100),
          probStats: Array.isArray(statsData.probStats) ? statsData.probStats : emptyStats.probStats,
          dailyTrends: Array.isArray(statsData.dailyTrends) ? statsData.dailyTrends : []
        };
        this.leads = Array.isArray(leadsData) ? leadsData.slice(0, 5) : [];
        this.apiOnline = true;
      } catch {
        this.stats = structuredClone(emptyStats);
        this.leads = [];
        this.apiOnline = false;
      } finally {
        this.loading = false;
      }
    },

    get recentTrend() {
      return this.stats.dailyTrends.slice(-7);
    },

    get trendPoints() {
      const trend = this.recentTrend;
      const max = Math.max(...trend.map((day) => Number(day.verified) + Number(day.unverified)), 1);

      return trend.map((day, index) => {
        const x = trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100;
        const total = Number(day.verified) + Number(day.unverified);
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
      if (status === 'verified') return 'bg-green-500/10 text-green-400';
      if (status === 'rejected') return 'bg-red-500/10 text-red-400';
      return 'bg-amber-500/10 text-amber-400';
    },

    probabilityDotClass(name) {
      if (name === 'HIGH') return 'bg-green-500';
      if (name === 'MEDIUM') return 'bg-amber-400';
      return 'bg-red-400';
    },

    probabilityColorClass(name) {
      if (name === 'HIGH') return 'bg-green-500';
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
  };
}

export default function initAlpineStores(Alpine) {
  Alpine.data('dashboard', dashboard);
}
