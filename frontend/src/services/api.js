import Swal from "sweetalert2";

export const API_URL = "http://127.0.0.1:8000/api";

function getAccess() {
  return localStorage.getItem("access");
}

function getRefresh() {
  return localStorage.getItem("refresh");
}

async function refreshToken() {
  const refresh = getRefresh();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/accounts/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    });

    const data = await res.json();

    if (data.access) {
      localStorage.setItem("access", data.access);
      return data.access;
    }

    return null;
  } catch {
    return null;
  }
}

async function request(method, endpoint, body, isFile = false) {
  let token = getAccess();

  let headers = {};
  if (!isFile) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: isFile ? body : JSON.stringify(body),
  });

  // If TOKEN EXPIRED → Try refresh
  if (res.status === 401) {
    const newToken = await refreshToken();

    if (!newToken) {
      localStorage.clear();
      Swal.fire({ icon: "error", title: "Session expired" });
      window.location.href = "/signin";
      return { error: "Session expired" };
    }

    // Retry request with NEW token
    res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${newToken}` }),
        ...(isFile ? {} : { "Content-Type": "application/json" }),
      },
      body: isFile ? body : JSON.stringify(body),
    });
  }

  try {
    return await res.json();
  } catch {
    return { error: "Invalid server response" };
  }
}

export function apiGet(endpoint) {
  return request("GET", endpoint);
}

export function apiPost(endpoint, body = {}) {
  return request("POST", endpoint, body);
}

export function apiUpload(endpoint, formData) {
  return request("POST", endpoint, formData, true);
}