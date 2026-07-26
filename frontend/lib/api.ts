import type {
  AssetBucket,
  AuthResponse,
  DashboardResponse,
  UploadResponse,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("lpb_token");
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    ...(headers || {}),
  };

  const isFormData = rest.body instanceof FormData;
  if (!isFormData) {
    (finalHeaders as Record<string, string>)["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      (finalHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      0
    );
  }

  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {
      // no body
    }
    const message =
      (detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : undefined) || res.statusText || "Something went wrong.";
    throw new ApiError(message, res.status, detail);
  }

  if (res.status === 204) return undefined as T;

  try {
    return (await res.json()) as T;
  } catch {
    return undefined as T;
  }
}

// --- Auth ---------------------------------------------------------------

export function signup(email: string, password: string) {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
}

// --- Onboarding -----------------------------------------------------------

export function setBucket(asset_bucket: AssetBucket) {
  return request<{ asset_bucket: AssetBucket }>("/user/bucket", {
    method: "POST",
    body: JSON.stringify({ asset_bucket }),
  });
}

// --- Transactions -----------------------------------------------------------

export function uploadCsv(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResponse>("/transactions/upload", {
    method: "POST",
    body: formData,
  });
}

/**
 * Same endpoint as uploadCsv, but via XMLHttpRequest so we can report
 * real upload progress for the drop zone's progress bar.
 */
export function uploadCsvWithProgress(
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/transactions/upload`);

    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: unknown = undefined;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // no/invalid body
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResponse);
      } else {
        const message =
          (body && typeof body === "object" && "detail" in body
            ? String((body as { detail: unknown }).detail)
            : undefined) || "Upload failed. Check the file and try again.";
        reject(new ApiError(message, xhr.status, body));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError("Can't reach the server. Check your connection and try again.", 0));
    };

    xhr.send(formData);
  });
}

// --- Dashboard -----------------------------------------------------------

export function getDashboardSummary() {
  return request<DashboardResponse>("/dashboard/summary", { method: "GET" });
}

export function refreshPrices() {
  return request<{ price_updated_at: string }>("/prices/refresh", {
    method: "POST",
  });
}
