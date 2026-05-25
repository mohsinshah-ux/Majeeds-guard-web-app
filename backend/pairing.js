import { defaultRemoteControlState } from "./deviceHelpers.js";
import { hydrateState, persistState } from "./persistence.js";
import {
  allStateStores,
  boundDevices,
  deviceInvites,
  geofenceStateByDevice,
  remoteControlByDevice
} from "./stores.js";

export function createInviteToken() {
  return Math.random().toString(36).slice(2, 12);
}

export function getAppBaseUrl(port = 8080) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${port}`;
}

export function buildInviteUrl(token, port = 8080) {
  return `${getAppBaseUrl(port)}/bind/${token}`;
}

/** In-memory invite create (caller must hydrate/persist on Vercel). */
export function createInvitation(label, port = 8080) {
  const token = createInviteToken();
  const invitation = {
    token,
    label: label || "Child device invite",
    type: "link",
    createdAt: new Date().toISOString(),
    redeemed: false
  };
  deviceInvites.set(token, invitation);
  return {
    status: 201,
    body: {
      ...invitation,
      inviteUrl: buildInviteUrl(token, port)
    }
  };
}

export async function createDeviceInvitation(label, port = 8080) {
  await hydrateState(allStateStores());
  const result = createInvitation(label, port);
  await persistState(allStateStores());
  return result;
}

/** In-memory redeem (caller must hydrate/persist on Vercel). */
export function redeemInvitation(token, body) {
  const invite = deviceInvites.get(token);
  if (!invite) {
    return { status: 404, body: { error: "Invitation token not found" } };
  }
  if (invite.redeemed) {
    return { status: 409, body: { error: "Invitation already redeemed" } };
  }
  const consent = body?.consent === true;
  if (!consent) {
    return { status: 400, body: { error: "Explicit consent is required to bind device" } };
  }
  const deviceName =
    typeof body?.deviceName === "string" && body.deviceName.trim()
      ? body.deviceName.trim()
      : "Child Device";
  const boundDevice = {
    id: token,
    deviceName,
    source: invite.type,
    boundAt: new Date().toISOString(),
    battery: 100
  };
  invite.redeemed = true;
  const existingIdx = boundDevices.findIndex((d) => d.id === token);
  if (existingIdx >= 0) {
    boundDevices[existingIdx] = boundDevice;
  } else {
    boundDevices.push(boundDevice);
  }
  remoteControlByDevice.set(token, defaultRemoteControlState());
  geofenceStateByDevice[token] = {};
  return { status: 200, body: { success: true, device: boundDevice } };
}

export async function redeemDeviceInvitation(token, body) {
  await hydrateState(allStateStores());
  const result = redeemInvitation(token, body);
  if (result.status === 200) {
    await persistState(allStateStores());
  }
  return result;
}
