const express = require('express');
const { createStore } = require('./data');
const { createBooking, BookingError } = require('./booking.service');

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());

  app.get('/api/tickets', (req, res) => {
    res.json(store.tickets);
  });

  app.post('/api/bookings', (req, res) => {
    const booking = createBooking(store, req.body);
    res.status(201).json(booking);
  });

  app.use((error, req, res, next) => {
    if (error instanceof BookingError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'JSON không hợp lệ.' });
    }
    if (error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  });

  return app;
}

if (require.main === module) {
  const server = createApp().listen(3000, () => {
    console.log('Server đang chạy tại http://localhost:3000');
  });

  server.on('error', (error) => {
    console.error('Không thể khởi động server:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp };
