import { useState, useEffect } from "react";
import DrawingCanvas from "./DrawingCanvas";
import classes from "./InteractiveWhiteboard.module.css";

const MANIPULATIVE_LABELS = {
    number: "Number",
    plus: "+",
    minus: "−",
    multiply: "×",
    divide: "÷",
    equals: "=",
};

export default function InteractiveWhiteboard() {
    const [manipulatives, setManipulatives] = useState([]);
    const [problemText, setProblemText] = useState("");
    const [solutionSteps, setSolutionSteps] = useState([]);
    const [showEquationEditor, setShowEquationEditor] = useState(false);
    const [equations, setEquations] = useState([]);
    const [saveMessage, setSaveMessage] = useState(null);

    useEffect(() => {
        const savedProblem = sessionStorage.getItem("whiteboardProblem");
        if (savedProblem) {
            try {
                const { problem, topic } = JSON.parse(savedProblem);
                setProblemText(problem || "");
                if (topic) {
                    setSolutionSteps([{
                        id: Date.now(),
                        text: `Topic: ${topic}`,
                        timestamp: new Date().toLocaleTimeString(),
                    }]);
                }
                sessionStorage.removeItem("whiteboardProblem");
            } catch {
                // ignore malformed session data
            }
        }

        const savedData = localStorage.getItem("whiteboardData");
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                setManipulatives(data.manipulatives || []);
                if (!savedProblem) {
                    setProblemText(data.problemText || "");
                    setSolutionSteps(data.solutionSteps || []);
                }
            } catch {
                // ignore malformed local data
            }
        }
    }, []);

    useEffect(() => {
        if (!saveMessage) return;
        const timer = setTimeout(() => setSaveMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [saveMessage]);

    const addManipulative = (type) => {
        const manipulative = {
            id: Date.now(),
            type,
            x: Math.random() * 400 + 50,
            y: Math.random() * 300 + 50,
            value: type === "number" ? Math.floor(Math.random() * 20) + 1 : type,
            color: getManipulativeColor(type),
        };
        setManipulatives((prev) => [...prev, manipulative]);
    };

    const getManipulativeColor = (type) => {
        const colors = {
            number: "#007aff",
            plus: "#34c759",
            minus: "#ff3b30",
            multiply: "#ff9500",
            divide: "#5856d6",
            equals: "#8e8e93",
        };
        return colors[type] || "#000000";
    };

    const addSolutionStep = (step) => {
        setSolutionSteps((prev) => [
            ...prev,
            {
                id: Date.now(),
                text: step,
                timestamp: new Date().toLocaleTimeString(),
            },
        ]);
    };

    const addEquation = (latex) => {
        setEquations((prev) => [
            ...prev,
            {
                id: Date.now(),
                latex,
                x: 100,
                y: 100,
            },
        ]);
    };

    const saveWork = () => {
        const whiteboardData = {
            manipulatives,
            problemText,
            solutionSteps,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem("whiteboardData", JSON.stringify(whiteboardData));
        setSaveMessage("Work saved successfully");
    };

    const loadWork = () => {
        const savedData = localStorage.getItem("whiteboardData");
        if (!savedData) {
            setSaveMessage("No saved work found");
            return;
        }

        const data = JSON.parse(savedData);
        setManipulatives(data.manipulatives || []);
        setProblemText(data.problemText || "");
        setSolutionSteps(data.solutionSteps || []);
        setSaveMessage("Work loaded successfully");
    };

    const getManipulativeDisplay = (manip) => {
        if (manip.type === "number") return manip.value;
        return MANIPULATIVE_LABELS[manip.type] || manip.type;
    };

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <h1 className={classes.title}>Interactive Whiteboard</h1>
                <p className={classes.subtitle}>
                    Visual problem-solving workspace with math manipulatives
                </p>
            </header>

            {saveMessage && (
                <div className={classes.saveBanner} role="status">
                    {saveMessage}
                </div>
            )}

            <div className={classes.workspace}>
                <aside className={classes.toolbar}>
                    <div className={classes.toolGroup}>
                        <h4 className={classes.toolGroupLabel}>Math Manipulatives</h4>
                        <div className={classes.tools}>
                            {Object.entries(MANIPULATIVE_LABELS).map(([type, label]) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={classes.tool}
                                    onClick={() => addManipulative(type)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={classes.toolGroup}>
                        <h4 className={classes.toolGroupLabel}>Equations</h4>
                        <div className={classes.tools}>
                            <button
                                type="button"
                                className={classes.tool}
                                onClick={() => setShowEquationEditor(!showEquationEditor)}
                            >
                                Equation Editor
                            </button>
                            <button
                                type="button"
                                className={classes.tool}
                                onClick={() => addEquation("x^2 + y^2 = r^2")}
                            >
                                Circle Equation
                            </button>
                            <button
                                type="button"
                                className={classes.tool}
                                onClick={() => addEquation("y = mx + b")}
                            >
                                Linear Equation
                            </button>
                        </div>
                    </div>

                    <div className={classes.toolGroup}>
                        <h4 className={classes.toolGroupLabel}>Actions</h4>
                        <div className={classes.actionButtons}>
                            <button type="button" className={classes.primaryBtn} onClick={saveWork}>
                                Save Work
                            </button>
                            <button type="button" className={classes.secondaryBtn} onClick={loadWork}>
                                Load Work
                            </button>
                        </div>
                    </div>
                </aside>

                <div className={classes.mainArea}>
                    <div className={classes.canvasArea}>
                        <div className={classes.canvasContainer}>
                            <DrawingCanvas
                                backgroundColor="#FFFFFF"
                                showToolbar={true}
                                toolbarBackground="rgba(255, 255, 255, 0.95)"
                                toolbarTextColor="#1e293b"
                                toolbarPosition="bottom"
                                toolbarAlignment="center"
                                enableAutoSave={true}
                                enableGrid={true}
                                gridSize={20}
                                gridColor="#E2E8F0"
                            />

                            {equations.map((equation) => (
                                <div
                                    key={equation.id}
                                    className={classes.equation}
                                    style={{
                                        left: equation.x,
                                        top: equation.y,
                                    }}
                                >
                                    <div className={classes.equationContent}>
                                        {equation.latex}
                                    </div>
                                </div>
                            ))}

                            {manipulatives.map((manip) => (
                                <div
                                    key={manip.id}
                                    className={classes.manipulative}
                                    style={{
                                        left: manip.x,
                                        top: manip.y,
                                        backgroundColor: manip.color,
                                        color: "white",
                                    }}
                                    draggable
                                >
                                    {getManipulativeDisplay(manip)}
                                </div>
                            ))}
                        </div>

                        <aside className={classes.sidePanel}>
                            <div className={classes.section}>
                                <h4 className={classes.sectionLabel}>Problem Statement</h4>
                                <textarea
                                    value={problemText}
                                    onChange={(e) => setProblemText(e.target.value)}
                                    placeholder="Enter the math problem here..."
                                    className={classes.problemInput}
                                />
                            </div>

                            <div className={classes.section}>
                                <h4 className={classes.sectionLabel}>Solution Steps</h4>
                                <div className={classes.stepInput}>
                                    <input
                                        type="text"
                                        placeholder="Add a solution step..."
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && e.target.value.trim()) {
                                                addSolutionStep(e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                        className={classes.stepField}
                                    />
                                </div>
                                <div className={classes.stepsList}>
                                    {solutionSteps.length === 0 ? (
                                        <p className={classes.emptySteps}>
                                            No steps yet — press Enter to add
                                        </p>
                                    ) : (
                                        solutionSteps.map((step) => (
                                            <div key={step.id} className={classes.step}>
                                                <span className={classes.stepTime}>{step.timestamp}</span>
                                                <span className={classes.stepText}>{step.text}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            {showEquationEditor && (
                <div className={classes.modalOverlay}>
                    <div className={classes.equationModal}>
                        <div className={classes.modalHeader}>
                            <h3>Equation Editor</h3>
                            <button
                                type="button"
                                className={classes.closeBtn}
                                onClick={() => setShowEquationEditor(false)}
                                aria-label="Close equation editor"
                            >
                                ×
                            </button>
                        </div>
                        <div className={classes.modalContent}>
                            <div className={classes.equationTemplates}>
                                <h4>Quick Templates</h4>
                                <div className={classes.templateGrid}>
                                    <button
                                        type="button"
                                        className={classes.templateBtn}
                                        onClick={() => addEquation("x^2 + y^2 = r^2")}
                                    >
                                        Circle
                                    </button>
                                    <button
                                        type="button"
                                        className={classes.templateBtn}
                                        onClick={() => addEquation("y = mx + b")}
                                    >
                                        Linear
                                    </button>
                                    <button
                                        type="button"
                                        className={classes.templateBtn}
                                        onClick={() => addEquation("ax^2 + bx + c = 0")}
                                    >
                                        Quadratic
                                    </button>
                                    <button
                                        type="button"
                                        className={classes.templateBtn}
                                        onClick={() => addEquation("sin(x) = cos(x)")}
                                    >
                                        Trigonometry
                                    </button>
                                    <button
                                        type="button"
                                        className={classes.templateBtn}
                                        onClick={() => addEquation("∫ f(x) dx")}
                                    >
                                        Integral
                                    </button>
                                    <button
                                        type="button"
                                        className={classes.templateBtn}
                                        onClick={() => addEquation("lim(x→0) f(x)")}
                                    >
                                        Limit
                                    </button>
                                </div>
                            </div>
                            <div className={classes.customEquation}>
                                <h4>Custom Equation</h4>
                                <input
                                    type="text"
                                    placeholder="Enter LaTeX equation..."
                                    className={classes.equationInput}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && e.target.value.trim()) {
                                            addEquation(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
