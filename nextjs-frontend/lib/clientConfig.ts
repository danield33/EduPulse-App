import { client } from "@/app/openapi-client/sdk.gen";

export const getApiBaseUrl = () => {
  // In client components, use NEXT_PUBLIC_ prefix
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  }
  // In server components, use API_BASE_URL
  return process.env.API_BASE_URL || "http://localhost:8000";
};

const configureClient = () => {
  const baseURL = process.env.API_BASE_URL || "http://localhost:8000";

  client.setConfig({
    baseURL: baseURL,
  });
};

configureClient();
