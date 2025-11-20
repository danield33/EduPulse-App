import {GetMyLessonsData, getMyLessons} from "@/app/openapi-client";
import {cookies} from "next/headers";
import {getUser} from "@/components/actions/user-action";
import {getAccessToken} from "@/components/actions/cookie-action";
import {Scenario} from "@/components/ui/DialogueEditor";


/**
 * Fetches the current user's lessons.
 */
const DEFAULT_QUERY = {
    limit: 10,
    offset: 1,
    sort_by: "created_at",
    order: "desc",
} as const;
export async function fetchMyLessons({
                                         query
                                     }: GetMyLessonsData = {}): Promise<any> {

    const token = await getAccessToken();
    if (!token) {
        return {message: "No access token found"};
    }

    if(!query) query = DEFAULT_QUERY;
    const {data} = await getMyLessons({
        query: query,
        headers: {"Authorization": `Bearer ${token}`},
    })
    return {
        items: data,
    };
}
