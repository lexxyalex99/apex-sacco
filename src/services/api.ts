import { Member, Loan, Transaction, AuditLog, SACCOSettings, DashboardStats } from '../types.js';

const API_BASE = '/api';

// Interceptor queue holding variables
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function getHeaders() {
  const token = localStorage.getItem('sacco_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// Custom Fetch Wrapper with automatic token refresh queuing
async function secureFetch(url: string, options: any = {}) {
  let token = localStorage.getItem('sacco_token');
  
  if (!options.headers) {
    options.headers = {};
  }
  options.headers['Content-Type'] = 'application/json';
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle cross-site credentials for secure HTTP-only cookies
  options.credentials = 'include';

  let res = await fetch(url, options);

  // Auto-Refresh Session on 401 Token Expired responses
  if (res.status === 401) {
    try {
      const clone = res.clone();
      const errData = await clone.json();
      
      if (errData.code === 'TOKEN_EXPIRED') {
        const storedRefreshToken = localStorage.getItem('sacco_refresh_token');

        if (!isRefreshing) {
          isRefreshing = true;
          
          fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
            credentials: 'include'
          })
            .then(refreshRes => {
              if (!refreshRes.ok) throw new Error("Refresh token expired");
              return refreshRes.json();
            })
            .then(data => {
              localStorage.setItem('sacco_token', data.token);
              if (data.refreshToken) {
                localStorage.setItem('sacco_refresh_token', data.refreshToken);
              }
              isRefreshing = false;
              onRefreshed(data.token);
            })
            .catch(refreshErr => {
              console.error("[Auth Interceptor] Failed to renew session:", refreshErr);
              isRefreshing = false;
              // Clear tokens and force reload to prompt login view
              localStorage.removeItem('sacco_token');
              localStorage.removeItem('sacco_refresh_token');
              window.location.reload();
            });
        }

        // Queue requests until token refresh completes
        const newTokenPromise = new Promise<string>((resolve) => {
          subscribeTokenRefresh((newToken) => {
            resolve(newToken);
          });
        });

        const newToken = await newTokenPromise;
        options.headers['Authorization'] = `Bearer ${newToken}`;
        return await fetch(url, options);
      }
    } catch (e) {
      // Safe fallback if JSON parsing fail
    }
  }

  return res;
}

export const api = {
  // Authentication services
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Authentication failed');
    }
    const data = await res.json();
    
    // Save tokens locally
    localStorage.setItem('sacco_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('sacco_refresh_token', data.refreshToken);
    }
    
    return data;
  },

  async verifyOtp(otp: string, email?: string) {
    // Explicit type-validation and protection against undefined inputs
    const sanitizedOtp = typeof otp === 'string' ? otp.trim() : String(otp || '').trim();
    const sanitizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    const payload: { otp: string; email?: string } = {
      otp: sanitizedOtp
    };
    if (sanitizedEmail) {
      payload.email = sanitizedEmail;
    }

    const res = await secureFetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'OTP verification failed');
    }
    return res.json();
  },

  async registerMember(payload: any) {
    const res = await fetch(`${API_BASE}/auth/register-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    const data = await res.json();
    
    localStorage.setItem('sacco_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('sacco_refresh_token', data.refreshToken);
    }
    
    return data;
  },

  async getMe() {
    const res = await secureFetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  async refreshToken() {
    const storedRefreshToken = localStorage.getItem('sacco_refresh_token');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefreshToken })
    });
    if (!res.ok) {
      localStorage.removeItem('sacco_token');
      localStorage.removeItem('sacco_refresh_token');
      throw new Error('Refresh token expired');
    }
    const data = await res.json();
    localStorage.setItem('sacco_token', data.token);
    return data;
  },

  async logout() {
    const storedRefreshToken = localStorage.getItem('sacco_refresh_token');
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });
    } catch (e) {
      // Safe exit
    }
    localStorage.removeItem('sacco_token');
    localStorage.removeItem('sacco_refresh_token');
  },

  async syncBackups(members: any[], users: any[]) {
    try {
      const res = await fetch(`${API_BASE}/auth/sync-backups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members, users })
      });
      return await res.json();
    } catch (e) {
      console.warn("Syncing backups with core gateway failed:", e);
    }
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await secureFetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Could not retrieve dashboard metrics');
    return res.json();
  },

  // Members
  async getMembers(): Promise<Member[]> {
    const res = await secureFetch(`${API_BASE}/members`);
    if (!res.ok) throw new Error('Could not fetch members');
    return res.json();
  },

  async getMember(memberId: string): Promise<Member> {
    const res = await secureFetch(`${API_BASE}/members/${memberId}`);
    if (!res.ok) throw new Error(`Could not fetch member ${memberId}`);
    return res.json();
  },

  async createMember(payload: any): Promise<Member> {
    const res = await secureFetch(`${API_BASE}/members`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Onboarding member failed');
    }
    return res.json();
  },

  async updateMember(memberId: string, payload: any): Promise<Member> {
    const res = await secureFetch(`${API_BASE}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Updating member failed');
    }
    return res.json();
  },

  // Savings
  async executeSavingsTransaction(payload: {
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    paymentMethod: string;
    targetMemberId?: string;
  }) {
    const res = await secureFetch(`${API_BASE}/savings/action`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Savings operation failed');
    }
    return res.json();
  },

  // Loans
  async getLoans(): Promise<Loan[]> {
    const res = await secureFetch(`${API_BASE}/loans`);
    if (!res.ok) throw new Error('Could not fetch loans timeline');
    return res.json();
  },

  async applyForLoan(payload: {
    amount: number;
    tenureMonths: number;
    purpose: string;
    guarantors: string[];
  }): Promise<Loan> {
    const res = await secureFetch(`${API_BASE}/loans/apply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Loan application failed.');
    }
    return res.json();
  },

  async processLoanAction(loanId: string, action: 'Approve' | 'Reject'): Promise<Loan> {
    const res = await secureFetch(`${API_BASE}/loans/${loanId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Processing loan failed.');
    }
    return res.json();
  },

  // Repayments
  async submitRepayment(payload: {
    loanId: string;
    amount: number;
    paymentMethod: string;
  }) {
    const res = await secureFetch(`${API_BASE}/repayments/submit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Repayment submission failed');
    }
    return res.json();
  },

  // Transactions list
  async getTransactions(): Promise<Transaction[]> {
    const res = await secureFetch(`${API_BASE}/transactions`);
    if (!res.ok) throw new Error('Could not fetch transaction registry');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SACCOSettings> {
    const res = await secureFetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Could not fetch SACCO parameters');
    return res.json();
  },

  async updateSettings(payload: Partial<SACCOSettings>): Promise<SACCOSettings> {
    const res = await secureFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Could not update configurations');
    }
    return res.json();
  },

  // Blockchain Ledger Auditing
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await secureFetch(`${API_BASE}/audit`);
    if (!res.ok) throw new Error('Could not load audit ledger');
    return res.json();
  },

  // Verify Ledger Signatures
  async verifyLedger(): Promise<{ isValid: boolean; brokenAtIndex: number | null }> {
    const res = await secureFetch(`${API_BASE}/audit/verify`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Audit signature verification crashed');
    return res.json();
  },

  // Recoveries / Password Reset Services
  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Triggering password recovery failed');
    }
    return res.json();
  },

  async resetPassword(payload: any) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Password recovery failed');
    }
    return res.json();
  }
};
