const request = require('supertest');
const { connect, clearDb, disconnect } = require('./setup');
const app = require('../src/app');

beforeAll(connect);
beforeEach(clearDb);
afterAll(disconnect);

const user = { name: 'Asha', email: 'asha@example.com', password: 'secret123' };

describe('health check', () => {
  it('returns ok when the database is connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('rejects short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate emails', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => request(app).post('/api/auth/register').send(user));

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send(user);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('blocks requests without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('blocks requests with a bad token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});
