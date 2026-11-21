"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Webhook, Send, CheckCircle2, AlertCircle } from "lucide-react";
import type { WebhookConfig, WebhookDeliveryLog } from "../../types";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";

interface WebhooksTabProps {
  merchantId?: string;
  initialConfig: WebhookConfig;
  initialLogs: WebhookDeliveryLog[];
  onConfigChange: (config: WebhookConfig) => void;
  onLogsChange: Dispatch<SetStateAction<WebhookDeliveryLog[]>>;
}

export function WebhooksTab({
  merchantId = "me",
  initialConfig,
  initialLogs,
  onConfigChange,
  onLogsChange,
}: WebhooksTabProps) {
  const config = initialConfig;
  const logs = initialLogs;
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const availableEvents = [
    { id: "order.created", label: "order.created", desc: "Triggered immediately when parcel is registered" },
    { id: "order.picked_up", label: "order.picked_up", desc: "Triggered when courier physically collects parcel" },
    { id: "order.in_transit", label: "order.in_transit", desc: "Triggered when parcel is scanned at sorting hub" },
    { id: "order.out_for_delivery", label: "order.out_for_delivery", desc: "Triggered when courier departs for doorstep delivery" },
    { id: "order.delivered", label: "order.delivered", desc: "Triggered upon successful recipient confirmation" },
    { id: "order.failed", label: "order.failed", desc: "Triggered if delivery fails with reason note" },
  ];

  const validateUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return "Webhook endpoint URL is required.";
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        return "Webhook endpoints must use HTTPS.";
      }
      if (
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        parsed.hostname === "localhost" ||
        parsed.hostname.endsWith(".localhost")
      ) {
        return "Credentials, query strings, fragments, and local destinations are not allowed.";
      }
      return null;
    } catch {
      return "Please enter a valid URL (e.g. https://yourstore.com/api/webhooks).";
    }
  };

  const handleToggleEvent = (eventId: string) => {
    const exists = config.subscribedEvents.includes(eventId);
    const updated = exists
      ? config.subscribedEvents.filter((event) => event !== eventId)
      : [...config.subscribedEvents, eventId];
    if (updated.length > 0) setEventsError(null);
    onConfigChange({ ...config, subscribedEvents: updated });
  };

  const handleSaveConfig = async () => {
    const urlErr = validateUrl(config.targetUrl);
    if (urlErr) {
      setUrlError(urlErr);
      return;
    }
    setUrlError(null);

    if (config.subscribedEvents.length === 0) {
      setEventsError("Please select at least one parcel event to receive webhooks.");
      return;
    }
    setEventsError(null);

    const nextConfig: WebhookConfig = {
      ...config,
      targetUrl: config.targetUrl.trim(),
    };
    onConfigChange(nextConfig);
    setActionError(null);
    setIsSaving(true);
    try {
      const saved = await apiClient.updateMerchantWebhooks(merchantId, {
        targetUrl: nextConfig.targetUrl,
        subscribedEvents: nextConfig.subscribedEvents,
        isActive: nextConfig.isActive,
      });
      onConfigChange(saved);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save webhook endpoint.";
      setActionError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingSuccess(null);
    setActionError(null);

    try {
      const res = await apiClient.testMerchantWebhook(merchantId);
      onLogsChange((currentLogs) => [res.log, ...currentLogs]);
      const ok = res.log.deliveryStatus === "delivered";
      const status = res.log.status === null ? "No HTTP response" : `HTTP ${res.log.status} ${res.log.statusText}`;
      const summary = `${status} — ${ok ? "Delivered" : res.log.deliveryStatus} in ${res.log.durationMs}ms`;
      if (ok) {
        setPingSuccess(summary);
      } else {
        setActionError(res.log.errorMessage || summary);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send test webhook.";
      setActionError(message);
    } finally {
      setIsPinging(false);
      setTimeout(() => setPingSuccess(null), 4000);
    }
  };

  const handleRotateSecret = async () => {
    setActionError(null);
    try {
      const rotated = await apiClient.rotateMerchantWebhookSecret(merchantId);
      setNewSecret(rotated.secretKey);
      setCopiedSecret(false);
      onConfigChange({ ...config, secretConfigured: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not rotate the webhook secret.";
      setActionError(message);
    }
  };

  const handleCopyNewSecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      setActionError("Clipboard access failed. Select and copy the new secret manually.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-[#064E3B]" />
              <h2 className="text-xl font-bold text-[#064E3B] tracking-tight">
                Webhook Event Subscriptions
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Receive automated HTTP POST notifications in real time whenever a parcel status changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPinging || isSaving}
              onClick={handleTestPing}
              className="text-[#064E3B] font-semibold flex items-center gap-1.5"
            >
              <Send className={`w-3.5 h-3.5 ${isPinging ? "animate-pulse" : ""}`} />
              <span>{isPinging ? "Pinging Endpoint..." : "Send Test Webhook"}</span>
            </Button>
          </div>
        </div>

        {pingSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-[#064E3B] text-xs rounded-lg font-medium flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{pingSuccess}</span>
            </div>
            <span className="text-[11px] text-emerald-700">Webhook verified</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-medium flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="mt-6 space-y-5 text-xs">
          {/* Target URL */}
          <div>
            <label className="block font-bold text-gray-900 mb-1">
              Your Public HTTPS Webhook Endpoint <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={config.targetUrl}
                onChange={(e) => {
                  onConfigChange({ ...config, targetUrl: e.target.value });
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://yourstore.com/api/webhooks/nexdrop"
                className={`w-full text-xs font-mono px-3 py-2 border rounded-lg focus:outline-none ${
                  urlError
                    ? "border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400"
                    : "border-[#E5E7EB] focus:ring-2 focus:ring-[#064E3B]"
                }`}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="whitespace-nowrap font-bold"
              >
                {isSaved ? "Saved!" : isSaving ? "Saving..." : "Save Endpoint"}
              </Button>
            </div>
            {urlError ? (
              <p className="mt-1.5 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{urlError}</span>
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">
                NexDrop sends signed JSON via POST in <code className="text-[#064E3B]">X-NexDrop-Signature</code>. Private-network destinations are blocked.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(event) =>
                onConfigChange({ ...config, isActive: event.target.checked })
              }
              className="rounded text-[#064E3B] focus:ring-[#064E3B]"
            />
            Enable automatic webhook deliveries
          </label>

          {/* Webhook Secret */}
          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-gray-900 block mb-1">
                  HMAC SHA-256 Signing Secret
                </span>
                <p className="text-[10px] text-gray-500">
                  {config.secretConfigured
                    ? "The current secret is hidden. Rotating it immediately invalidates the previous secret."
                    : "No signing secret has been created yet."}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRotateSecret}
              >
                {config.secretConfigured ? "Rotate Secret" : "Generate Secret"}
              </Button>
            </div>
            {newSecret && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold text-amber-800">
                  Copy this new secret now. It will not be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newSecret}
                    className="w-full text-xs font-mono bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-gray-800"
                    aria-label="New webhook signing secret"
                  />
                  <Button variant="secondary" size="sm" onClick={handleCopyNewSecret}>
                    {copiedSecret ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setNewSecret(null)}>
                    Hide
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Subscribed Events Checklist */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
              Subscribed Parcel Lifecycle Events <span className="text-red-500">*</span>
            </span>
            {eventsError && (
              <p className="mb-2 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{eventsError}</span>
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableEvents.map((ev) => {
                const isChecked = config.subscribedEvents.includes(ev.id);
                return (
                  <label
                    key={ev.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isChecked
                        ? "bg-[#F0FDF4] border-emerald-300"
                        : "bg-white border-[#E5E7EB] opacity-70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleEvent(ev.id)}
                      className="mt-0.5 rounded text-[#064E3B] focus:ring-[#064E3B]"
                    />
                    <div>
                      <strong className="font-mono text-xs text-[#064E3B] block">
                        {ev.label}
                      </strong>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        {ev.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Delivery Logs */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8FAF8] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#064E3B]">Recent Webhook Deliveries</h3>
            <p className="text-xs text-gray-500">Log of events dispatched to your server endpoint with HTTP response codes</p>
          </div>
          <span className="text-xs text-gray-400 font-mono">Up to 3 retries (4 total attempts)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Tracking Number</th>
                <th className="px-6 py-3">Delivery / HTTP</th>
                <th className="px-6 py-3">Attempt</th>
                <th className="px-6 py-3">Latency</th>
                <th className="px-6 py-3">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No webhook deliveries logged yet. Send a clearly marked test event to your configured endpoint.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={`${log.id}-${log.attemptNumber}`} className="hover:bg-[#F9FAF9] transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-[#064E3B]">
                      {log.event}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-gray-700">
                      {log.trackingNumber}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          log.deliveryStatus === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.deliveryStatus === "retrying" || log.deliveryStatus === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.deliveryStatus} · {log.status === null ? "No HTTP response" : `${log.status} ${log.statusText}`}
                      </span>
                      {log.errorMessage && (
                        <p className="mt-1 max-w-xs text-[10px] text-red-700">{log.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {log.attemptNumber} / 4
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {log.durationMs} ms
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {log.timestamp}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}