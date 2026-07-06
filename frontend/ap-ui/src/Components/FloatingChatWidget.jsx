import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessagesUI from "./ChatMessagesUI";
import { sendChatMessage } from "../Utils/langgraphApi";
import { getProblemObject } from "../Utils/workflowSession";
import classes from "./FloatingChatWidget.module.css";

const STORAGE_KEY = "floating-chat:messages";
const NEAR_BOTTOM_THRESHOLD = 80;
const WELCOME_TEXT =
    "Hi! I'm your AI tutor. Ask me about math problems, concepts, or strategies. I'm here to help.";

const CHAT_MODES = [
    { id: "tutor", label: "Tutor" },
    { id: "explain", label: "Explain" },
    { id: "practice", label: "Practice" },
    { id: "debug", label: "Debug" },
];

const PERSONALITIES = [
    { id: "helpful", label: "Helpful" },
    { id: "challenging", label: "Challenging" },
    { id: "friendly", label: "Friendly" },
    { id: "expert", label: "Expert" },
];

const QUICK_SUGGESTIONS = [
    "Give me a hint",
    "Explain this step-by-step",
    "What am I doing wrong?",
    "Show me the formula",
];

function loadMessages() {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        sessionStorage.removeItem(STORAGE_KEY);
    }
    return [{ id: "welcome", text: WELCOME_TEXT, sender: false }];
}

function toApiHistory(messages) {
    return messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
            sender: m.sender ? "user" : "ai",
            content: m.text,
        }));
}

export default function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState(loadMessages);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [chatMode, setChatMode] = useState("tutor");
    const [personality, setPersonality] = useState("helpful");
    const scrollContainerRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);

    const currentProblem = getProblemObject();

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    const scrollToBottom = useCallback((behavior = "smooth") => {
        const container = scrollContainerRef.current;
        if (!container) return;
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
            if (behavior === "smooth") {
                container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            }
        });
    }, []);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    }, []);

    useEffect(() => {
        if (shouldAutoScrollRef.current) {
            scrollToBottom(isOpen ? "smooth" : "auto");
        }
    }, [messages, isTyping, isOpen, scrollToBottom]);

    const sendMessage = async (text) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping) return;

        shouldAutoScrollRef.current = true;
        setMessages((prev) => [...prev, { id: Date.now(), text: trimmed, sender: true }]);
        setInput("");
        setIsTyping(true);

        try {
            const data = await sendChatMessage({
                message: trimmed,
                chat_mode: chatMode,
                personality,
                conversation_history: toApiHistory(messages),
                problem_context: currentProblem,
            });
            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, text: data.response, sender: false },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    text: "Sorry, I'm having trouble connecting right now. Please try again.",
                    sender: false,
                },
            ]);
            console.error("Floating chat error:", error);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = () => sendMessage(input);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        const fresh = [{ id: "welcome", text: WELCOME_TEXT, sender: false }];
        shouldAutoScrollRef.current = true;
        setMessages(fresh);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    };

    const panelClass = `${classes.panel} ${isExpanded ? classes.panelExpanded : ""}`;

    return (
        <div className={classes.widgetContainer}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={panelClass}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        role="dialog"
                        aria-label="AI Tutor Chat"
                    >
                        <div className={classes.panelHeader}>
                            <div>
                                <h2 className={classes.panelTitle}>AI Tutor</h2>
                                {currentProblem?.problem && (
                                    <p className={classes.problemHint}>Using your current problem</p>
                                )}
                            </div>
                            <div className={classes.panelActions}>
                                <button
                                    className={classes.headerButton}
                                    onClick={() => setIsExpanded((v) => !v)}
                                    title={isExpanded ? "Compact view" : "Expand"}
                                    aria-label={isExpanded ? "Compact view" : "Expand chat"}
                                >
                                    {isExpanded ? "⊟" : "⊞"}
                                </button>
                                <button
                                    className={classes.headerButton}
                                    onClick={handleClear}
                                    title="Clear chat"
                                    aria-label="Clear chat"
                                >
                                    ↺
                                </button>
                                <button
                                    className={classes.headerButton}
                                    onClick={() => setIsOpen(false)}
                                    title="Minimize"
                                    aria-label="Minimize chat"
                                >
                                    −
                                </button>
                            </div>
                        </div>

                        <div className={classes.controlsRow}>
                            <select
                                className={classes.select}
                                value={chatMode}
                                onChange={(e) => setChatMode(e.target.value)}
                                aria-label="Chat mode"
                            >
                                {CHAT_MODES.map((mode) => (
                                    <option key={mode.id} value={mode.id}>
                                        {mode.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                className={classes.select}
                                value={personality}
                                onChange={(e) => setPersonality(e.target.value)}
                                aria-label="AI personality"
                            >
                                {PERSONALITIES.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={classes.suggestionsRow}>
                            {QUICK_SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className={classes.suggestionChip}
                                    onClick={() => sendMessage(suggestion)}
                                    disabled={isTyping}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>

                        <div className={classes.messagesArea}>
                            <ChatMessagesUI
                                messages={messages}
                                isTyping={isTyping}
                                theme="iMessage"
                                scrollContainerRef={scrollContainerRef}
                                onScroll={handleScroll}
                            />
                        </div>

                        <div className={classes.inputArea}>
                            <textarea
                                className={classes.textInput}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question..."
                                rows={1}
                                aria-label="Chat message"
                            />
                            <button
                                className={classes.sendButton}
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                aria-label="Send message"
                            >
                                ↑
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                className={classes.toggleButton}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={isOpen ? "Close chat" : "Open chat"}
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <span className={classes.toggleIcon} aria-hidden="true">×</span>
                ) : (
                    <svg className={classes.toggleIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h3l3.5 4.5L14 18h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H13l-.5.3-2.2 2.8-2.3-2.8H4V4h16v12z" />
                        <circle cx="8" cy="10" r="1.25" />
                        <circle cx="12" cy="10" r="1.25" />
                        <circle cx="16" cy="10" r="1.25" />
                    </svg>
                )}
            </button>
        </div>
    );
}
