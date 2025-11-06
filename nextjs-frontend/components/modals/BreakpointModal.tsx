import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {useEffect, useState} from "react";

interface BreakpointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { question: string; options: { text: string; isCorrect: boolean }[] }) => void;
    breakpoint?: { question: string; options: { text: string; isCorrect: boolean }[] }
}

export function BreakpointModal({ isOpen, onClose, onSave, breakpoint }: BreakpointModalProps) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
    ]);

    useEffect(() => {
        if(breakpoint){
            setQuestion(breakpoint.question);
            setOptions(breakpoint.options);
        }else{
            setQuestion("");
            setOptions([]);
        }
    }, [breakpoint]);

    const addOption = () => {
        setOptions([...options, { text: "", isCorrect: false }]);
    };

    const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
        const updated = [...options];
        (updated[index] as any)[field] = value;
        setOptions(updated);
    };

    const handleSave = () => {
        if (!question.trim()) return alert("Please enter a question.");
        if(options.length <= 0) return alert("Please enter at least one option.")
        onSave({ question, options });
        setQuestion("");
        setOptions([
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
        ]);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[28rem] shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                            Create Breakpoint Question
                        </h3>

                        {/* Question Input */}
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Question
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="w-full border rounded-md p-2 mb-4 bg-gray-50 dark:bg-gray-900 dark:text-white h-20 resize-none focus:ring focus:ring-blue-300"
                            placeholder="e.g. What should the teacher do next?"
                        />

                        {/* Options */}
                        <div className="space-y-3">
                            {options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => updateOption(i, "text", e.target.value)}
                                        placeholder={`Option ${i + 1}`}
                                        className="flex-1 border rounded-md p-2 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring focus:ring-blue-300"
                                    />
                                    <label className="flex items-center gap-1 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={opt.isCorrect}
                                            onChange={(e) => updateOption(i, "isCorrect", e.target.checked)}
                                        />
                                        Correct
                                    </label>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addOption}>
                                + Add Option
                            </Button>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
