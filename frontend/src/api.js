const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Backend request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.detail) message = payload.detail;
    } catch {
      // Keep the HTTP error message when the server does not return JSON.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function predictHbA1cFromReadings(readings) {
  return requestApi("/api/v1/hba1c/predict", {
    method: "POST",
    body: JSON.stringify({ readings }),
  });
}

export async function getInsulinPatient(patientId) {
  return requestApi(`/api/v1/patients/${encodeURIComponent(patientId)}`);
}

export async function createInsulinPatient(patient) {
  return requestApi("/api/v1/patients", {
    method: "POST",
    body: JSON.stringify(patient),
  });
}

export async function predictMealInsulin(patientId, meal) {
  return requestApi(`/api/v1/patients/${encodeURIComponent(patientId)}/predict-food`, {
    method: "POST",
    body: JSON.stringify(meal),
  });
}

export async function calibrateInsulinModel(patientId, calibration) {
  return requestApi(`/api/v1/patients/${encodeURIComponent(patientId)}/quick-calibrate`, {
    method: "POST",
    body: JSON.stringify(calibration),
  });
}

export async function sendChatMessage(messages) {
  return requestApi("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

export async function getInsulinPredictionHistory(patientId, limit = 20) {
  return requestApi(`/api/v1/patients/${encodeURIComponent(patientId)}/history?limit=${limit}`);
}

export { API_BASE_URL };
