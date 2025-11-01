"use server";

import {cookies} from "next/headers";
// import { readItem, deleteItem, createItem } from "@/app/clientService";
import {UserRead, usersCurrentUser} from "@/app/clientService"

export async function getUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
        return {message: "No access token found"};
    }
    const user = await usersCurrentUser({
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return user.data;

}