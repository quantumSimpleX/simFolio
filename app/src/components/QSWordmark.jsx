const QS_OUTER = 'M369.8,138.5c14.3,53.6,4,108.3-24.6,151.2l46.8,46.8l-54.4,54.8l-47.2-47.2c-16.3,10.3-34.1,18.7-54,24.2c-100.4,27-203.6-32.5-230.2-132.1C-20.3,136.1,39.3,33.3,139.7,6.4C239.7-20.2,342.8,38.9,369.8,138.5z';
const QS_INNER = 'M199.2,226.5l78.7-102.2l-74.8-67.4L91.3,124.3l80.2,102.3l-23,29.7l-38.2,47.6h75.2h75.2l-38.2-47.7L199.2,226.5z M135.8,123.3l57.8-34.8l-14.1,112.6l-50.8-64.8H183l1.6-13L135.8,123.3L135.8,123.3z M240.8,136.3l-49.5,64.3l14-111.9l38.4,34.6h-38.2l-1.6,13H240.8z M185.5,281.9h-29.1l9.4-11.7l0.1-0.1l0.1-0.1l19.5-25.1l19.5,25.1l0.1,0.1l0.1,0.1l9.4,11.7H185.5z';

const MOMCAKE = "'MOMCAKE', 'Helvetica Neue', system-ui, sans-serif";
const BOURBON = "'Bourbon Grotesque', 'MOMCAKE', 'Helvetica Neue', system-ui, sans-serif";

export default function QSWordmark({ onDark = false, size = 44 }) {
  const outerColor = onDark ? '#FFFFFF' : '#0A0E14';
  const innerColor = onDark ? '#0A0E14' : '#FFFFFF';
  const textColor = onDark ? '#FFFFFF' : '#0A0E14';
  const fontSize = size * 0.5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      <svg viewBox="0 0 392 391.3" style={{ height: size, width: size, display: 'block', flexShrink: 0 }} aria-hidden="true">
        <path fill={outerColor} d={QS_OUTER} />
        <path fill={innerColor} d={QS_INNER} />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: fontSize, lineHeight: 0.78, letterSpacing: '0.06em', whiteSpace: 'nowrap', color: textColor }}>
        <div style={{ display: 'flex', alignItems: 'baseline', transform: 'translateY(7px)' }}>
          <span style={{ fontFamily: MOMCAKE, fontWeight: 700 }}>UANTUM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: Math.round(fontSize * 0.73) + 'px' }}>
          <span style={{ fontFamily: MOMCAKE, fontWeight: 700 }}>SIMPLE</span>
          <span style={{ fontFamily: BOURBON, fontWeight: 400, fontSize: fontSize * 1.27, letterSpacing: '0.8px' }}>X</span>
        </div>
      </div>
    </div>
  );
}
