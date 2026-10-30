const { calculatePricing } = require('./pricing');

class BookingError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function createBooking(store, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BookingError(400, 'Body phải là một JSON object.');
  }

  const { ticketId, quantity } = input;
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
    throw new BookingError(400, 'ticketId phải là số nguyên dương an toàn.');
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new BookingError(400, 'quantity phải là số nguyên dương an toàn.');
  }

  const ticket = store.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    throw new BookingError(404, 'Không tìm thấy vé.');
  }
  if (ticket.stock < quantity) {
    throw new BookingError(409, 'Không đủ tồn kho.');
  }

  const booking = {
    bookingId: `BK${String(store.nextBookingId).padStart(3, '0')}`,
    ticketId,
    quantity,
    ...calculatePricing(ticket.price * quantity),
    status: 'CONFIRMED',
  };

  // Giữ toàn bộ bước kiểm tra và cập nhật đồng bộ, không thêm await ở giữa.
  ticket.stock -= quantity;
  store.bookings.push(booking);
  store.nextBookingId += 1;

  return booking;
}

module.exports = { createBooking, BookingError };
