const SUPPORT_EMAIL = 'yralskui1@bk.ru';

export default function SiteFooter({ onOfferClick }: { onOfferClick: () => void }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-block">
          <h4>Поддержка</h4>
          <p>По вопросам оплаты, mogгов и возвратов — напишите на почту:</p>
          <a className="site-footer-email" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </div>
        <div className="site-footer-block">
          <h4>Как это работает</h4>
          <p>1 могг = 1 анализ лица</p>
          <p>2 mogга = 1 батл</p>
          <p>Купленные mogги не сгорают</p>
        </div>
      </div>
      <div className="site-footer-bar">
        <span className="site-footer-copy">© {new Date().getFullYear()} Mogg Analyzer</span>
        <button type="button" className="offer-link corner" onClick={onOfferClick}>
          Публичная оферта
        </button>
      </div>
    </footer>
  );
}
