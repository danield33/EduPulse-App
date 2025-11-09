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

async function prepareScenarioForBackend(scenario: Scenario) {
    const clone = structuredClone(scenario);

    async function convertUrlToBase64(url: string) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }

    for (const block of clone.script) {
        if (block.image?.url?.startsWith("blob:")) {
            block.image.base64 = await convertUrlToBase64(block.image.url);
            delete block.image.url;
        }

        if (block.branch_options) {
            for (const branch of block.branch_options) {
                for (const line of branch.dialogue) {
                    if (line.image?.url?.startsWith("blob:")) {
                        line.image.base64 = await convertUrlToBase64(line.image.url);
                        delete line.image.url;
                    }
                }
            }
        }
    }

    return clone;
}
