const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/server');
const { createStore } = require('../src/data');

async function createTestApi(t) {
  const store = createStore();
  const server = createApp(store).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    return { status: response.status, body: await response.json() };
  }

  function book(input) {
    return request('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  }

  return { store, request, book };
}

test('GET /api/tickets trả về dữ liệu ban đầu và tồn kho sau đặt vé', async (t) => {
  const api = await createTestApi(t);
  const initial = await api.request('/api/tickets');
  assert.equal(initial.status, 200);
  assert.deepEqual(initial.body, [
    { id: 1, name: 'Vé VinWonders', price: 750000, stock: 5 },
    { id: 2, name: 'Vé Safari', price: 650000, stock: 3 },
  ]);

  assert.equal((await api.book({ ticketId: 1, quantity: 2 })).status, 201);
  const updated = await api.request('/api/tickets');
  assert.equal(updated.status, 200);
  assert.equal(updated.body[0].stock, 3);
  assert.equal(updated.body[1].stock, 3);
});

test('Đặt thành công, lưu booking và bỏ qua giá/giảm giá do client gửi', async (t) => {
  const api = await createTestApi(t);
  const result = await api.book({
    ticketId: 1,
    quantity: 1,
    price: 1,
    totalAmount: 1,
    discountAmount: 750000,
    finalAmount: 0,
  });

  assert.equal(result.status, 201);
  assert.deepEqual(result.body, {
    bookingId: 'BK001',
    ticketId: 1,
    quantity: 1,
    totalAmount: 750000,
    discountAmount: 0,
    finalAmount: 750000,
    status: 'CONFIRMED',
  });
  assert.equal(api.store.tickets[0].stock, 4);
  assert.equal(api.store.tickets[1].stock, 3);
  assert.deepEqual(api.store.bookings, [result.body]);

  const second = await api.book({ ticketId: 2, quantity: 1 });
  assert.equal(second.status, 201);
  assert.equal(second.body.bookingId, 'BK002');
  assert.equal(second.body.totalAmount, 650000);
  assert.equal(api.store.tickets[1].stock, 2);
  assert.equal(api.store.bookings.length, 2);
});

test('Đặt 2 vé được giảm 10%', async (t) => {
  const api = await createTestApi(t);
  const result = await api.book({ ticketId: 1, quantity: 2 });
  assert.equal(result.status, 201);
  assert.equal(result.body.totalAmount, 1500000);
  assert.equal(result.body.discountAmount, 150000);
  assert.equal(result.body.finalAmount, 1350000);
});

test('Giảm tối đa 200000 VND', async (t) => {
  const api = await createTestApi(t);
  const result = await api.book({ ticketId: 1, quantity: 3 });
  assert.equal(result.status, 201);
  assert.equal(result.body.totalAmount, 2250000);
  assert.equal(result.body.discountAmount, 200000);
  assert.equal(result.body.finalAmount, 2050000);
});

test('Vượt tồn kho trả 409 và không thay đổi dữ liệu hoặc tiêu hao mã booking', async (t) => {
  const api = await createTestApi(t);
  const before = structuredClone(api.store);
  const result = await api.book({ ticketId: 1, quantity: 6 });
  assert.equal(result.status, 409);
  assert.equal(typeof result.body.message, 'string');
  assert.deepEqual(api.store, before);
  assert.equal((await api.book({ ticketId: 1, quantity: 1 })).body.bookingId, 'BK001');
});

test('TicketId không tồn tại trả 404 và không thay đổi dữ liệu', async (t) => {
  const api = await createTestApi(t);
  const before = structuredClone(api.store);
  const result = await api.book({ ticketId: 999, quantity: 1 });
  assert.equal(result.status, 404);
  assert.deepEqual(api.store, before);
});

for (const field of ['ticketId', 'quantity']) {
  test(`${field} không hợp lệ trả 400 và không thay đổi dữ liệu`, async (t) => {
    const api = await createTestApi(t);
    const before = structuredClone(api.store);
    const invalidValues = [undefined, null, 0, -1, 1.5, '1', true, [], {}, Number.MAX_SAFE_INTEGER + 1];

    for (const value of invalidValues) {
      const result = await api.book({ ticketId: 1, quantity: 1, [field]: value });
      assert.equal(result.status, 400, `${field} = ${JSON.stringify(value)}`);
      assert.deepEqual(api.store, before);
    }
  });
}

test('Body sai, thiếu hoặc JSON lỗi trả 400 và không thay đổi dữ liệu', async (t) => {
  const api = await createTestApi(t);
  const before = structuredClone(api.store);

  for (const input of [{}, [], null, 'invalid', 1]) {
    assert.equal((await api.book(input)).status, 400);
    assert.deepEqual(api.store, before);
  }

  for (const body of [undefined, '{"ticketId":1,']) {
    const result = await api.request('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(result.status, 400);
    assert.deepEqual(api.store, before);
  }
});

test('Mua hết tồn kho, lần đặt tiếp theo trả 409 và giữ nguyên dữ liệu', async (t) => {
  const api = await createTestApi(t);
  assert.equal((await api.book({ ticketId: 2, quantity: 3 })).status, 201);
  assert.equal(api.store.tickets[1].stock, 0);
  const before = structuredClone(api.store);
  assert.equal((await api.book({ ticketId: 2, quantity: 1 })).status, 409);
  assert.deepEqual(api.store, before);
});

test('Hai request đồng thời tranh 1 vé: chỉ một booking thành công trong cùng tiến trình', async (t) => {
  const api = await createTestApi(t);
  api.store.tickets[0].stock = 1;

  const results = await Promise.all([
    api.book({ ticketId: 1, quantity: 1 }),
    api.book({ ticketId: 1, quantity: 1 }),
  ]);

  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal(api.store.tickets[0].stock, 0);
  assert.equal(api.store.bookings.length, 1);
  assert.equal(api.store.bookings[0].bookingId, 'BK001');
  assert.equal(api.store.nextBookingId, 2);
});
