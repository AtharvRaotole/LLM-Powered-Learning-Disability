import { useCallback, useEffect, useRef } from "react";
import classes from "./WheelPicker.module.css";

const ITEM_HEIGHT = 36;

export default function WheelPicker({ options, value, onChange, ariaLabel, id }) {
    const listRef = useRef(null);
    const scrollTimer = useRef(null);
    const isProgrammaticScroll = useRef(false);

    const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value)
    );

    const scrollToIndex = useCallback((index, behavior = "auto") => {
        const list = listRef.current;
        if (!list) return;
        isProgrammaticScroll.current = true;
        list.scrollTo({ top: index * ITEM_HEIGHT, behavior });
        window.setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, behavior === "smooth" ? 220 : 0);
    }, []);

    useEffect(() => {
        scrollToIndex(selectedIndex);
    }, [selectedIndex, scrollToIndex]);

    const handleScroll = () => {
        if (isProgrammaticScroll.current) return;
        if (scrollTimer.current) {
            window.clearTimeout(scrollTimer.current);
        }
        scrollTimer.current = window.setTimeout(() => {
            const list = listRef.current;
            if (!list) return;
            const index = Math.round(list.scrollTop / ITEM_HEIGHT);
            const clamped = Math.max(0, Math.min(index, options.length - 1));
            scrollToIndex(clamped, "smooth");
            const nextValue = options[clamped]?.value;
            if (nextValue && nextValue !== value) {
                onChange(nextValue);
            }
        }, 80);
    };

    const handleKeyDown = (event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const delta = event.key === "ArrowUp" ? -1 : 1;
        const nextIndex = Math.max(0, Math.min(selectedIndex + delta, options.length - 1));
        const nextValue = options[nextIndex]?.value;
        if (nextValue) {
            onChange(nextValue);
        }
    };

    return (
        <div className={classes.wrapper}>
            <div className={classes.highlight} aria-hidden="true" />
            <ul
                ref={listRef}
                id={id}
                className={classes.list}
                role="listbox"
                aria-label={ariaLabel}
                aria-activedescendant={id ? `${id}-option-${selectedIndex}` : undefined}
                tabIndex={0}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
            >
                <li className={classes.spacer} aria-hidden="true" />
                {options.map((option, index) => (
                    <li
                        key={option.value}
                        id={id ? `${id}-option-${index}` : undefined}
                        role="option"
                        aria-selected={option.value === value}
                        className={`${classes.item} ${option.value === value ? classes.selected : ""}`}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </li>
                ))}
                <li className={classes.spacer} aria-hidden="true" />
            </ul>
        </div>
    );
}
