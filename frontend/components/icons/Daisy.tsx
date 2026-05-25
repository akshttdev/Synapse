type Props = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  petalColor?: string;
  centerColor?: string;
  coreColor?: string;
};

/**
 * Decorative daisy used to scatter across light sections.
 */
export default function Daisy({
  size = 40,
  className = '',
  style,
  petalColor = '#ffffff',
  centerColor = '#fbbf24',
  coreColor = '#f59e0b',
}: Props) {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className={className}
      style={{
        filter:
          'drop-shadow(0 6px 14px rgba(0,0,0,0.18)) drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
        ...style,
      }}
    >
      <g transform="translate(20 20)">
        <g fill={petalColor}>
          {angles.map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy="-10"
              rx="3.4"
              ry="6.6"
              transform={`rotate(${a})`}
            />
          ))}
        </g>
        <circle cx="0" cy="0" r="3.6" fill={centerColor} />
        <circle cx="0" cy="0" r="1.6" fill={coreColor} />
      </g>
    </svg>
  );
}
