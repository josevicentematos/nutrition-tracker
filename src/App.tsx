import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Login } from './auth/Login';
import { MyDayScreen } from './components/MyDayScreen';
import { ProductsScreen } from './components/ProductsScreen';

type Tab = 'day' | 'products';

function AppInner() {
  const { session, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('day');

  if (loading) return <p className="centered">Loading…</p>;
  if (!session) return <Login />;

  const userId = session.user.id;

  return (
    <div className="app">
      <nav className="tabs">
        <button className={tab === 'day' ? 'active' : ''} onClick={() => setTab('day')}>
          My Day
        </button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Products
        </button>
        <button className="signout" onClick={() => void signOut()}>Sign out</button>
      </nav>
      <main>
        {tab === 'day' ? <MyDayScreen userId={userId} /> : <ProductsScreen userId={userId} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
