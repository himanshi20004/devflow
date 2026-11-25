import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

// small helper so each test can say what the fake server returns
function mockFetch(responses) {
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method || 'GET';
    const key = `${method} ${new URL(url).pathname}`;
    const match = responses[key];
    if (!match) return Promise.reject(new Error(`Unexpected request: ${key}`));
    return Promise.resolve({
      ok: match.ok !== false,
      json: () => Promise.resolve(match.body),
    });
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('DevFlow app', () => {
  it('shows the login form when logged out', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('can switch to the register form', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('Register'));
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('logs in and shows the dashboard', async () => {
    mockFetch({
      'POST /api/auth/login': {
        body: { token: 'abc', user: { name: 'Asha', email: 'asha@example.com' } },
      },
      'GET /api/projects': {
        body: [{ _id: '1', name: 'Shop API', repoUrl: '', status: 'success' }],
      },
    });

    render(<App />);
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Shop API')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('abc');
  });

  it('shows the error message when login fails', async () => {
    mockFetch({
      'POST /api/auth/login': { ok: false, body: { message: 'Invalid email or password' } },
    });

    render(<App />);
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('adds a new project', async () => {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('user', JSON.stringify({ name: 'Asha' }));

    mockFetch({
      'GET /api/projects': { body: [] },
      'POST /api/projects': {
        body: { _id: '2', name: 'New App', repoUrl: '', status: 'idle' },
      },
    });

    render(<App />);
    expect(await screen.findByText('No projects yet.')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Project name'), 'New App');
    await userEvent.click(screen.getByRole('button', { name: 'Add project' }));

    expect(await screen.findByText('New App')).toBeInTheDocument();
  });

  it('logs out and returns to the login form', async () => {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('user', JSON.stringify({ name: 'Asha' }));
    mockFetch({ 'GET /api/projects': { body: [] } });

    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    );
    expect(localStorage.getItem('token')).toBeNull();
  });
});
