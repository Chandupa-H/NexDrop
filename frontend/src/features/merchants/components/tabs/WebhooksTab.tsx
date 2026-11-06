"use client";

import { useState } from "react";
import type { WebhookConfig, WebhookDeliveryLog } from "../../types";
import { Button } from "@/components/ui/button";

interface WebhooksTabProps {
  initialConfig: WebhookConfig;
  initialLogs: WebhookDeliveryLog[];
}

export function WebhooksTab({ initialConfig, initialLogs }: WebhooksTabProps) {
  const [config, setConfig] = useState(initialConfig);
  const [targetUrl, setTargetUrl] = useState(initialConfig.targetUrl);
  const [logs, setLogs] = useState(initialLogs);
  const [isSaved, setIsSaved] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const availableEvents = [
    { id: "order.created", label: "order.created", desc: "Triggered immediately when parcel is registered" },
    { id: "order.picked_up", label: "order.picked_up", desc: "Triggered when courier physically collects parcel" },
    { id: "order.in_transit", label: "order.in_transit", desc: "Triggered when parcel is scanned at sorting hub" },
    { id: "order.out_for_delivery", label: "order.out_for_delivery", desc: "Triggered when courier departs for doorstep delivery" },
    { id: "order.delivered", label: "order.delivered", desc: "Triggered upon successful recipient confirmation" },
    { id: "order.failed", label: "order.failed", desc: "Triggered if delivery fails with reason note" },
  ];

  const handleToggleEvent = (eventId: string) => {
    setConfig((prev) => {
      const exists = prev.subscribedEvents.includes(eventId);
      return {
        ...prev,
        subscribedEvents: exists
          ? prev.subscribedEvents.filter((e) => e !== eventId)
          : [...prev.subscribedEvents, eventId],
      };
    });
  };

  const handleSaveConfig = () => {
    setConfig((prev) => ({ ...prev, targetUrl }));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestPing = () => {
    setIsPinging(true);
    setPingSuccess(null);

    setTimeout(() => {
      const newLog: WebhookDeliveryLog = {
        id: `wh-test-${Date.now()}`,
        event: "order.in_transit",
        trackingNumber: "ND-LK-890216",
        status: 200,
        statusText: "OK",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        durationMs: Math.floor(45 + Math.random() * 40),
        payloadSummary: '{"event":"order.in_transit","tracking_number":"ND-LK-890216","hub":"Central Colombo"}',
      };

      setLogs((prev) => [newLog, ...prev]);
      setIsPinging(false);
      setPingSuccess(`HTTP 200 OK — Delivered in ${newLog.durationMs}ms`);
      setTimeout(() => setPingSuccess(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
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
              disabled={isPinging}
              onClick={handleTestPing}
              className="text-[#064E3B] font-semibold"
            >
              {isPinging ? "Pinging Endpoint..." : "🚀 Send Test Webhook"}
            </Button>
          </div>
        </div>

        {pingSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-[#064E3B] text-xs rounded-lg font-medium flex items-center justify-between">
            <span>✅ {pingSuccess}</span>
            <span className="text-[11px] text-emerald-700">Webhook verified</span>
          </div>
        )}

        <div className="mt-6 space-y-5 text-xs">
          {/* Target URL */}
          <div>
            <label className="block font-bold text-gray-900 mb-1">
              Your Webhook Endpoint URL (HTTPS)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://yourstore.com/api/webhooks/nexdrop"
                className="w-full text-xs font-mono px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveConfig}
                className="whitespace-nowrap font-bold"
              >
                {isSaved ? "Saved!" : "Save Endpoint"}
              </Button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              NexDrop delivers JSON payloads via POST with header <code className="text-[#064E3B]">X-NexDrop-Signature</code>.
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4">
            <span className="text-xs font-bold text-gray-900 block mb-1">
              HMAC SHA-256 Signing Secret
            </span>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={config.secretKey}
                className="w-full text-xs font-mono bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-gray-800"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(config.secretKey);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
              >
                {copiedSecret ? "Copied!" : "Copy Secret"}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Use this secret to verify authenticity of incoming payloads.
            </p>
          </div>

          {/* Subscribed Events Checklist */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
              Subscribed Parcel Lifecycle Events
            </span>
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
          <span className="text-xs text-gray-400 font-mono">Auto-Retry on failure (3x)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Tracking Number</th>
                <th className="px-6 py-3">HTTP Status</th>
                <th className="px-6 py-3">Latency</th>
                <th className="px-6 py-3">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F9FAF9] transition-colors">
                  <td className="px-6 py-3.5 font-mono font-bold text-[#064E3B]">
                    {log.event}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-gray-700">
                    {log.trackingNumber}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {log.status} {log.statusText}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {log.durationMs} ms
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

