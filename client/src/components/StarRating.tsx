export default function StarRating({ value, color = '#a855f7' }: { value: number; color?: string }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="star"
          style={{ color, opacity: value >= i - 0.3 ? 1 : 0.2 }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
