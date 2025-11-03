import {useState} from "react";
import DialogueBox from "@/components/ui/DialogueBox";
import {Card} from "@/components/ui/card";
import {AnimatePresence, motion} from "framer-motion";
import {Button} from "@/components/ui/button";
import {arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable} from "@dnd-kit/sortable";
import {closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import {CSS} from "@dnd-kit/utilities";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {PlusCircle} from "lucide-react";
import {ScriptContentButton} from "@/components/ui/ScriptContentButton";

export interface DialogueLine {
    role: string;
    dialogue: string;
}

export interface BranchOption {
    type: string;
    dialogue: DialogueLine[];
}

export interface ScriptBlock {
    role: string;
    dialogue: string;
    branch_options?: BranchOption[];
}

export interface Scenario {
    title: string;
    script: ScriptBlock[];
}


export default function DialogueEditor({scenario: globalScenario}: { scenario: Scenario }) {
    const [scenario, setScenario] = useState<Scenario>(globalScenario);
    const [editing, setEditing] = useState<{ speaker?: string; line?: string; path?: string } | null>(null);
    const [newText, setNewText] = useState("");

    const handleEdit = (speaker: string, line: string, path: string) => {
        setEditing({speaker, line, path});
        setNewText(line);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    const saveEdit = () => {
        if (!editing) return;

        const updated = structuredClone(scenario);
        const pathParts = editing.path!.split(".");
        let target: any = updated;

        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]];
        }

        const lastKey = pathParts[pathParts.length - 1];
        target[lastKey].dialogue = newText;
        target[lastKey].role = editing.speaker;

        setScenario(updated);
        setEditing(null);
    };


    const handleDragEnd = (event: any) => {
        const {active, over} = event;
        if (!over || active.id === over.id) return;

        const oldIndex = scenario.script.findIndex(
            (_, i) => `item-${i}` === active.id
        );
        const newIndex = scenario.script.findIndex(
            (_, i) => `item-${i}` === over.id
        );

        if (oldIndex === -1 || newIndex === -1) return;

        const newScript = arrayMove(scenario.script, oldIndex, newIndex);
        setScenario({...scenario, script: newScript});
    };

    const handleAddDialogueBox = (index: number) => {
        const updated = structuredClone(scenario);

        const newDialogue = {
            role: "Narrator",
            dialogue: "New dialogue line...",
        };

        // Insert the new dialogue line right after the clicked index
        updated.script.splice(index + 1, 0, newDialogue);

        setScenario(updated);
    };

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                EduPulse Scenario Editor
            </h2>

            {/* Main Dialogue */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={scenario.script.map((_, i) => `item-${i}`)}>

                    {scenario.script.map((block, i) =>
                        <SortableItem key={`item-${i}`} id={`item-${i}`}>
                            {block.branch_options ? (
                            <div key={i} className="mt-4">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                    Branching Dialogue Options
                                </h3>
                                {block.branch_options?.map((branch, j) => (
                                    <div key={j} className="group realtive items-center flex flex-col w-full">
                                        <Card className="p-4 mt-3 bg-gray-50 dark:bg-gray-800 w-full">
                                            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                                {branch.type}
                                            </h4>
                                            {branch.dialogue.map((line: any, k: number) => (
                                                <DialogueBox
                                                    key={k}
                                                    speaker={line.role}
                                                    line={line.dialogue}
                                                    onEdit={() =>
                                                        handleEdit(
                                                            line.role,
                                                            line.dialogue,
                                                            `script.${i}.branch_options.${j}.dialogue.${k}`
                                                        )
                                                    }
                                                />
                                            ))}
                                        </Card>
                                        <ScriptContentButton/>
                                    </div>
                                ))}
                            </div>
                            ) : (
                            <div className="group realtive items-center flex flex-col">
                                <DialogueBox
                                    key={i}
                                    speaker={block.role!}
                                    line={block.dialogue!}
                                    onEdit={() => handleEdit(block.role, block.dialogue, `script.${i}`)}
                                />
                                <ScriptContentButton onAddDialogue={() => handleAddDialogueBox(i)}/>
                            </div>
                            )}
                        </SortableItem>
                    )}
                </SortableContext>

            </DndContext>

            {/* Edit Modal */}
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                Edit Dialogue
                            </h3>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Speaker
                            </label>
                            <input
                                type="text"
                                value={editing.speaker || ""}
                                onChange={(e) =>
                                    setEditing({...editing, speaker: e.target.value})
                                }
                                className="w-full border rounded-md p-2 mb-4 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring focus:ring-blue-300"
                                placeholder="e.g. Teacher, Narrator, Character A"
                            />
                            <textarea
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                className="w-full h-32 border rounded-md p-2 mb-4 bg-gray-50 dark:bg-gray-900 dark:text-white resize-none focus:ring focus:ring-blue-300"
                            />
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                    className="text-gray-600"
                                >
                                    Cancel
                                </Button>
                                <Button onClick={saveEdit}>Save</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Save JSON */}
            <div className="pt-6 border-t">
                <Button
                    onClick={() => {
                        const blob = new Blob([JSON.stringify(scenario, null, 2)], {
                            type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "scenario.json";
                        a.click();
                    }}
                >
                    Download Updated JSON
                </Button>
            </div>
        </div>
    );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group border border-transparent hover:border-gray-300 rounded-md"
            {...attributes}
        >
            <div
                {...listeners}
                className="absolute -left-6 top-4 cursor-grab text-gray-400 group-hover:text-gray-600 select-none"
                title="Drag to reorder"
            >
                ⋮⋮
            </div>
            {children}
        </div>
    );
}