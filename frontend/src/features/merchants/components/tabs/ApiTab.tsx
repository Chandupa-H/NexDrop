"use client";

import { useState } from "react";
import type { ApiCredentials } from "../../types";
import { Button } from "@/components/ui/button";

interface ApiTabProps {
  credentials: ApiCredentials;
}

export function ApiTab({ credentials }: ApiTabProps) {
  const [showLiveKey, setShowLiveKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeSnippetLang, setActiveSnippetLang] = useState<"curl" | "python" | "node">("curl");

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const curlSnippet = `curl -X POST https://api.nexdrop.com/v1/parcels \\
  -H "Authorization: Bearer ${credentials.liveKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient_name": "Kasun Fernando",
    "recipient_phone": "+94771234567",
    "delivery_address": "45/2 Galle Road, Bambalapitiya",
    "delivery_city": "Colombo",
    "weight_kg": 1.5,
    "dimensions": "20x15x10 cm",
    "cod_amount": 3500,
    "special_instructions": "Fragile glassware, handle with care"
  }'`;

  const pythonSnippet = `import requests

url = "https://api.nexdrop.com/v1/parcels"
headers = {
    "Authorization": "Bearer ${credentials.liveKey}",
    "Content-Type": "application/json"
}
payload = {
    "recipient_name": "Kasun Fernando",
    "recipient_phone": "+94771234567",
    "delivery_address": "45/2 Galle Road, Bambalapitiya",
    "delivery_city": "Colombo",
    "weight_kg": 1.5,
    "cod_amount": 3500
}

response = requests.post(url, json=payload, headers=headers)
print("Tracking ID:", response.json().get("tracking_number"))`;

  const nodeSnippet = `import fetch from 'node-fetch';

const response = await fetch('https://api.nexdrop.com/v1/parcels', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${credentials.liveKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient_name: 'Kasun Fernando',
    recipient_phone: '+94771234567',
    delivery_address: '45/2 Galle Road',
    delivery_city: 'Colombo',
    weight_kg: 1.5,
    cod_amount: 3500
  })
});

const data = await response.json();
console.log('Shipment Created:', data.tracking_number);`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔐</span>
              <h2 className="text-xl font-bold text-[#064E3B] tracking-tight">
                Merchant API Keys & OAuth 2.0 Credentials
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use these credentials to create delivery orders programmatically from your Shopify, WooCommerce, or custom storefront.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-[#064E3B]">
              Active Merchant ID: {credentials.merchantId}
            </span>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="mt-6 space-y-4">
          {/* Live Secret Key */}
          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-bold text-gray-900 block">
                  Production Secret API Key (Bearer Token)
                </span>
                <span className="text-[11px] text-gray-500">
                  Required in <code className="text-[#064E3B]">Authorization: Bearer &lt;key&gt;</code> header.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded w-max">
                Production Live
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type={showLiveKey ? "text" : "password"}
                readOnly
                value={credentials.liveKey}
                className="w-full text-xs font-mono bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLiveKey(!showLiveKey)}
              >
                {showLiveKey ? "Hide" : "Show"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(credentials.liveKey, "liveKey")}
              >
                {copiedField === "liveKey" ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Sandbox Test Key */}
          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-bold text-gray-900 block">
                  Sandbox Test API Key
                </span>
                <span className="text-[11px] text-gray-500">
                  Simulate parcel dispatches in test mode without triggering physical couriers.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded w-max">
                Sandbox
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={credentials.testKey}
                className="w-full text-xs font-mono bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(credentials.testKey, "testKey")}
              >
                {copiedField === "testKey" ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* OAuth 2.0 Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4">
              <span className="text-xs font-bold text-gray-900 block mb-1">
                OAuth 2.0 Client ID
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={credentials.clientId}
                  className="w-full text-xs font-mono bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-gray-800"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.clientId, "clientId")}
                >
                  {copiedField === "clientId" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4">
              <span className="text-xs font-bold text-gray-900 block mb-1">
                OAuth 2.0 Client Secret
              </span>
              <div className="flex items-center gap-2">
                <input
                  type={showSecret ? "text" : "password"}
                  readOnly
                  value={credentials.clientSecret}
                  className="w-full text-xs font-mono bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-gray-800"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? "Hide" : "Show"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.clientSecret, "clientSecret")}
                >
                  {copiedField === "clientSecret" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quota & Usage Bar */}
        <div className="mt-6 p-4 border border-[#E5E7EB] rounded-xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">Daily API Rate Limit</span>
            <strong className="text-gray-900 text-sm">
              {credentials.usedToday} / {credentials.rateLimitPerDay.toLocaleString()} requests used today
            </strong>
          </div>
          <div className="w-full sm:w-64 bg-gray-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#16A34A] h-2.5 rounded-full"
              style={{ width: `${(credentials.usedToday / credentials.rateLimitPerDay) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Code Examples & REST Endpoints */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#064E3B]">
              Automated Parcel Creation Code Examples
            </h3>
            <p className="text-xs text-gray-500">
              Integrate with NexDrop backend in minutes using standard HTTP REST.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAF8] p-1 rounded-lg border border-[#E5E7EB]">
            {(["curl", "python", "node"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveSnippetLang(lang)}
                className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                  activeSnippetLang === lang
                    ? "bg-[#064E3B] text-white"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                {lang === "node" ? "Node.js" : lang === "python" ? "Python" : "cURL"}
              </button>
            ))}
          </div>
        </div>

        {/* Code Box */}
        <div className="relative rounded-xl overflow-hidden bg-[#0A1A12] text-emerald-300 font-mono text-xs p-4 shadow-inner">
          <button
            onClick={() => {
              const code =
                activeSnippetLang === "curl"
                  ? curlSnippet
                  : activeSnippetLang === "python"
                  ? pythonSnippet
                  : nodeSnippet;
              copyToClipboard(code, "snippet");
            }}
            className="absolute top-3 right-3 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors"
          >
            {copiedField === "snippet" ? "Copied!" : "Copy Code"}
          </button>
          <pre className="overflow-x-auto pr-16 leading-relaxed">
            {activeSnippetLang === "curl" && curlSnippet}
            {activeSnippetLang === "python" && pythonSnippet}
            {activeSnippetLang === "node" && nodeSnippet}
          </pre>
        </div>

        {/* API Routes Reference */}
        <div className="pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
            Core REST API Endpoints
          </span>
          <div className="space-y-2 text-xs">
            <div className="p-3 border border-[#E5E7EB] rounded-lg flex items-center justify-between bg-[#F8FAF8]">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-xs bg-emerald-100 text-[#064E3B] px-2 py-0.5 rounded">
                  POST
                </span>
                <code className="font-mono text-gray-800">/v1/parcels</code>
                <span className="text-gray-500 text-[11px]">Create a new shipment & assign tracking number</span>
              </div>
              <span className="text-[11px] text-gray-400">Authenticated</span>
            </div>

            <div className="p-3 border border-[#E5E7EB] rounded-lg flex items-center justify-between bg-[#F8FAF8]">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  GET
                </span>
                <code className="font-mono text-gray-800">/v1/parcels/track/&#123;tracking_number&#125;</code>
                <span className="text-gray-500 text-[11px]">Query live delivery status and location timeline</span>
              </div>
              <span className="text-[11px] text-gray-400">Public / Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

