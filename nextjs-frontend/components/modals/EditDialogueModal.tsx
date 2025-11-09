import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {useEffect, useState} from "react";

interface EditDialogueModalProps {
    isOpen: boolean;
    speaker: string;
    text: string;
    onClose: () => void;
    onSave: (updated: { speaker: string; dialogue: string }) => void;
    onDelete?: () => void;
}

export function EditDialogueModal({
                                              isOpen,
                                              speaker,
                                              text,
                                              onClose,
                                              onSave,
                                              onDelete,
                                          }: EditDialogueModalProps) {
    const [speakerValue, setSpeakerValue] = useState(speaker);
    const [dialogueValue, setDialogueValue] = useState(text);

    useEffect(() => {
        if (isOpen) {
            setSpeakerValue(speaker);
            setDialogueValue(text);
        }
    }, [isOpen, speaker, text]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                            Edit Dialogue
                        </h3>

                        {/* Speaker Input */}
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Speaker
                        </label>
                        <input
                            type="text"
                            value={speakerValue}
                            onChange={(e) => setSpeakerValue(e.target.value)}
                            className="w-full border rounded-md p-2 mb-4 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring focus:ring-blue-300"
                            placeholder="e.g. Teacher, Narrator, Character A"
                        />

                        {/* Dialogue Textarea */}
                        <textarea
                            value={dialogueValue}
                            onChange={(e) => setDialogueValue(e.target.value)}
                            className="w-full h-32 border rounded-md p-2 mb-4 bg-gray-50 dark:bg-gray-900 dark:text-white resize-none focus:ring focus:ring-blue-300"
                        />

                        {/* Buttons */}
                        <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                            {onDelete && (
                                <Button
                                    variant="destructive"
                                    onClick={onDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Delete
                                </Button>
                            )}

                            <div className="flex space-x-3 ml-auto">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="text-gray-600"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() =>
                                        onSave({
                                            speaker: speakerValue,
                                            dialogue: dialogueValue,
                                        })
                                    }
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
