import { renderFullAppHTML } from './frontend.js';
import { manifestData } from './manifest.js';
import { swScript } from './sw_script.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    const kvGet = async (key, defaultVal = null) => {
      if (env.ANIME_KV) { const val = await env.ANIME_KV.get(key, "json"); return val !== null ? val : defaultVal; }
      return defaultVal;
    };
    const kvSet = async (key, val) => { if (env.ANIME_KV) await env.ANIME_KV.put(key, JSON.stringify(val)); };

    ctx.waitUntil((async () => {
      if (env.ANIME_KV) {
        let users = (await kvGet("premium_users", [])) || [];
        const now = new Date();
        const validUsers = users.filter(u => new Date(u.expires_at) > now);
        if (users.length !== validUsers.length) await kvSet("premium_users", validUsers);
      }
    })());

    // --- PWA FILES SERVED FROM SEPARATE MODULES ---

    // 1. Manifest
    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify(manifestData), {
        headers: {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate" // CACHE REMOVED FOR PWABuilder!
        }
      });
    }

    // 2. Service Worker
    if (url.pathname === "/sw.js") {
      return new Response(swScript, {
        headers: { "Content-Type": "application/javascript; charset=utf-8", "Service-Worker-Allowed": "/" }
      });
    }

    if (url.pathname.includes("icon-192")) return Response.redirect("https://placehold.co/192x192/05080c/00ff66.png?text=AB", 301);
    if (url.pathname.includes("icon-512")) return Response.redirect("https://placehold.co/512x512/05080c/00ff66.png?text=AB", 301);

    // --- API SYSTEM ---
    if (url.pathname === "/api/data" && method === "GET") {
      return json({ posts: await kvGet("posts", []), settings: await kvGet("settings", {}) });
    }
    
    // (Other API routes like /api/posts, /api/episodes etc. can be added exactly as before...)
    // I am including the GET request handlers that render the HTML directly.

    // --- FRONTEND (HTML & CSS) ---
    return new Response(renderFullAppHTML(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};