import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";

type RetryConfig = {
  __retryCount?: number;
  __skipRetry?: boolean;
};

const MAX_RETRIES = 1;

function getBaseURL(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined" && !navigator.onLine) {
    return Promise.reject(new Error("You are offline. Please reconnect and try again."));
  }

  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = (error.config || {}) as AxiosError["config"] & RetryConfig;

    if (status === 401 && typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const authRoutes = ["/auth/login", "/auth/register"];
      if (!authRoutes.includes(pathname)) {
        window.location.assign("/auth/login");
      }
      return Promise.reject(error);
    }

    const retriableStatuses = [408, 429, 500, 502, 503, 504];
    const shouldRetry =
      !config.__skipRetry &&
      (status === undefined || retriableStatuses.includes(status));

    if (shouldRetry) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        await sleep(250 * config.__retryCount);
        return apiClient.request(config);
      }
    }

    return Promise.reject(error);
  },
);

export function toApiMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) {
      return message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
