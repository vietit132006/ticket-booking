import { useEffect, useState } from 'react';
import { bookTickets, getTickets } from './api';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const money = (amount) => currency.format(amount);

function DestinationArt({ nature }) {
  return (
    <svg viewBox="0 0 240 150" fill="none" aria-hidden="true">
      <circle cx="120" cy="70" r="56" fill="currentColor" opacity=".08" />
      {nature ? (
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M119 125V52M119 91C78 94 68 62 73 35c32-1 51 18 46 56ZM120 110c-4-36 17-62 55-61 2 33-14 57-55 61Z" />
          <path d="m119 91-27-32m28 51 33-36M95 130h48" />
          <path d="m62 105 4-9 4 9m102 14 4-9 4 9" opacity=".45" />
          <circle cx="173" cy="25" r="4" fill="currentColor" stroke="none" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="120" cy="65" r="43" />
          <circle cx="120" cy="65" r="7" fill="currentColor" />
          <path d="M120 22v86M77 65h86M90 35l60 60m0-60-60 60m30-30-26 64h52l-26-64M81 130h78" />
          <rect x="112" y="15" width="16" height="13" rx="4" fill="var(--art-bg)" />
          <rect x="69" y="59" width="16" height="13" rx="4" fill="var(--art-bg)" />
          <rect x="155" y="59" width="16" height="13" rx="4" fill="var(--art-bg)" />
          <path d="m180 29 3-7 3 7m-6-4h6M53 95h9m-4-4v8" opacity=".6" />
        </g>
      )}
    </svg>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [booking, setBooking] = useState(null);
  const [toast, setToast] = useState(null);

  async function loadTickets(signal) {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await getTickets(signal);
      setTickets(data);
      setSelectedId((current) => data.some((ticket) => ticket.id === current)
        ? current : (data[0]?.id ?? null));
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadTickets(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId);
  const quantityNumber = Number(quantity);
  const validQuantity = Number.isSafeInteger(quantityNumber) && quantityNumber > 0;
  // Chỉ để xem trước. Kết quả thanh toán chính thức luôn lấy từ POST /api/bookings.
  const totalAmount = selectedTicket && validQuantity ? selectedTicket.price * quantityNumber : 0;
  const discountAmount = totalAmount >= 1000000
    ? Math.min(Math.round(totalAmount * 0.1), 200000) : 0;
  const canPreview = Boolean(selectedTicket && validQuantity);

  function clearResult() {
    setFormError('');
    setBooking(null);
    setToast(null);
  }

  function showStockWarning(message) {
    setFormError(message);
    setToast({ message });
  }

  function changeQuantity(value) {
    setQuantity(value);
    clearResult();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    clearResult();
    if (!selectedTicket) return setFormError('Vui lòng chọn một loại vé.');
    if (!validQuantity) return setFormError('Số lượng vé phải là số nguyên dương.');
    if (selectedTicket.stock === 0) {
      return showStockWarning(`${selectedTicket.name} đã hết vé. Vui lòng chọn loại vé khác.`);
    }
    if (quantityNumber > selectedTicket.stock) {
      return showStockWarning(`Không đủ tồn kho. ${selectedTicket.name} chỉ còn ${selectedTicket.stock} vé.`);
    }

    setIsSubmitting(true);
    try {
      const result = await bookTickets(selectedTicket.id, quantityNumber);
      setBooking(result);
      await loadTickets();
    } catch (error) {
      if (error.status === 409) showStockWarning(error.message);
      else setFormError(error.message);
      // Tồn kho có thể đã thay đổi do khách khác vừa đặt vé.
      if (error.status === 409 || error.status === 404) await loadTickets();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      {toast && (
        <div className="stock-toast" role="alert" aria-atomic="true">
          <span className="toast-icon" aria-hidden="true">!</span>
          <div><strong>Không thể đặt vé</strong><p>{toast.message}</p></div>
          <button type="button" className="toast-close" aria-label="Đóng thông báo" onClick={() => setToast(null)}>×</button>
        </div>
      )}
      <header className="site-header">
        <a className="brand" href="#" aria-label="Vi Vu — Trang chủ">
          <span className="brand-mark" aria-hidden="true">vv<span>✦</span></span>
          <span>vi vu<span className="brand-caption">ĐI ĐỂ THÊM YÊU</span></span>
        </a>
        <span className="header-note"><span className="status-dot" /> Đặt vé trực tuyến</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">MỘT CHUYẾN ĐI, NGÀN NIỀM VUI</p>
            <h1 id="page-title">Hệ thống đặt vé <span>du lịch.</span></h1>
            <p className="hero-description">Chọn trải nghiệm yêu thích. Đặt vé thật dễ dàng.<br />Sẵn sàng cho một ngày đáng nhớ.</p>
          </div>
          <div className="offer-card">
            <span className="offer-icon" aria-hidden="true">✦</span>
            <div><p>THÊM TRẢI NGHIỆM, THÊM ƯU ĐÃI</p><strong>Giảm 10% đơn từ 1 triệu</strong><span>Tiết kiệm đến 200.000 ₫ mỗi lần đặt</span></div>
          </div>
        </section>

        <div className="booking-layout">
          <section id="tickets" className="ticket-section" aria-labelledby="tickets-title" aria-busy={isLoading}>
            <div className="section-heading">
              <div><p className="eyebrow">01 / CHỌN TRẢI NGHIỆM</p><h2 id="tickets-title">Điểm đến của bạn</h2></div>
              <button className="refresh-button" type="button" onClick={() => loadTickets()} disabled={isLoading || isSubmitting}>
                <span aria-hidden="true">↻</span> {isLoading ? 'Đang tải…' : 'Làm mới'}
              </button>
            </div>

            {loadError && <div className="message error" role="alert">{loadError} Nhấn “Làm mới” để tải lại tồn kho.</div>}
            <div className="ticket-grid">
              {isLoading && tickets.length === 0 && [0, 1].map((item) => <div className="ticket-skeleton" key={item}>Đang tải vé…</div>)}
              {tickets.map((ticket, index) => (
                <button
                  type="button"
                  key={ticket.id}
                  className={`ticket-card ${index % 2 ? 'nature' : 'play'} ${selectedId === ticket.id ? 'selected' : ''} ${ticket.stock === 0 ? 'sold-out' : ''}`}
                  aria-label={`Chọn ${ticket.name}`}
                  aria-pressed={selectedId === ticket.id}
                  disabled={isSubmitting}
                  onClick={() => { setSelectedId(ticket.id); clearResult(); }}
                >
                  <div className="ticket-art">
                    <span className="ticket-number">TRẢI NGHIỆM / {String(index + 1).padStart(2, '0')}</span>
                    <span className="selection-mark" aria-hidden="true">{selectedId === ticket.id ? '✓' : ''}</span>
                    <DestinationArt nature={index % 2 === 1} />
                  </div>
                  <div className="ticket-content">
                    <span className={`stock-badge ${ticket.stock === 0 ? 'empty' : ''}`}><span className="status-dot" />{ticket.stock === 0 ? 'Đã hết vé' : `Còn ${ticket.stock} vé`}</span>
                    <h3>{ticket.name}</h3>
                    <div className="ticket-price"><strong>{money(ticket.price)}</strong><span>/ vé</span></div>
                    <div className="ticket-action">{selectedId === ticket.id ? 'Đã chọn trải nghiệm' : 'Chọn trải nghiệm'}<span aria-hidden="true">{selectedId === ticket.id ? '✓' : '↗'}</span></div>
                  </div>
                </button>
              ))}
            </div>
            {!isLoading && !loadError && tickets.length === 0 && <p className="message">Chưa có vé mở bán. Vui lòng quay lại sau.</p>}
            <p className="section-note"><span aria-hidden="true">✧</span> Chọn niềm vui hôm nay, mang kỷ niệm về ngày mai.</p>
          </section>

          <aside className="checkout" aria-labelledby="checkout-title">
            <p className="eyebrow">02 / HOÀN TẤT ĐẶT VÉ</p>
            <h2 id="checkout-title">Chuyến đi bắt đầu từ đây</h2>
            <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
              <div className="selected-ticket"><span>Trải nghiệm đã chọn</span><strong>{selectedTicket?.name || 'Chưa chọn vé'}</strong></div>
              <label className="quantity-label" htmlFor="quantity">Số lượng vé <span>người</span></label>
              <div className="quantity-control">
                <button type="button" aria-label="Giảm số lượng" disabled={isSubmitting || !validQuantity || quantityNumber <= 1} onClick={() => changeQuantity(String(quantityNumber - 1))}>−</button>
                <input id="quantity" name="quantity" type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => changeQuantity(event.target.value)} disabled={isSubmitting || !selectedTicket} aria-describedby="quantity-help" aria-invalid={Boolean(formError && (!validQuantity || quantityNumber > selectedTicket?.stock))} />
                <button type="button" aria-label="Tăng số lượng" disabled={isSubmitting || !selectedTicket} onClick={() => changeQuantity(String(validQuantity ? quantityNumber + 1 : 1))}>+</button>
              </div>
              <p id="quantity-help" className="field-help">{selectedTicket ? (selectedTicket.stock === 0 ? 'Trải nghiệm này đã hết vé. Vui lòng chọn vé khác.' : `Hiện còn ${selectedTicket.stock} vé cho trải nghiệm này.`) : 'Chọn một trải nghiệm để tiếp tục.'}</p>

              <dl className="price-summary">
                <div><dt>Tổng tiền dự kiến</dt><dd>{canPreview ? money(totalAmount) : '—'}</dd></div>
                <div className={discountAmount > 0 ? 'discount-active' : ''}><dt>Ưu đãi{discountAmount > 0 ? ' 10%' : ''}</dt><dd>{canPreview ? `−${money(discountAmount)}` : '—'}</dd></div>
                <div className="final-price"><dt>Thanh toán dự kiến<span>Đơn vị: VND</span></dt><dd>{canPreview ? money(totalAmount - discountAmount) : '—'}</dd></div>
              </dl>
              <p className="pricing-note">Ưu đãi tự động áp dụng từ 1.000.000 ₫, tối đa 200.000 ₫.</p>

              {formError && <div className="message error" role={toast ? undefined : 'alert'}>{formError}</div>}
              <button className="book-button" type="submit" disabled={isSubmitting || isLoading || !selectedTicket}>
                {isSubmitting ? 'Đang đặt vé…' : 'Đặt vé'}<span aria-hidden="true">→</span>
              </button>
              <p className="checkout-note">Số tiền được xác nhận khi đặt vé thành công.</p>
            </form>

            {booking && <div className="message success" role="status"><strong>✓ Đặt vé thành công!</strong><span>Mã booking: <b>{booking.bookingId}</b></span><span>Số tiền thanh toán: <b>{money(booking.finalAmount)}</b></span></div>}
          </aside>
        </div>
      </main>
      <footer className="site-footer"><span>vi vu <span aria-hidden="true">✦</span></span><p>Những chuyến đi nhỏ. Những kỷ niệm lớn.</p><span>Hẹn bạn ở hành trình tiếp theo.</span></footer>
    </div>
  );
}
