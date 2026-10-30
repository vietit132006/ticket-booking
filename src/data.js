function createStore() {
  return {
    tickets: [
      { id: 1, name: 'Vé VinWonders', price: 750000, stock: 5 },
      { id: 2, name: 'Vé Safari', price: 650000, stock: 3 },
    ],
    bookings: [],
    nextBookingId: 1,
  };
}

module.exports = { createStore };
