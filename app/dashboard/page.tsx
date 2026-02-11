import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main style={{ marginTop: '2rem' }}>
        <p>This is a protected page. Your workflows would be here.</p>
      </main>
    </div>
  );
}
