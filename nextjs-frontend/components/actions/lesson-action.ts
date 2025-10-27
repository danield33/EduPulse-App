import {GetMyLessonsData} from "@/app/openapi-client";


/**
 * Fetches the current user's lessons.
 */
export async function fetchMyLessons({
                                         query
                                     }: GetMyLessonsData = {}): Promise<any> {
    const {
        limit = 10,
        offset = 1,
        sort_by = "created_at",
        order = "desc",
    } = query!;
    const url = new URL(`http://0.0.0.0:8000/lessons/my`);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("sort_by", sort_by);
    url.searchParams.set("order", order);

    const res = await fetch(url.toString(), {
        credentials: "include", // include cookies/session if needed
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch lessons: ${res.statusText}`);
    }

    const data = await res.json();
    return {
        items: data,
        total: data.length, // (replace later if backend includes pagination metadata)
    };
}