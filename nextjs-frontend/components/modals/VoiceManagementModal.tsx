// VoiceManagementModal.tsx
"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mic, Trash2, Plus, X } from "lucide-react";

interface VoiceManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    characters: Record<string, string>; // { "Narrator": "A man with a deep voice" }
    onSave: (characters: Record<string, string>) => void;
    availableRoles: string[]; // All roles used in the script
}

export function VoiceManagementModal({
                                         isOpen,
                                         onClose,
                                         characters,
                                         onSave,
                                         availableRoles,
                                     }: VoiceManagementModalProps) {
    const [localCharacters, setLocalCharacters] = useState<Record<string, string>>(characters);
    const [newRole, setNewRole] = useState("");

    useEffect(() => {
        if (isOpen) {
            // Initialize with existing characters and add any new roles from script
            const updated = { ...characters };
            availableRoles.forEach((role) => {
                if (!(role in updated)) {
                    updated[role] = ""; // Empty voice description for new roles
                }
            });
            setLocalCharacters(updated);
        }
    }, [isOpen, characters, availableRoles]);

    const handleVoiceChange = (role: string, voice: string) => {
        setLocalCharacters({
            ...localCharacters,
            [role]: voice,
        });
    };

    const handleAddCustomRole = () => {
        if (newRole.trim() && !(newRole in localCharacters)) {
            setLocalCharacters({
                ...localCharacters,
                [newRole.trim()]: "",
            });
            setNewRole("");
        }
    };

    const handleDeleteRole = (role: string) => {
        const updated = { ...localCharacters };
        delete updated[role];
        setLocalCharacters(updated);
    };

    const handleSave = () => {
        onSave(localCharacters);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic className="h-5 w-5" />
                            <h2 className="text-xl font-semibold">Manage Character Voices</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Specify voice descriptions for each character in your scenario.
                        These will be used for text-to-speech generation.
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        {/* List of characters */}
                        {Object.keys(localCharacters).length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                No characters found. Add dialogue to your script first.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(localCharacters).map(([role, voice]) => (
                                    <Card key={role} className="p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-base font-semibold">
                                                    {role}
                                                </Label>
                                                {!availableRoles.includes(role) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteRole(role)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <textarea
                                                placeholder="e.g., A man with a deep, authoritative voice"
                                                value={voice}
                                                onChange={(e) => handleVoiceChange(role, e.target.value)}
                                                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            />
                                            {availableRoles.includes(role) && (
                                                <p className="text-xs text-gray-500">
                                                    Used in script
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Add custom role */}
                        <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Add Custom Character</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Character name"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddCustomRole();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={handleAddCustomRole}
                                        variant="outline"
                                        disabled={!newRole.trim() || newRole in localCharacters}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600">
                        Save Voices
                    </Button>
                </div>
            </div>
        </div>
    );
}

// VoiceIndicator.tsx - Small component to show if a role has a voice set
export function VoiceIndicator({ hasVoice }: { hasVoice: boolean }) {
    if (!hasVoice) return null;

    return (
        <div className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <Mic className="h-3 w-3" />
        </div>
    );
}