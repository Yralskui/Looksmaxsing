import { useState } from 'react';
import type { Package } from '../types';
import { createPayment, mockPay } from '../api';

export default function PaymentModal({
  packages,
  onClose,
  onSuccess,
}: {
  packages: Package[];
  onClose: () => void;
  onSuccess: (moggs: number) => void;
}) {
  const [selected, setSelected] = useState(packages[0]?.moggs ?? 5);
  const [loading, setLoading] = useState(false);

  const pkg = packages.find((p) => p.moggs === selected);

  async function handlePay() {
    if (!pkg) return;
    setLoading(true);
    try {
      const payment = await createPayment(pkg.moggs);
      if (payment.mock || !payment.url) {
        const result = await mockPay(payment.invId);
        onSuccess(result.moggs);
        onClose();
      } else {
        window.location.href = payment.url;
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка оплаты');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Купить mogгов</h2>
        <p className="modal-sub">
          1 могг = 1 анализ · 2 могга = 1 батл
        </p>

        <div className="package-list">
          {packages.map((p) => (
            <div
              key={p.moggs}
              className={`package-item ${selected === p.moggs ? 'selected' : ''}`}
              onClick={() => setSelected(p.moggs)}
            >
              <div className="left">
                <span>{p.label}</span>
                {p.badge && (
                  <span className={`package-badge ${p.badge.toLowerCase()}`}>
                    {p.badge}
                  </span>
                )}
              </div>
              <span className="package-price">{p.price}₽</span>
            </div>
          ))}
        </div>

        <button className="modal-pay-btn" onClick={handlePay} disabled={loading}>
          {loading ? 'Обработка...' : `Купить за ${pkg?.price ?? 0}₽`}
        </button>
        <button className="modal-close" onClick={onClose}>
          Отмена
        </button>

        <p className="modal-note">
          Купленные mogги не сгорают · Оплата через ЮKassa
        </p>
      </div>
    </div>
  );
}
