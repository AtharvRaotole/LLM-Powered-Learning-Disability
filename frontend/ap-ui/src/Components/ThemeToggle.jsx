import { useTheme } from '../Store/ThemeContext';
import classes from './ThemeToggle.module.css';

const OPTIONS = [
  {
    id: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={classes.toggle}
      role="group"
      aria-label="Appearance"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`${classes.option} ${theme === option.id ? classes.active : ''}`}
          onClick={() => setTheme(option.id)}
          aria-pressed={theme === option.id}
          aria-label={option.label}
          title={option.label}
        >
          <span className={classes.icon}>{option.icon}</span>
          <span className={classes.label}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
