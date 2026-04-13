import { apiClient } from "@/client/api/http";

export type ValidationDetail = {
  path: string;
  message: string;
  code: string;
};

export type ApiErrorShape = {
  error: string;
  message?: string;
  details?: ValidationDetail[];
};

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "PASSENGER" | "ADMIN";
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export type AuthSuccessResponse = {
  user: SessionUser;
  message: string;
};

export async function registerAccount(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthSuccessResponse> {
  const response = await apiClient.post<AuthSuccessResponse>("/api/auth/register", input);
  return response.data;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthSuccessResponse> {
  const response = await apiClient.post<AuthSuccessResponse>("/api/auth/login", input);
  return response.data;
}

export async function logoutAccount(): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/api/auth/logout", {});
  return response.data;
}

export async function getSession(): Promise<SessionResponse> {
  const response = await apiClient.get<SessionResponse>("/api/auth/session", {
    headers: {
      "Cache-Control": "no-store",
    },
  });
  return response.data;
}
