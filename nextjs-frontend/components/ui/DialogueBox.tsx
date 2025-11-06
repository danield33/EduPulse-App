import React from 'react';
import { ImageIcon } from "lucide-react";

interface DialogueBoxProps {
    speaker: string,
    line: string,
    onEdit?: () => void;
    image?: {url?: string; prompt?: string};
}

const DialogueBox = ({speaker, line, onEdit, image}: DialogueBoxProps) => {
    return (
        <div className="relative p-4 border rounded-lg shadow bg-white dark:bg-gray-700 w-full">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800 dark:text-white">
                        {speaker}
                    </h4>

                    {image?.url && (
                        <ImageIcon
                            size={18}
                            className="text-blue-500 dark:text-blue-400"
                            // title="This dialogue has an image"
                        />
                    )}
                </div>

                <button
                    onClick={onEdit}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Edit
                </button>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mt-2">
                {line}
            </p>
        </div>
    );
};

export default DialogueBox;