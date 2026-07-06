import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { normalizeMathText } from "../Utils/chatMessageFormat";
import classes from "./ChatMessagesUI.module.css";

const themes = {
    iMessage: {
        receiverColor: "var(--chat-bubble-received-bg, #e5e5ea)",
        receiverTextColor: "var(--chat-bubble-received-fg, #000000)",
        senderGradient: false,
        senderColor: "var(--chat-bubble-sent-bg, #007aff)",
        senderGradientStart: "var(--chat-bubble-sent-bg, #007aff)",
        senderGradientEnd: "var(--ios-blue-dark, #0051a8)",
        senderTextColor: "var(--chat-bubble-sent-fg, #ffffff)",
    },
    WhatsApp: {
        receiverColor: "#ffffff",
        receiverTextColor: "#000000",
        senderGradient: true,
        senderColor: "#075e54",
        senderGradientStart: "#25d366",
        senderGradientEnd: "#075e54",
        senderTextColor: "#ffffff",
    },
    Messenger: {
        receiverColor: "#f1f0f0",
        receiverTextColor: "#000000",
        senderGradient: true,
        senderColor: "#0084ff",
        senderGradientStart: "#0084ff",
        senderGradientEnd: "#006aff",
        senderTextColor: "#ffffff",
    },
};

const isHex = (s) => !!s && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
const normalizeHex = (hex, fallback = "#000000") => {
    if (!isHex(hex)) return fallback;
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return `#${full}`.toLowerCase();
};
const contrastYIQ = (hex) => {
    const safe = normalizeHex(hex, "#000000");
    const r = parseInt(safe.slice(1, 3), 16);
    const g = parseInt(safe.slice(3, 5), 16);
    const b = parseInt(safe.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? "#000000" : "#FFFFFF";
};

function resolveTheme(themeName) {
    const t = themes[themeName] || themes.iMessage;
    const senderSample = t.senderGradient ? t.senderGradientEnd : t.senderColor;
    return {
        receiver: t.receiverColor,
        sender: t.senderGradient
            ? `linear-gradient(135deg, ${t.senderGradientStart}, ${t.senderGradientEnd})`
            : t.senderColor,
        receiverText: t.receiverTextColor ?? contrastYIQ(t.receiverColor),
        senderText: t.senderTextColor ?? contrastYIQ(senderSample),
    };
}

function parseInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*|\d+\/\d+)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (/^\d+\/\d+$/.test(part)) {
            return (
                <span key={i} className={classes.mathExpr}>
                    {part}
                </span>
            );
        }
        return part;
    });
}

function parseMessageContent(text) {
    const normalized = normalizeMathText(text);
    const lines = normalized.split("\n");
    const elements = [];
    let listItems = [];
    let listType = null;

    const flushList = () => {
        if (!listItems.length) return;
        const ListTag = listType === "ol" ? "ol" : "ul";
        elements.push(<ListTag key={`list-${elements.length}`}>{listItems}</ListTag>);
        listItems = [];
        listType = null;
    };

    lines.forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
            flushList();
            return;
        }

        const bulletMatch = line.match(/^[•\-*]\s+(.*)/);
        const numMatch = line.match(/^\d+\.\s+(.*)/);

        if (bulletMatch) {
            if (listType !== "ul") {
                flushList();
                listType = "ul";
            }
            listItems.push(<li key={`li-${index}`}>{parseInline(bulletMatch[1])}</li>);
            return;
        }

        if (numMatch) {
            if (listType !== "ol") {
                flushList();
                listType = "ol";
            }
            listItems.push(<li key={`li-${index}`}>{parseInline(numMatch[1])}</li>);
            return;
        }

        flushList();
        elements.push(<p key={`p-${index}`}>{parseInline(line)}</p>);
    });

    flushList();
    return elements.length ? elements : [<p key="empty">{parseInline(normalized)}</p>];
}

function TypingIndicator({ sender, colors }) {
    const reduced = useReducedMotion();
    const bubbleColor = sender ? colors.sender : colors.receiver;
    const textColor = sender ? colors.senderText : colors.receiverText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`${classes.messageBubble} ${sender ? classes.messageBubbleSender : classes.messageBubbleReceiver}`}
            style={{
                background: bubbleColor,
                color: textColor,
            }}
        >
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: textColor,
                        display: "inline-block",
                        marginRight: i < 2 ? 4 : 0,
                    }}
                    animate={reduced ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </motion.div>
    );
}

function MessageBubble({ text, sender, colors }) {
    const bubbleColor = sender ? colors.sender : colors.receiver;
    const textColor = sender ? colors.senderText : colors.receiverText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`${classes.messageBubble} ${sender ? classes.messageBubbleSender : classes.messageBubbleReceiver}`}
            style={{
                background: bubbleColor,
                color: textColor,
            }}
        >
            <div className={classes.messageContent}>{parseMessageContent(text)}</div>
        </motion.div>
    );
}

export default function ChatMessagesUI({
    messages = [],
    isTyping = false,
    theme = "iMessage",
    scrollContainerRef,
    onScroll,
}) {
    const colors = useMemo(() => resolveTheme(theme), [theme]);

    return (
        <div
            ref={scrollContainerRef}
            className={classes.scrollContainer}
            onScroll={onScroll}
        >
            <div className={classes.messagesInner}>
                {messages.map((msg, i) => (
                    <MessageBubble
                        key={msg.id ?? i}
                        text={msg.text}
                        sender={msg.sender}
                        colors={colors}
                    />
                ))}
                {isTyping && <TypingIndicator sender={false} colors={colors} />}
            </div>
        </div>
    );
}
