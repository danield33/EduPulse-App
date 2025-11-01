import {cookies} from "next/headers";

export async function getAccessToken(){
    const cookieStore = await cookies();
    return cookieStore.get("accessToken")?.value;
}