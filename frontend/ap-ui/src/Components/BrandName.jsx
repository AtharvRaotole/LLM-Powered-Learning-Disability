import classes from './BrandName.module.css';

export default function BrandName({ className = '', size = 'md' }) {
    return (
        <span className={`${classes.brandName} ${classes[size]} ${className}`.trim()} aria-label="MindMath">
            <span className={classes.mind}>Mind</span>
            <span className={classes.math}>Math</span>
        </span>
    );
}
