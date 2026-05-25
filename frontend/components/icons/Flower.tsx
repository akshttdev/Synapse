type Props = {
  className?: string;
  size?: number;
};

/**
 * 6-petal flower used as the Synapse mark — same geometry as the favicon
 * so the brand reads consistently. Single-color (uses currentColor).
 */
export default function Flower({ className = '', size = 16 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <g transform="translate(12 12)">
        <ellipse cx="0" cy="-6" rx="2.6" ry="4.6" />
        <ellipse cx="0" cy="-6" rx="2.6" ry="4.6" transform="rotate(60)" />
        <ellipse cx="0" cy="-6" rx="2.6" ry="4.6" transform="rotate(120)" />
        <ellipse cx="0" cy="-6" rx="2.6" ry="4.6" transform="rotate(180)" />
        <ellipse cx="0" cy="-6" rx="2.6" ry="4.6" transform="rotate(240)" />
        <ellipse cx="0" cy="-6" rx="2.6" ry="4.6" transform="rotate(300)" />
      </g>
    </svg>
  );
}
