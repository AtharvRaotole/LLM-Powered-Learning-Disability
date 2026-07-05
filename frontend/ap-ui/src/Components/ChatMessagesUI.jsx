import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const themes = {
    iMessage: {
        receiverColor: "#e5e5ea",
        receiverTextColor: "#000000",
        senderGradient: false,
        senderColor: "#007aff",
        senderGradientStart: "#007aff",
        senderGradientEnd: "#0051a8",
        senderTextColor: "#ffffff",
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

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
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

function parseText(text) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

function TypingIndicator({ sender, colors, font, borderRadius }) {
    const reduced = useReducedMotion();
    const bubbleColor = sender ? colors.sender : colors.receiver;
    const textColor = sender ? colors.senderText : colors.receiverText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
                alignSelf: sender ? "flex-end" : "flex-start",
                background: bubbleColor,
                color: textColor,
                borderRadius,
                padding: "12px 16px",
                maxWidth: "80%",
                display: "flex",
                gap: 4,
                alignItems: "center",
                fontSize: font.fontSize,
                fontFamily: font.fontFamily,
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
                        display: "block",
                    }}
                    animate={reduced ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </motion.div>
    );
}

function MessageBubble({ text, sender, colors, font, borderRadius }) {
    const bubbleColor = sender ? colors.sender : colors.receiver;
    const textColor = sender ? colors.senderText : colors.receiverText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
                alignSelf: sender ? "flex-end" : "flex-start",
                background: bubbleColor,
                color: textColor,
                borderRadius,
                padding: "12px 16px",
                maxWidth: "80%",
                wordBreak: "break-word",
                fontSize: font.fontSize,
                fontFamily: font.fontFamily,
                lineHeight: font.lineHeight || "1.4em",
            }}
        >
            {parseText(text)}
        </motion.div>
    );
}

export default function ChatMessagesUI({
    messages = [],
    isTyping = false,
    theme = "iMessage",
    borderRadius = 16,
    font = { fontSize: "14px", fontFamily: "Inter, system-ui, sans-serif", lineHeight: "1.4em" },
}) {
    const colors = useMemo(() => resolveTheme(theme), [theme]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
                height: "100%",
                padding: 16,
                overflowY: "auto",
                overscrollBehavior: "contain",
                justifyContent: "flex-end",
            }}
        >
            {messages.map((msg, i) => (
                <MessageBubble
                    key={msg.id ?? i}
                    text={msg.text}
                    sender={msg.sender}
                    colors={colors}
                    font={font}
                    borderRadius={borderRadius}
                />
            ))}
            {isTyping && (
                <TypingIndicator sender={false} colors={colors} font={font} borderRadius={borderRadius} />
            )}
        </div>
    );
}
