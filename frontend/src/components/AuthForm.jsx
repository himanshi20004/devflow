import { useState } from 'react';
import { login, register } from '../api.js';

export default function AuthForm({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isRegister ? await register(form) : await login(form);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{isRegister ? 'Create account' : 'Log in'}</h2>

      {isRegister && (
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
      )}
      <label>
        Email
        <input name="email" type="email" value={form.email} onChange={handleChange} required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          required
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Please wait...' : isRegister ? 'Register' : 'Log in'}
      </button>

      <p className="muted">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? 'Log in' : 'Register'}
        </a>
      </p>
    </form>
  );
}
