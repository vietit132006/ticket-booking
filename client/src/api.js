async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'Máy chủ chưa sẵn sàng. Vui lòng thử lại sau.');
    error.status = response.status;
    throw error;
  }
  if (data === null) throw new Error('Không thể đọc dữ liệu từ máy chủ. Vui lòng thử lại.');
  return data;
}

export function getTickets(signal) {
  return request('/api/tickets', { signal });
}

export function bookTickets(ticketId, quantity) {
  return request('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, quantity }),
  });
}
