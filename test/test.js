const http = require('http');
const assert = require('assert');
const app = require('../index'); // Your Express app

// function to handle http req.
const makeRequest = (method, path, data = '') => {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: 'localhost',
      port: 3000,
      path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsedBody });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
};

describe('Expense Management', () => {
  beforeEach(async () => {
    // Clear existing expenses
    const existingExpenses = await makeRequest('GET', '/api/expenses');
    for (const expense of existingExpenses.body) {
      await makeRequest('DELETE', `/api/expenses/${expense.id}`);
    }
  });
//test for adding a new expense
  it('should create a new expense', async () => {
    const response = await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'phone', amount: 100 }));
    
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.description, 'phone');
    assert.strictEqual(response.body.amount, 100);
  });
//test for calculating total expenses
  it('should calculate the total expense', async () => {
    await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'groceries', amount: 100 }));
    await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'electricity tokens', amount: 200 }));
    
    const response = await makeRequest('GET', '/api/expense');
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.totalExpense, 300);
  });
//test for reading all expenses
  it('should read all expenses', async () => {
    await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'groceries', amount: 100 }));
    await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'electricity tokens', amount: 200 }));

    const response = await makeRequest('GET', '/api/expenses');
    
    assert.strictEqual(response.status, 200);
    assert(Array.isArray(response.body));
    assert.strictEqual(response.body.length, 2); // Expecting 2 expenses
  });
//test for reading a single expense
  it('should read a single expense', async () => {
    const expenseId = await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'phone', amount: 100 }))
      .then(res => res.body.id);
    
    const response = await makeRequest('GET', `/api/expenses/${expenseId}`);
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.description, 'phone');
    assert.strictEqual(response.body.amount, 100);
  });
//test for updating an expense
  it('should update an expense', async () => {
    const expenseId = await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'phone', amount: 100 }))
      .then(res => res.body.id);
    
    const response = await makeRequest('PUT', `/api/expenses/${expenseId}`, JSON.stringify({ description: 'phone', amount: 150 }));
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.description, 'phone');
    assert.strictEqual(response.body.amount, 150);
  });
//test for deleting an expense
  it('should delete an expense', async () => {
    const expenseId = await makeRequest('POST', '/api/expenses', JSON.stringify({ description: 'phone', amount: 100 }))
      .then(res => res.body.id);
    
    const deleteResponse = await makeRequest('DELETE', `/api/expenses/${expenseId}`);
    
    assert.strictEqual(deleteResponse.status, 200);
    assert.strictEqual(deleteResponse.body.message, 'Expense deleted');
    
    // Verify that the expense was actually deleted
    const readResponse = await makeRequest('GET', `/api/expenses/${expenseId}`);
    assert.strictEqual(readResponse.status, 404); // Should be 404 as the expense is deleted
  });
});
