import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 96_000;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();

  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8")) {
    return true;
  }

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mappedIpv4 ?? (isIP(normalized) === 4 ? normalized : null);
  if (!ipv4) {
    return false;
  }

  const [first, second] = ipv4.split(".").map(Number);
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Unsupported website URL.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Private website URLs are not supported.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private website URLs are not supported.");
  }

  return url;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function cleanName(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function readMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanName(match[1]);
    }
  }
  return "";
}

function nameFromHostname(hostname: string) {
  const root = hostname.replace(/^www\./i, "").split(".")[0] ?? "";
  return root
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim()
    .slice(0, 100);
}

async function readHtml(response: Response) {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytesRead = 0;

  while (bytesRead < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    bytesRead += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }

  await reader.cancel().catch(() => undefined);
  return html;
}

async function fetchWebsiteName(rawUrl: string) {
  let currentUrl = await assertPublicUrl(rawUrl);
  const fallbackName = nameFromHostname(currentUrl.hostname);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent": "DetroitConnectProfileBot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        break;
      }
      currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      break;
    }

    const html = await readHtml(response);
    const siteName =
      readMetaContent(html, "og:site_name") ||
      readMetaContent(html, "application-name");
    if (siteName) {
      return siteName;
    }

    const title = cleanName(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    if (title) {
      return title.split(/\s+[|–—]\s+|\s+-\s+/)[0]?.trim().slice(0, 100) || fallbackName;
    }
    break;
  }

  return fallbackName;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ name: "" }, { status: 401 });
  }

  const rawUrl = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!rawUrl || rawUrl.length > 300) {
    return NextResponse.json({ name: "" }, { status: 400 });
  }

  try {
    return NextResponse.json({ name: await fetchWebsiteName(rawUrl) });
  } catch {
    try {
      return NextResponse.json({ name: nameFromHostname(new URL(rawUrl).hostname) });
    } catch {
      return NextResponse.json({ name: "" }, { status: 400 });
    }
  }
}
