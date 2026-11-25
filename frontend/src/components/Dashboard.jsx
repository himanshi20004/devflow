import { useEffect, useState } from 'react';
import { addProject, deleteProject, getProjects, updateProject } from '../api.js';

const STATUSES = ['idle', 'building', 'success', 'failed'];

export default function Dashboard({ token, onAuthError }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // if the token is expired, send the user back to the login screen
  const handleError = (err) => {
    if (err.message.toLowerCase().includes('token') || err.message === 'Not logged in') {
      onAuthError();
    } else {
      setError(err.message);
    }
  };

  useEffect(() => {
    getProjects(token)
      .then(setProjects)
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const project = await addProject(token, { name, repoUrl });
      setProjects([project, ...projects]);
      setName('');
      setRepoUrl('');
    } catch (err) {
      handleError(err);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      const updated = await updateProject(token, id, { status });
      setProjects(projects.map((p) => (p._id === id ? updated : p)));
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProject(token, id);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <main>
      <form className="card" onSubmit={handleAdd}>
        <h2>Add a project</h2>
        <input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Repository URL (optional)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <button type="submit">Add project</button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>Your projects</h2>
      {loading && <p className="muted">Loading...</p>}
      {!loading && projects.length === 0 && <p className="muted">No projects yet.</p>}

      <ul className="list">
        {projects.map((p) => (
          <li key={p._id} className="card row">
            <div>
              <strong>{p.name}</strong>
              {p.repoUrl && (
                <div>
                  <a href={p.repoUrl} target="_blank" rel="noreferrer">
                    {p.repoUrl}
                  </a>
                </div>
              )}
            </div>
            <div className="actions">
              <select
                aria-label={`Status of ${p.name}`}
                value={p.status}
                onChange={(e) => handleStatus(p._id, e.target.value)}
                className={`status ${p.status}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="danger" onClick={() => handleDelete(p._id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
