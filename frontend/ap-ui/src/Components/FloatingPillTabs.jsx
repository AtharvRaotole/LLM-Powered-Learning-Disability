import { motion } from 'framer-motion';
import classes from './FloatingPillTabs.module.css';

export default function FloatingPillTabs({ items, activeKey, onSelect, layoutId = 'activeBackground' }) {
    return (
        <nav
            className={classes.pillNav}
            role="tablist"
            aria-label="Disability detail workflow"
        >
            {items.map((item) => {
                const isActive = item.key === activeKey;

                return (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`${item.label}: ${item.description}`}
                        title={item.description}
                        className={`${classes.pillTab} ${isActive ? classes.pillTabActive : ''}`}
                        onClick={() => onSelect(item.key)}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={layoutId}
                                className={classes.activeBackground}
                                transition={{ type: 'spring', stiffness: 800, damping: 60, mass: 1 }}
                            />
                        )}
                        <span className={classes.tabStep}>{item.step}</span>
                        {item.icon && <span className={classes.tabIcon} aria-hidden="true">{item.icon}</span>}
                        <span className={classes.tabLabel}>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
