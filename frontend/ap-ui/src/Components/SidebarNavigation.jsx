import SidebarNavLink from './SidebarNavLink';
import BrandName from './BrandName';
import classes from './SidebarNavigation.module.css';

const CollapseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
);

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
);

export default function SidebarNavigation({
    isCollapsed,
    onToggleCollapse,
    sections,
}) {
    return (
        <aside
            className={`${classes.sidebar} ${isCollapsed ? classes.collapsed : classes.expanded}`}
            aria-label="Application sidebar"
        >
            <div className={classes.sidebarHeader}>
                <div className={classes.brand}>
                    <img
                        src={`${process.env.PUBLIC_URL}/logo.svg`}
                        alt="MindMath"
                        className={classes.brandMark}
                    />
                    {!isCollapsed && (
                        <div className={classes.brandText}>
                            <BrandName size="md" />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    className={classes.collapseButton}
                    onClick={onToggleCollapse}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!isCollapsed}
                >
                    {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
                </button>
            </div>

            <nav className={classes.sidebarNav} aria-label="Sidebar navigation">
                {sections.map((section) => (
                    <div key={section.title} className={classes.section}>
                        {!isCollapsed && (
                            <h2 className={classes.sectionHeading}>{section.title}</h2>
                        )}
                        <div className={classes.linkGroup}>
                            {section.items.map((item) => (
                                <SidebarNavLink
                                    key={item.key}
                                    label={item.label}
                                    hint={item.hint}
                                    isActive={item.isActive}
                                    disabled={item.disabled}
                                    collapsed={isCollapsed}
                                    onClick={item.onClick}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {!isCollapsed && (
                <div className={classes.sidebarFooter}>
                    <p className={classes.footerText}>MindMath</p>
                </div>
            )}
        </aside>
    );
}
