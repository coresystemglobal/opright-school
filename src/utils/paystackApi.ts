import { config } from "../config";

type PaystackResponse<T = Record<string, unknown>> = {
  status: boolean;
  message: string;
  data: T;
};

async function paystackRequest<T = Record<string, unknown>>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: Record<string, unknown>
): Promise<PaystackResponse<T>> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.payments.paystack.secretKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as PaystackResponse<T>;
  if (!json.status) {
    throw new Error(json.message ?? "Paystack API error");
  }
  return json;
}

export const paystackApi = {
  post: <T = Record<string, unknown>>(path: string, body: Record<string, unknown>) =>
    paystackRequest<T>("POST", path, body),

  get: <T = Record<string, unknown>>(path: string) =>
    paystackRequest<T>("GET", path),

  put: <T = Record<string, unknown>>(path: string, body: Record<string, unknown>) =>
    paystackRequest<T>("PUT", path, body),
};
