import { useState } from 'react';
import AuthForm from './components/AuthForm.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="container">
      <header>
        <h1>DevFlow</h1>
        {token && (
          <div>
            <span className="muted">{user?.name}</span>{' '}
            <button className="secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>

      {token ? (
        <Dashboard token={token} onAuthError={handleLogout} />
      ) : (
        <AuthForm onLogin={handleLogin} />
      )}
    </div>
  );
}
