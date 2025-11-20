import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

export function SortableItem({id, children}: { id: string; children: React.ReactNode }) {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id});
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