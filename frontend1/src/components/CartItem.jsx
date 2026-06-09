import { HiShoppingCart, HiMinus, HiPlus, HiTrash } from 'react-icons/hi';

export default function CartItem({ item, index, onUpdate, onRemove }) {
  const unitPrice = item.price || Math.floor(Math.random() * 100) + 20;

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="cart-item-placeholder">
            <HiShoppingCart />
          </div>
        )}
      </div>
      <div className="cart-item-info">
        <h4 className="cart-item-name">{item.name}</h4>
        <p className="cart-item-quantity">
          {item.quantity} {item.unit}
        </p>
        <p className="cart-item-price">₹{unitPrice}</p>
      </div>
      <div className="cart-item-controls">
        <div className="quantity-control">
          <button className="qty-btn" onClick={() => onUpdate(index, { qty: Math.max(1, (item.qty || 1) - 1) })}>
            <HiMinus />
          </button>
          <span className="qty-value">{item.qty || 1}</span>
          <button className="qty-btn" onClick={() => onUpdate(index, { qty: (item.qty || 1) + 1 })}>
            <HiPlus />
          </button>
        </div>
        <button className="remove-btn" onClick={() => onRemove(index)}>
          <HiTrash />
        </button>
      </div>

      <style>{`
        .cart-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius);
          transition: var(--transition);
        }
        .cart-item:hover {
          box-shadow: var(--shadow);
        }
        .cart-item-image {
          width: 64px;
          height: 64px;
          border-radius: var(--radius);
          overflow: hidden;
          flex-shrink: 0;
        }
        .cart-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cart-item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          color: var(--text-light);
          font-size: 1.3rem;
        }
        .cart-item-info {
          flex: 1;
          min-width: 0;
        }
        .cart-item-name {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .cart-item-quantity {
          font-size: 13px;
          color: var(--text-light);
          margin-bottom: 2px;
        }
        .cart-item-price {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary);
        }
        .cart-item-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .quantity-control {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .qty-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          color: var(--text);
          font-size: 0.9rem;
          transition: var(--transition);
        }
        .qty-btn:hover {
          background: var(--bg);
          color: var(--primary);
        }
        .qty-value {
          min-width: 32px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          padding: 0 4px;
        }
        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius);
          background: none;
          color: var(--danger);
          font-size: 1rem;
          transition: var(--transition);
        }
        .remove-btn:hover {
          background: rgba(239,68,68,0.1);
        }
      `}</style>
    </div>
  );
}
