const request = require('supertest');
const app = require('../app'); // You'll need to export your Express app from app.js

describe('WebFinger Endpoint', () => {
  test('GET /.well-known/webfinger should return proper JRD+JSON', async () => {
    const response = await request(app)
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:earlyadopter@localhost:3000' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/jrd\+json/);
    expect(response.body).toHaveProperty('subject');
    expect(response.body).toHaveProperty('links');
  });

  test('GET /.well-known/webfinger without resource should return 400', async () => {
    const response = await request(app)
      .get('/.well-known/webfinger');

    expect(response.status).toBe(400);
  });
}); 