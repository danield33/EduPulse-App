import React from 'react';

interface DialogueBoxProps {
    speaker: string,
    line: string
}

const DialogueBox = ({speaker, line}: DialogueBoxProps) => {
    return (
        <div className="relative p-4 border rounded-lg shadow bg-white dark:bg-gray-700">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800 dark:text-white">
                    {speaker}
                </h4>
                <button
                    onClick={() => console.log('edit')}
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