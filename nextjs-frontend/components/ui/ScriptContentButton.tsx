import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {PlusCircle} from "lucide-react";
import {JSX} from "react";

interface ScriptContentButtonProps {
    onAddBreakpoint?: () => void;
    onAddImage?: () => void;
    onAddDialogue?: () => void;
    onAddBranching?: () => void;
}

export function ScriptContentButton({
                                 onAddBreakpoint,
                                 onAddImage,
                                 onAddDialogue,
                                 onAddBranching,
                             }: ScriptContentButtonProps): JSX.Element {

    const menuItems = [
        { label: "➕ Add Breakpoint", handler: onAddBreakpoint },
        { label: "🖼️ Add Image", handler: onAddImage },
        { label: "💬 Add Dialogue Box", handler: onAddDialogue },
        { label: "🌿 Add Branching Dialogue", handler: onAddBranching },
    ];


    return (
        <div className="relative w-full flex justify-center mt-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-sm
                       text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Content
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="center" className="w-52">
                    {menuItems.map((item, i) => (
                        <DropdownMenuItem
                            key={i}
                            onClick={item.handler}
                            disabled={!item.handler} // disables when no function provided
                            className={
                                !item.handler
                                    ? "pointer-events-none opacity-50 text-gray-400 dark:text-gray-500"
                                    : ""
                            }
                        >
                            {item.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}