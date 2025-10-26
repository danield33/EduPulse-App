import {GetMyLessonsData} from "@/app/openapi-client";


/**
 * Fetches the current user's lessons.
 */
export async function fetchMyLessons({
  page = 1,
  size = 10,
  sort_by = "created_at",
  order = "desc",
}: GetMyLessonsData = {}): Promise<LessonsResponse> {
  const offset = (page - 1) * size;
  const url = new URL(`${API_URL}/lessons/my`);
  url.searchParams.set("limit", size.toString());
  url.searchParams.set("offset", offset.toString());
  url.searchParams.set("sort_by", sort_by);
  url.searchParams.set("order", order);

  const res = await fetch(url.toString(), {
    credentials: "include", // include cookies/session if needed
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch lessons: ${res.statusText}`);
  }

  const data: Lesson[] = await res.json();
  return {
    items: data,
    total: data.length, // (replace later if backend includes pagination metadata)
  };
}