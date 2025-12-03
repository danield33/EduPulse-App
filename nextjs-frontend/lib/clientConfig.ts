import { client } from "@/app/openapi-client/sdk.gen";

export const getApiBaseUrl = () => {
  // In client components (browser), use the public URL
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "https://edupulse.net";
  }
  // In server components (Docker), use internal Docker network
  return process.env.API_BASE_URL || "http://backend:8000";
};

const configureClient = () => {
  const baseURL = getApiBaseUrl();

  client.setConfig({
    baseURL: baseURL,
  });
};

configureClient();