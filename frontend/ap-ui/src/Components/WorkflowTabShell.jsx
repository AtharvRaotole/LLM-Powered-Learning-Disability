import classes from "./WorkflowTabShell.module.css";

export default function WorkflowTabShell({
    title,
    subtitle,
    headerExtra,
    isLoading,
    loadingMessage = "Loading...",
    error,
    children,
}) {
    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.headerText}>
                    <h2 className={classes.title}>
                        {title}
                        {headerExtra}
                    </h2>
                    {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
                </div>
            </div>

            {isLoading && (
                <div className={classes.loading} role="status">
                    {loadingMessage}
                </div>
            )}

            {error && !isLoading && (
                <div className={classes.error} role="alert">
                    {error}
                </div>
            )}

            {!isLoading && !error && children && (
                <div className={classes.content}>{children}</div>
            )}
        </div>
    );
}
