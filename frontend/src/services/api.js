import Swal from "sweetalert2";

export const API_URL = "http://127.0.0.1:8000/api";

// -------------------------
// GET TOKENS
// -------------------------
function getAccess() {
  return localStorage.getItem("access");
}

function getRefresh() {
  return localStorage.getItem("refresh");
}

// -------------------------
// REFRESH TOKEN
// -------------------------
async function refreshToken() {
  const refresh = getRefresh();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/accounts/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    const data = await res.json();

    if (data.access) {
      localStorage.setItem("access", data.access);
      return data.access;
    }
  } catch (e) {
    console.log("Refresh token failed:", e);
  }

  return null;
}

// -------------------------
// MAIN REQUEST WRAPPER
// -------------------------
async function request(method, endpoint, body = null, isFile = false) {
  let token = getAccess();

  const headers = {};
  if (!isFile) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_URL}${endpoint}`;

  let res = await fetch(url, {
    method,
    headers,
    body: isFile ? body : body ? JSON.stringify(body) : null,
  });

  // -------------------------
  // HANDLE TOKEN EXPIRE
  // -------------------------
  if (res.status === 401) {
    const newToken = await refreshToken();

    if (!newToken) {
      Swal.fire({ icon: "error", title: "Session expired" });
      localStorage.clear();
      window.location.href = "/signin";
      return { error: "Session expired" };
    }

    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${newToken}`,
        ...(isFile ? {} : { "Content-Type": "application/json" }),
      },
      body: isFile ? body : body ? JSON.stringify(body) : null,
    });
  }

  // -------------------------
  // SAFE JSON PARSE
  // -------------------------
  try {
    const json = await res.json();
    return json || { error: "Empty response" };
  } catch {
    return { error: "Invalid JSON response" };
  }
}

export const apiGet = (endpoint) => request("GET", endpoint);
export const apiPost = (endpoint, body = {}) => request("POST", endpoint, body);
export const apiUpload = (endpoint, formData) =>
  request("POST", endpoint, formData, true);