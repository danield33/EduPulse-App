"use client";

import {DropdownMenuItem} from "@/components/ui/dropdown-menu";

interface DeleteButtonProps {
    itemId: string;
}

export function DeleteButton({}: DeleteButtonProps) {
    const handleDelete = async () => {
        // await removeItem(itemId);
    };

    return (
        <DropdownMenuItem
            className="text-red-500 cursor-pointer"
            onClick={handleDelete}
        >
            Delete
        </DropdownMenuItem>
    );
}
