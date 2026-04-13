import { toast } from "sonner";

export interface ValidationDetail {
  path: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  error?: string;
  code?: string;
  message: string;
  details?: ValidationDetail[];
}

type UnknownErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
  code?: string;
};

export function getErrorMessage(error: unknown, defaultMessage: string = "Something went wrong"): string {
  const err = error as UnknownErrorShape;

  // Axios response error
  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  // Network error
  if (err.message?.includes("ERR_NETWORK") || err.code === "ERR_NETWORK") {
    return "Check your internet connection";
  }

  // Timeout
  if (err.code === "ECONNABORTED") {
    return "Request timed out; please try again";
  }

  // Fallback
  return defaultMessage;
}

export function showErrorToast(error: unknown, defaultMessage?: string) {
  const message = getErrorMessage(error, defaultMessage);
  toast.error(message);
}

export function showSuccessToast(message: string) {
  toast.success(message);
}

export function toFieldErrors(details?: ValidationDetail[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const detail of details || []) {
    if (!errors[detail.path]) {
      errors[detail.path] = detail.message;
    }
  }
  return errors;
}
