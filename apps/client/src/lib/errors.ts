import axios from "axios";

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data;
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
