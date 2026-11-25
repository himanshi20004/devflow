const request = require('supertest');
const { connect, clearDb, disconnect } = require('./setup');
const app = require('../src/app');

beforeAll(connect);
beforeEach(clearDb);
afterAll(disconnect);

async function registerAndGetToken(email = 'dev@example.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dev', email, password: 'secret123' });
  return res.body.token;
}

async function createProject(token, body = { name: 'API' }) {
  return request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

describe('projects API', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  it('creates and lists projects', async () => {
    const token = await registerAndGetToken();

    const created = await createProject(token, {
      name: 'My App',
      repoUrl: 'https://github.com/me/my-app',
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('idle');

    const list = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('My App');
  });

  it('rejects a project without a name', async () => {
    const token = await registerAndGetToken();
    const res = await createProject(token, { name: '  ' });
    expect(res.status).toBe(400);
  });

  it('updates a project status', async () => {
    const token = await registerAndGetToken();
    const created = await createProject(token);

    const res = await request(app)
      .put(`/api/projects/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'success' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('rejects an invalid status', async () => {
    const token = await registerAndGetToken();
    const created = await createProject(token);

    const res = await request(app)
      .put(`/api/projects/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'banana' });
    expect(res.status).toBe(400);
  });

  it('deletes a project', async () => {
    const token = await registerAndGetToken();
    const created = await createProject(token, { name: 'Temp' });

    const res = await request(app)
      .delete(`/api/projects/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const list = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(0);
  });

  it("does not let one user touch another user's project", async () => {
    const tokenA = await registerAndGetToken('a@example.com');
    const tokenB = await registerAndGetToken('b@example.com');
    const created = await createProject(tokenA, { name: 'Private' });

    const res = await request(app)
      .delete(`/api/projects/${created.body._id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);

    const listB = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listB.body).toHaveLength(0);
  });

  it('returns 400 for a malformed id', async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .delete('/api/projects/123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
