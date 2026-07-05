import classes from './SidebarNavLink.module.css';

export default function SidebarNavLink({
    label,
    hint,
    onClick,
    isActive = false,
    disabled = false,
    collapsed = false,
}) {
    return (
        <button
            type="button"
            className={[
                classes.navLink,
                isActive ? classes.active : '',
                disabled ? classes.disabled : '',
                collapsed ? classes.collapsed : '',
            ].filter(Boolean).join(' ')}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            title={collapsed ? label : (disabled && hint ? hint : undefined)}
            aria-current={isActive ? 'page' : undefined}
            aria-disabled={disabled || undefined}
        >
            <span className={classes.label}>{collapsed ? label.charAt(0) : label}</span>
            {!collapsed && hint && disabled && (
                <span className={classes.hint}>{hint}</span>
            )}
        </button>
    );
}
