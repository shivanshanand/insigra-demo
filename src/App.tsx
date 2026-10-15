import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "./lib/supabase";
import "./App.css";

type Campaign = {
  id: number;
  company_name: string;
  channel: string;
  leads: number;
};

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("campaign_data")
      .select("id, company_name, channel, leads")
      .order("id");

    if (error) {
      setError(error.message);
      setCampaigns([]);
    } else {
      setCampaigns((data ?? []) as Campaign[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserEmail(data.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user.email ?? null);
        if (!session) setCampaigns([]);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userEmail) void loadCampaigns();
    else setCampaigns([]);
  }, [userEmail, loadCampaigns]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
  }

  const chartData = Object.values(
    campaigns.reduce<Record<string, { channel: string; leads: number }>>(
      (result, row) => {
        result[row.channel] ??= { channel: row.channel, leads: 0 };
        result[row.channel].leads += row.leads;
        return result;
      },
      {},
    ),
  );

  if (!userEmail) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={signIn}>
          <div className="brand-mark">IR</div>
          <p className="eyebrow">INSIGRA REPORTS</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to view your marketing performance.</p>

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />

          {error && <p className="error">{error}</p>}
          <button className="primary-button" type="submit">
            Sign in →
          </button>
          <p className="muted small">
            Secure company-specific reporting
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">IR</div>
          <div>
            <strong>Insigra Reports</strong>
            <div className="muted small">Marketing intelligence</div>
          </div>
        </div>
        <div className="user-actions">
          <span className="muted small">{userEmail}</span>
          <button className="secondary-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">OVERVIEW</p>
        <h1>Campaign performance</h1>
        <p className="muted">
          Your marketing results, in one place.
        </p>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="stats-grid">
        <article className="panel stat">
          <span className="muted">Campaign records</span>
          <strong>{campaigns.length}</strong>
        </article>
        <article className="panel stat">
          <span className="muted">Total leads</span>
          <strong>
            {campaigns.reduce((sum, row) => sum + row.leads, 0).toLocaleString()}
          </strong>
        </article>
        <article className="panel stat">
          <span className="muted">Channels</span>
          <strong>{chartData.length}</strong>
        </article>
      </section>

      <section className="panel chart-panel">
        <div className="section-heading">
          <div>
            <h2>Leads by channel</h2>
            <p className="muted small">Performance across your channels</p>
          </div>
          <span className="live-dot">● Live data</span>
        </div>
        {loading ? <p>Loading chart…</p> : campaigns.length === 0 ? (
          <p className="muted">No campaign data available.</p>
        ) : (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="channel" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="leads" fill="#6d5ce8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="section-heading">
          <div>
            <h2>Campaign breakdown</h2>
            <p className="muted small">
              Campaign records available to your account
            </p>
          </div>
          <button className="secondary-button" onClick={loadCampaigns}>
            Refresh
          </button>
        </div>

        {loading ? <p>Loading campaigns…</p> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Channel</th>
                  <th>Leads</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.company_name}</td>
                    <td>{row.channel}</td>
                    <td>{row.leads.toLocaleString()}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={3}>No records returned.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Access to campaign rows is enforced by database RLS policies.
        </p>
      </section>
    </main>
  );
}
