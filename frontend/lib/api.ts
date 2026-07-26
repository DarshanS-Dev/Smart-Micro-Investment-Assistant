import type {
  AssetBucket,
  AuthResponse,
  DashboardResponse,
  UploadResponse,
  UserOut,
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

/**
 * Registered by AuthProvider so that a 401 from ANY request (token expired —
 * the backend issues a flat 24h JWT with no refresh endpoint, see README gap
 * notes) triggers a real logout + redirect instead of a silently broken UI.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
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
    // FastAPI's default error shape is { detail: string }. The one place
    // this app raises row-level CSV errors (transactions/upload) also just
    // uses a plain string (see app/routers/transactions.py::_parse_csv) —
    // there is NO structured { row, message }[] shape from this backend,
    // so we never try to parse one.
    const message =
      (detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : undefined) || res.statusText || "Something went wrong.";

    if (res.status === 401 && auth) {
      onUnauthorized?.();
    }

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
// Backend route is POST /auth/register, not /auth/signup.

export function signup(email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
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
// Backend route is POST /onboarding/asset-bucket and returns the full
// UserOut (not just { asset_bucket }).

export function setBucket(asset_bucket: AssetBucket) {
  return request<UserOut>("/onboarding/asset-bucket", {
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
        if (xhr.status === 401) onUnauthorized?.();
        // Backend's 422 detail is a plain string (see _parse_csv in
        // app/routers/transactions.py) — never a structured list.
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
// Backend route is GET /dashboard (not /dashboard/summary). It has no
// `has_data` field and no dedicated refresh endpoint — prices are computed
// live via yfinance on every call, so re-fetching IS the refresh.
// It returns 400 (not 404) if the user hasn't picked an asset bucket yet.

export function getDashboard() {
  return request<DashboardResponse>("/dashboard", { method: "GET" });
}

/**
 * GAP: there is no POST /prices/refresh endpoint on the backend.
 * app/services/portfolio.py::build_dashboard already recomputes current
 * prices from yfinance on every GET /dashboard call, so a "refresh" is
 * just re-fetching the dashboard. This function exists only so callers
 * don't need to know that — it is NOT a distinct backend capability.
 */
export function refreshDashboard() {
  return getDashboard();
}