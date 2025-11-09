import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2 } from "lucide-react";

export interface Character {
    name: string;
    voice_description: string;
}

interface CharacterPanelProps {
    characters: Record<string, Character>;
    onChange: (updated: Record<string, Character>) => void;
}

export function CharacterPanel({ characters, onChange }: CharacterPanelProps) {
    const [localChars, setLocalChars] = useState<Record<string, Character>>(characters);

    const handleUpdate = (name: string, field: keyof Character, value: string) => {
        const updated = {
            ...localChars,
            [name]: { ...localChars[name], [field]: value },
        };
        setLocalChars(updated);
        onChange(updated);
    };

    const handleAddCharacter = () => {
        const newName = `NewCharacter${Object.keys(localChars).length + 1}`;
        const updated = {
            ...localChars,
            [newName]: { name: newName, voice_description: "" },
        };
        setLocalChars(updated);
        onChange(updated);
    };

    const handleDeleteCharacter = (name: string) => {
        const updated = { ...localChars };
        delete updated[name];
        setLocalChars(updated);
        onChange(updated);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                🎙️ Character Profiles
            </h2>

            <div className="space-y-6">
                {Object.entries(localChars).map(([name, char]) => (
                    <div
                        key={name}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 relative"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                {char.name}
                            </h3>
                            <button
                                onClick={() => handleDeleteCharacter(name)}
                                className="text-red-500 hover:text-red-600"
                                title="Delete character"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={char.voice_description}
                                onChange={(e: { target: { value: string; }; }) =>
                                    handleUpdate(name, "voice_description", e.target.value)
                                }
                                placeholder="Describe how this character should sound and feel..."
                                className="resize-none h-20"
                            />
                        </div>
                    </div>
                ))}

                <Button onClick={handleAddCharacter} className="flex items-center gap-2">
                    <PlusCircle size={18} /> Add Character
                </Button>
            </div>
        </div>
    );
}
