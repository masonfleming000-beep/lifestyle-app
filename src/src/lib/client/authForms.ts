// @ts-nocheck
import type { AuthClientConfig } from "../../config/pages/auth";

function getFormElement(formId: string) {
  return document.getElementById(formId);
}

function getMessageElement(messageId: string) {
  return document.getElementById(messageId);
}

function setMessage(messageElement: HTMLElement | null, text: string, isError = false) {
  if (!messageElement) return;
  messageElement.textContent = text;
  messageElement.style.display = text ? "block" : "none";
  messageElement.style.color = isError ? "#b42318" : "";
}

function collectPayload(form: HTMLFormElement, fields: string[]) {
  const formData = new FormData(form);
  return fields.reduce((payload, fieldName) => {
    const rawValue = formData.get(fieldName);
    payload[fieldName] = typeof rawValue === "string" ? rawValue.trim() : "";
    if (fieldName.toLowerCase().includes("password")) {
      payload[fieldName] = typeof rawValue === "string" ? rawValue : "";
    }
    return payload;
  }, {} as Record<string, string>);
}

function hasMissingRequiredFields(payload: Record<string, string>, requiredFields: string[]) {
  return requiredFields.some((fieldName) => !payload[fieldName]);
}

function buildRequiredMessage(requiredFields: string[]) {
  if (requiredFields.length === 1) {
    const label = requiredFields[0].replace(/([A-Z])/g, " $1").toLowerCase();
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} is required.`;
  }

  if (requiredFields.length === 2) {
    return `${requiredFields[0][0].toUpperCase()}${requiredFields[0].slice(1)} and ${requiredFields[1]} are required.`;
  }

  const allButLast = requiredFields.slice(0, -1).join(", ");
  const last = requiredFields[requiredFields.length - 1];
  return `${allButLast[0].toUpperCase()}${allButLast.slice(1)}, and ${last} are required.`;
}

export function initAuthFormPage(config: AuthClientConfig) {
  const form = getFormElement(config.formId) as HTMLFormElement | null;
  const messageElement = getMessageElement(config.messageId) as HTMLElement | null;

  if (!form) return;

  setMessage(messageElement, config.initialMessage || "", Boolean(config.initialError));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(messageElement, "");

    const payload = collectPayload(form, config.requestBodyFields || config.requiredFields || []);

    if (hasMissingRequiredFields(payload, config.requiredFields || [])) {
      setMessage(messageElement, buildRequiredMessage(config.requiredFields || []), true);
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        setMessage(messageElement, data.error || config.genericErrorMessage, true);
        return;
      }

      setMessage(messageElement, data.message || config.successMessage, false);

      if (config.successRedirectTo) {
        window.location.href = config.successRedirectTo;
      }
    } catch (error) {
      console.error(`Auth request failed for ${config.endpoint}:`, error);
      setMessage(messageElement, "Unable to reach the server.", true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
