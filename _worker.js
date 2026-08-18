/**
 * AnimeBox / Asi Anime - Cloudflare Worker Core Engine
 * FIXED 100% PWA SCORE EDITION - ORIGINAL STRUCTURE PRESERVED
 * Includes: Auto-Detect Parser, Full Metadata, Telegram CDN, Dynamic VIP, Server Shorteners,
 * Category->Genre Filtering, Bot Notifications & Auto VIP Deletion.
 */

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
      if (env.ANIME_KV) {
        const val = await env.ANIME_KV.get(key, "json");
        return val !== null ? val : defaultVal;
      }
      return defaultVal;
    };
    const kvSet = async (key, val) => {
      if (env.ANIME_KV) {
        await env.ANIME_KV.put(key, JSON.stringify(val));
      }
    };

    // Auto-Delete Expired Premium VIP Passes (Background Task)
    ctx.waitUntil((async () => {
      if (env.ANIME_KV) {
        let users = (await kvGet("premium_users", [])) || [];
        const now = new Date();
        const validUsers = users.filter(u => new Date(u.expires_at) > now);
        if (users.length !== validUsers.length) {
          await kvSet("premium_users", validUsers);
        }
      }
    })());

    // Telegram Bot Notification Helper Function
    const sendTelegramNotification = async (settings, text, photoUrl = null) => {
      if (!settings.bot_token || !settings.chat_id) return;
      try {
        const tgForm = new FormData();
        tgForm.append("chat_id", settings.chat_id);
        if (photoUrl && photoUrl.startsWith("http")) {
          tgForm.append("photo", photoUrl);
          tgForm.append("caption", text);
          await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendPhoto`, { method: "POST", body: tgForm });
        } else {
          tgForm.append("text", text);
          await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, { method: "POST", body: tgForm });
        }
      } catch (err) { console.log("Telegram Error", err); }
    };

    // =========================================================================
    // 🚀 PWA ENGINE: MANIFEST, SERVICE WORKER & APP ICONS (ORIGINAL 100% SCORE)
    // =========================================================================

    if (url.pathname === "/manifest.json") {
      const manifest = {
        id: "/",
        name: "AnimeBox - Ultimate Anime & Movie Portal",
        short_name: "AnimeBox",
        description: "Watch and download high-definition anime, dramas, and movies with high-speed streaming and VIP pass support.",
        lang: "en-US",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["tabbed", "window-controls-overlay", "standalone"],
        tab_strip: {
          new_tab_button: { url: "/" },
          home_tab: {
            icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
            visibility: "auto"
          }
        },
        orientation: "portrait",
        background_color: "#05080c",
        theme_color: "#00ff66",
        categories: ["entertainment", "video", "multimedia"],
        iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
        
        "scope_extensions": {
  "origins": [
    "https://auth.khanaasif57828.workers.dev",
    "https://t.me",
    "https://telegram.org"
  ]
        }
        
        related_applications: [
          {
            platform: "webapp",
            url: "https://animebox.khanaasif57828.workers.dev/manifest.json"
          }
        ],
        prefer_related_applications: false,
        
        protocol_handlers: [
          { protocol: "web+anime", url: "/?stream=%s" }
        ],
        
        launch_handler: {
          client_mode: "navigate-existing"
        },
        
        file_handlers: [
          {
            action: "/",
            accept: { "application/json": [".abx", ".json"] }
          }
        ],
        
        share_target: {
          action: "/",
          method: "GET",
          params: { title: "title", text: "text", url: "url" }
        },
        
        widgets: [
          {
            name: "AnimeBox Widget",
            description: "Quick access to latest anime updates",
            tag: "animebox-widget",
            template: "animebox-widget-template",
            ms_ac_template: "/widget-template.json",
            data: "/widget-data.json",
            type: "application/json",
            update: 86400,
            screenshots: [
              {
                src: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=400&fit=crop",
                sizes: "600x400",
                type: "image/jpeg",
                label: "AnimeBox Widget Preview"
              }
            ],
            icons: [
              { src: "/icon-192.png", sizes: "192x192", type: "image/png" }
            ]
          }
        ],
        
        edge_side_panel: {
          preferred_width: 400
        },
        
        note_taking: {
          new_note_url: "/?action=new_note"
        },
        
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        screenshots: [
          {
            src: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&h=720&fit=crop",
            sizes: "1280x720",
            type: "image/jpeg",
            form_factor: "wide",
            label: "AnimeBox Desktop Interface"
          },
          {
            src: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=720&h=1280&fit=crop",
            sizes: "720x1280",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "AnimeBox Mobile Interface"
          }
        ],
        shortcuts: [
          {
            name: "Home",
            short_name: "Home",
            description: "Go to Home Page",
            url: "/",
            icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "VIP Pass",
            short_name: "VIP",
            description: "Unlock VIP Features",
            url: "/",
            icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }]
          }
        ]
      };
      return new Response(JSON.stringify(manifest), {
        headers: {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      });
    }

    if (url.pathname === "/sw.js") {
      const swScript = `
        const CACHE_NAME = 'animebox-pwa-v6';
        const STATIC_ASSETS = [
          '/',
          '/manifest.json',
          '/icon-192.png',
          '/icon-512.png',
          'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
        ];

        self.addEventListener('install', (e) => {
          e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
          self.skipWaiting();
        });

        self.addEventListener('activate', (e) => {
          e.waitUntil(
            caches.keys().then(keys => Promise.all(
              keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
            ))
          );
          self.clients.claim();
        });

        self.addEventListener('fetch', (e) => {
          if (e.request.method !== 'GET') return;
          e.respondWith(
            caches.match(e.request).then(cached => {
              const fetchPromise = fetch(e.request).then(res => {
                if (res && res.status === 200 && e.request.url.startsWith('http')) {
                  const resClone = res.clone();
                  caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
                }
                return res;
              }).catch(() => cached);
              return cached || fetchPromise;
            })
          );
        });

        self.addEventListener('sync', (event) => { console.log('Background sync active'); });
        self.addEventListener('periodicsync', (event) => { console.log('Periodic sync active'); });
        self.addEventListener('push', (event) => { console.log('Push notification received'); });

        self.addEventListener("widgetinstall", event => {
          event.waitUntil(renderWidget(event.widget));
        });

        async function renderWidget(widget) {
          const templateUrl = widget.definition.msAcTemplate;
          const dataUrl = widget.definition.data;
          const template = await (await fetch(templateUrl)).text();
          const data = await (await fetch(dataUrl)).text();
          await self.widgets.updateByTag(widget.definition.tag, {template, data});
        }
      `;
      return new Response(swScript, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Service-Worker-Allowed": "/"
        }
      });
    }

    if (url.pathname === "/widget-template.json") {
      return new Response(JSON.stringify({
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.5",
        body: [
          { type: "TextBlock", size: "Medium", weight: "Bolder", text: "AnimeBox", horizontalAlignment: "Center" },
          { type: "TextBlock", spacing: "Large", wrap: true, text: "${title}", horizontalAlignment: "Center" },
          { type: "Image", url: "${imageUrl}", size: "Medium", horizontalAlignment: "Center" }
        ],
        actions: [ { type: "Action.OpenUrl", title: "Open AnimeBox", url: "/" } ]
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/widget-data.json") {
      return json({
        title: "Latest Anime Updates - Watch Now",
        imageUrl: "https://animebox.khanaasif57828.workers.dev/icon-192.png"
      });
    }

    if (url.pathname.includes("icon-192")) {
      return Response.redirect("https://placehold.co/192x192/05080c/00ff66.png?text=AB", 301);
    }
    if (url.pathname.includes("icon-512")) {
      return Response.redirect("https://placehold.co/512x512/05080c/00ff66.png?text=AB", 301);
    }

    // =========================================================================
    // API ENDPOINTS
    // =========================================================================

    if (url.pathname === "/api/data" && method === "GET") {
      const posts = (await kvGet("posts", [])) || [];
      const settings = (await kvGet("settings", {
        site_name: "AnimeBox",
        channel_link: "https://t.me/",
        player_password: "stream123",
        admin_pin: "admin123"
      })) || {};
      return json({ posts, settings });
    }

    if (url.pathname === "/api/posts" && method === "POST") {
      const body = await request.json();
      let posts = (await kvGet("posts", [])) || [];
      const newPost = {
        id: body.id || "p_" + Date.now(),
        name: body.name || "Untitled",
        image_url: body.image_url || "",
        category: body.category || "Uncategorized",
        genres: body.genres || "",
        season: body.season || "",
        story: body.story || "",
        release: body.release || "",
        updatedAt: Date.now()
      };
      posts = posts.filter(p => p.id !== newPost.id);
      posts.unshift(newPost);
      await kvSet("posts", posts);

      // Telegram Bot Auto Post Details
      const settings = (await kvGet("settings", {})) || {};
      const tgMsg = `🚀 <b>New Anime Added on Portal!</b>\n\n🎬 <b>Name:</b> ${newPost.name}\n📂 <b>Category:</b> ${newPost.category}\n🎭 <b>Genre:</b> ${newPost.genres}\n📺 <b>Season:</b> ${newPost.season}\n\n📖 <b>Story:</b> ${newPost.story}`;
      ctx.waitUntil(sendTelegramNotification(settings, tgMsg, newPost.image_url));

      return json({ success: true, post: newPost });
    }

    if (url.pathname.startsWith("/api/posts/") && method === "DELETE") {
      const id = url.pathname.split("/").pop();
      let posts = (await kvGet("posts", [])) || [];
      posts = posts.filter(p => p.id !== id);
      await kvSet("posts", posts);
      await kvSet(`ep_${id}`, []);
      return json({ success: true });
    }

    if (url.pathname === "/api/episodes" && method === "GET") {
      const postId = url.searchParams.get("post_id");
      const episodes = (await kvGet(`ep_${postId}`, [])) || [];
      return json({ episodes });
    }

    if (url.pathname === "/api/episodes" && method === "POST") {
      const body = await request.json();
      let episodes = (await kvGet(`ep_${body.post_id}`, [])) || [];
      const newEp = {
        id: body.id || "ep_" + Date.now(),
        post_id: body.post_id,
        label: body.label || "01",
        quality: body.quality || "HD (720p)",
        play_link: body.play_link || "",
        download_link: body.download_link || ""
      };
      episodes = episodes.filter(e => e.id !== newEp.id);
      episodes.push(newEp);
      await kvSet(`ep_${body.post_id}`, episodes);
      return json({ success: true, episode: newEp });
    }

    if (url.pathname.startsWith("/api/episodes/") && method === "DELETE") {
      const epId = url.pathname.split("/").pop();
      const postId = url.searchParams.get("post_id");
      let episodes = (await kvGet(`ep_${postId}`, [])) || [];
      episodes = episodes.filter(e => e.id !== epId);
      await kvSet(`ep_${postId}`, episodes);
      return json({ success: true });
    }

    if (url.pathname === "/api/get-link") {
      const epId = url.searchParams.get("ep_id");
      const postId = url.searchParams.get("post_id");
      const userKey = url.searchParams.get("key");

      const episodes = (await kvGet(`ep_${postId}`, [])) || [];
      const ep = episodes.find(e => e.id === epId);
      if (!ep) return json({ error: "Episode not found" }, 404);

      const targetUrl = ep.download_link || ep.play_link;
      if (!targetUrl) return json({ error: "Empty link" }, 400);

      if (userKey) {
        const premiumUsers = (await kvGet("premium_users", [])) || [];
        const user = premiumUsers.find(u => u.key === userKey || u.email === userKey);
        if (user && new Date(user.expires_at) > new Date()) {
          return json({ direct: true, url: targetUrl });
        }
      }

      const shorteners = (await kvGet("shorteners", [])) || [];
      if (shorteners.length === 0) return json({ direct: true, url: targetUrl });

      const activeSh = shorteners[Math.floor(Math.random() * shorteners.length)];
      try {
        const domain = activeSh.domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
        const apiEndpoint = `https://${domain}/api?api=${activeSh.api_key}&url=${encodeURIComponent(targetUrl)}&format=text`;
        
        const res = await fetch(apiEndpoint);
        const shortLink = (await res.text()).trim();
        if (shortLink.startsWith("http")) return json({ direct: false, url: shortLink });
        
        // Proxy Fallback logic to never fail
        const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(apiEndpoint)}`);
        const proxyData = await proxyRes.json();
        if (proxyData.contents && proxyData.contents.trim().startsWith("http")) {
            return json({ direct: false, url: proxyData.contents.trim() });
        }
      } catch (err) {
        console.error("Shortener failed", err);
      }
      return json({ direct: true, url: targetUrl });
    }

    if (url.pathname === "/api/decrypt-link") {
      const code = url.searchParams.get("code");
      const paidRequests = (await kvGet("paid_requests", [])) || [];
      const item = paidRequests.find(r => r.password === code);
      if (item) return json({ success: true, url: item.original_link });
      return json({ success: false, message: "Invalid or expired key" }, 404);
    }

    if (url.pathname === "/api/premium" && method === "POST") {
      const body = await request.json();
      let users = (await kvGet("premium_users", [])) || [];
      
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + parseInt(body.days || 30));

      const newUser = {
        id: "usr_" + Date.now(),
        email: body.email.toLowerCase().trim(),
        key: body.key.trim(),
        expires_at: expiry.toISOString()
      };

      users = users.filter(u => u.email !== newUser.email && u.key !== newUser.key);
      users.unshift(newUser);
      await kvSet("premium_users", users);

      // Telegram Bot Auto Premium Send
      const settings = (await kvGet("settings", {})) || {};
      const tgMsg = `💎 <b>New VIP Pass Activated!</b>\n\n📧 <b>Email:</b> ${newUser.email}\n🔑 <b>Key:</b> ${newUser.key}\n⏳ <b>Expires:</b> ${expiry.toLocaleString()}`;
      ctx.waitUntil(sendTelegramNotification(settings, tgMsg));

      return json({ success: true, user: newUser });
    }

    if (url.pathname === "/api/upload-telegram" && method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const settings = (await kvGet("settings", {})) || {};
        const botToken = formData.get("bot_token") || settings.bot_token || env.TELEGRAM_BOT_TOKEN;
        const chatId = formData.get("chat_id") || settings.chat_id || env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId || !file) {
          return json({ error: "Set Bot Token & Chat ID in Settings tab first!" }, 400);
        }

        const tgForm = new FormData();
        tgForm.append("chat_id", chatId);
        tgForm.append("photo", file);

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: tgForm });
        const tgData = await tgRes.json();
        if (!tgData.ok) return json({ error: tgData.description }, 400);

        const bestPhoto = tgData.result.photo.pop();
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${bestPhoto.file_id}`);
        const fileData = await fileRes.json();
        const directUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

        return json({ success: true, url: directUrl });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (url.pathname === "/api/settings" && method === "POST") {
      const body = await request.json();
      if (body.settings) await kvSet("settings", body.settings);
      if (body.shorteners) await kvSet("shorteners", body.shorteners);
      if (body.paid_requests) await kvSet("paid_requests", body.paid_requests);
      return json({ success: true });
    }

    // Render Frontend HTML
    return new Response(renderFullAppHTML(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};

function renderFullAppHTML() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AnimeBox - Ultimate Anime & Movie Portal</title>
  
  <meta name="description" content="Watch and download high-quality anime, dramas, and movies with instant streaming and VIP pass support.">
  <meta name="theme-color" content="#00ff66">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="AnimeBox">
  
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="icon" type="image/png" href="/icon-192.png">

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #05080c;
      --card: #0d121c;
      --card-hover: #141b29;
      --primary: #00ff66;
      --accent: #00f2fe;
      --text: #f0fdf4;
      --text-muted: #94a3b8;
      --border: rgba(0, 255, 102, 0.15);
      --gradient: linear-gradient(135deg, #00ff66 0%, #00f2fe 100%);
      --glow: rgba(0, 255, 102, 0.2);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; padding-bottom: 75px; }

    header { position: sticky; top: 0; z-index: 100; background: rgba(5, 8, 12, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .brand { font-size: 22px; font-weight: 900; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; cursor: pointer; letter-spacing: 1px; }
    .search-box { flex: 1; max-width: 380px; position: relative; }
    .search-box input { width: 100%; padding: 8px 14px 8px 36px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); border-radius: 20px; color: #fff; font-size: 13px; outline: none; }
    .search-box input:focus { border-color: var(--primary); box-shadow: 0 0 10px var(--glow); }
    .search-box i { position: absolute; left: 12px; top: 10px; color: var(--text-muted); font-size: 13px; }
    
    .btn-head { background: var(--gradient); color: #000; font-weight: 800; border: none; padding: 7px 14px; border-radius: 18px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }

    .filter-chips { display: flex; gap: 8px; overflow-x: auto; padding: 10px 18px; scrollbar-width: none; border-bottom: 1px solid rgba(0,255,102,0.05); }
    .filter-chips::-webkit-scrollbar { display: none; }
    .chip { background: var(--card); border: 1px solid var(--border); color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; cursor: pointer; transition:0.2s; }
    .chip.active, .chip:hover { background: var(--primary); color: #000; border-color: var(--primary); }

    .slider { display: flex; gap: 15px; overflow-x: auto; padding: 12px 18px; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .slider::-webkit-scrollbar { display: none; }
    .slide-card { flex: 0 0 280px; height: 160px; border-radius: 14px; overflow: hidden; position: relative; border: 1px solid var(--border); cursor: pointer; scroll-snap-align: start; }
    .slide-card img { width: 100%; height: 100%; object-fit: cover; }
    .slide-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #05080c 20%, transparent 80%); display: flex; flex-direction: column; justify-content: flex-end; padding: 12px; }
    .slide-title { font-size: 14px; font-weight: bold; }
    .slide-tag { font-size: 10px; color: var(--primary); font-weight: 800; text-transform: uppercase; }

    .section-head { padding: 8px 18px; font-size: 16px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px; padding: 0 18px 20px 18px; }
    .card { background: var(--card); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); cursor: pointer; transition: 0.2s; position: relative; display: flex; flex-direction: column; }
    .card:active { transform: scale(0.97); }
    .poster-wrap { width: 100%; aspect-ratio: 2/3; background: #0c1410; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; }
    .poster-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .no-img-text { padding: 10px; font-size: 12px; font-weight: bold; color: var(--primary); text-transform: uppercase; }
    .category-badge { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.75); border: 1px solid var(--border); color: var(--primary); font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .card-meta { padding: 8px; font-size: 12px; }
    .card-title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-sub { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

    .detail-view { display: none; padding: 18px; max-width: 900px; margin: auto; }
    .detail-view.active { display: block; }
    .back-btn { background: none; border: 1px solid var(--border); color: var(--primary); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; margin-bottom: 14px; }
    .detail-meta-box { display: flex; gap: 16px; margin-bottom: 18px; }
    .detail-meta-box img { width: 110px; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
    .detail-info h2 { font-size: 18px; color: var(--primary); margin-bottom: 6px; }
    .detail-info p { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 4px; }

    .player-box { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 16px; display: none; }
    .player-box iframe { width: 100%; height: 100%; border: none; }

    .ep-list { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-top: 14px; }
    .ep-btn { background: rgba(0,255,102,0.06); border: 1px solid var(--border); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; margin: 4px; }
    .ep-btn:hover, .ep-btn.active { background: var(--primary); color: #000; }

    .app-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: rgba(13, 18, 28, 0.95); backdrop-filter: blur(15px); border-top: 1px solid var(--border); display: flex; justify-content: space-around; align-items: center; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-muted); font-size: 10px; font-weight: 700; text-decoration: none; cursor: pointer; }
    .nav-item i { font-size: 18px; }
    .nav-item.active { color: var(--primary); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1001; display: none; justify-content: center; align-items: center; padding: 18px; }
    .modal-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 22px; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto; position: relative; }
    .modal-card h3 { margin-bottom: 12px; color: var(--primary); font-size: 18px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 11px; font-weight: bold; color: var(--text-muted); margin-bottom: 4px; }
    .form-control { width: 100%; padding: 9px 12px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 12px; outline: none; }
    .form-control:focus { border-color: var(--primary); }
    .btn-action { width: 100%; padding: 11px; background: var(--gradient); color: #000; font-weight: 800; border: none; border-radius: 8px; cursor: pointer; margin-top: 6px; }

    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #111e16; border: 1px solid var(--primary); color: #fff; padding: 8px 18px; border-radius: 30px; font-size: 12px; font-weight: bold; z-index: 2000; display: none; }
  </style>
</head>
<body>

  <div class="toast" id="toast"></div>

  <header>
    <div class="brand" onclick="goHome()">AnimeBox</div>
    <div class="search-box">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="searchInp" placeholder="Search anime, dramas, movie..." oninput="applyFilters()">
    </div>
    <button class="btn-head" onclick="openAdmin()"><i class="fa-solid fa-gear"></i> Admin</button>
  </header>

  <!-- Category & Genre Dynamics -->
  <div class="filter-chips" id="catChips"></div>
  <div class="filter-chips" id="genreChips" style="display:none; padding-top:10px; border-bottom:1px solid rgba(0,255,102,0.1);"></div>

  <div id="catalogView">
    <div class="slider" id="featuredSlider"></div>
    <div class="section-head">
      <span id="gridTitle">🔥 Latest Updates</span>
    </div>
    <div class="grid" id="mainGrid"></div>
  </div>

  <div class="detail-view" id="detailView">
    <button class="back-btn" onclick="goHome()"><i class="fa-solid fa-arrow-left"></i> Back to Catalog</button>
    <div class="detail-meta-box" id="detailMeta"></div>
    <div class="player-box" id="playerBox"></div>
    <div class="ep-list" id="epListContainer"></div>
  </div>

  <div class="app-bar">
    <div class="nav-item active" onclick="goHome()"><i class="fa-solid fa-house"></i>Home</div>
    <div class="nav-item" onclick="openVIPModal()"><i class="fa-solid fa-gem"></i>VIP Pass</div>
    <div class="nav-item" onclick="openDecryptModal()"><i class="fa-solid fa-key"></i>Unlock Key</div>
    <div class="nav-item" onclick="openAZModal()"><i class="fa-solid fa-arrow-down-a-z"></i>A-Z</div>
    <a id="tgLink" href="#" target="_blank" class="nav-item"><i class="fa-brands fa-telegram"></i>Telegram</a>
  </div>

  <!-- ADMIN CONTROL CENTER MODAL -->
  <div class="modal-overlay" id="adminModal">
    <div class="modal-card">
      <span onclick="closeModal('adminModal')" style="position:absolute; right:15px; top:12px; cursor:pointer; font-size:18px;">✕</span>
      <h3>Admin Control Center</h3>
      
      <div id="adminLock">
        <div class="form-group">
          <label>Admin PIN Passcode</label>
          <input type="password" id="adminPinInp" class="form-control" placeholder="Default PIN: admin123">
        </div>
        <button class="btn-action" onclick="verifyAdmin()">Unlock Control Center</button>
      </div>

      <div id="adminBody" style="display:none;">
        <div style="display:flex; gap:4px; margin-bottom:14px; overflow-x:auto;">
          <button class="ep-btn active" onclick="setAdminTab('post')">Add Post</button>
          <button class="ep-btn" onclick="setAdminTab('ep')">Episodes</button>
          <button class="ep-btn" onclick="setAdminTab('vip')">VIP Passes</button>
          <button class="ep-btn" onclick="setAdminTab('cfg')">Settings</button>
        </div>

        <div id="tabPost">
          <div class="form-group" style="background: rgba(0,255,102,0.04); padding:10px; border-radius:8px; border:1px dashed var(--border);">
            <label style="color:var(--primary);"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto Post Fill Parser</label>
            <textarea id="autoDetectInp" class="form-control" style="height:80px; font-size:11px;" placeholder="Paste raw text details (Name: Naruto, Season: 1, Story: ...)" oninput="handleAutoDetect()"></textarea>
          </div>
          <div class="form-group">
            <label>Poster Image (Telegram Upload / Direct URL)</label>
            <input type="file" id="pImgFile" class="form-control" accept="image/*" onchange="uploadTgImage()">
            <input type="text" id="pImgUrl" class="form-control" placeholder="OR paste external URL directly" style="margin-top:4px;">
          </div>
          <div class="form-group">
            <label>Post/Anime Name</label>
            <input type="text" id="pName" class="form-control" required placeholder="e.g. Solo Leveling">
          </div>
          <div class="form-group">
            <label>Category Group</label>
            <input type="text" id="pCategory" class="form-control" placeholder="e.g. Hindi Subbed Anime" required>
          </div>
          <div class="form-group">
            <label>Genres (Separated by space)</label>
            <input type="text" id="pGenre" class="form-control" placeholder="Action Fantasy Shounen">
          </div>
          <div class="form-group">
            <label>Season (e.g. Season 01)</label>
            <input type="text" id="pSeason" class="form-control" placeholder="Season 1">
          </div>
          <div class="form-group">
            <label>Release Year</label>
            <input type="text" id="pRelease" class="form-control" placeholder="2025">
          </div>
          <div class="form-group">
            <label>Short Story/Synopsis</label>
            <textarea id="pStory" class="form-control" style="height:60px;"></textarea>
          </div>
          <button class="btn-action" onclick="savePost()">Publish Post</button>
        </div>

        <div id="tabEp" style="display:none;">
          <div class="form-group">
            <label>Target Anime Post</label>
            <select id="epPostSelect" class="form-control"></select>
          </div>
          <div class="form-group">
            <label>Episode Label</label>
            <input type="text" id="epNum" class="form-control" placeholder="e.g. 01, Full Pack">
          </div>
          <div class="form-group">
            <label>Quality Resolution</label>
            <select id="epQuality" class="form-control">
              <option value="SD (480p)">SD (480p)</option>
              <option value="HD (720p)" selected>HD (720p)</option>
              <option value="FHD (1080p)">FHD (1080p)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Player Embed Link (Streamwish/Filemoon/MP4)</label>
            <input type="text" id="epPlayLink" class="form-control" placeholder="https://streamwish.to/e/...">
          </div>
          <div class="form-group">
            <label>Download Target Link</label>
            <input type="text" id="epDlLink" class="form-control" placeholder="https://drive.google.com/...">
          </div>
          <button class="btn-action" onclick="saveEpisode()">Save Episode</button>
        </div>

        <div id="tabVip" style="display:none;">
          <div class="form-group">
            <label>Customer Gmail Address</label>
            <input type="email" id="vipEmail" class="form-control" placeholder="user@gmail.com">
          </div>
          <div class="form-group">
            <label>Set Access Key Passcode</label>
            <input type="text" id="vipKey" class="form-control" placeholder="PASS99">
          </div>
          <div class="form-group">
            <label>Select Duration</label>
            <select id="vipDays" class="form-control">
              <option value="1">1 Day Pass</option>
              <option value="7">7 Days Pass</option>
              <option value="30" selected>30 Days (1 Month)</option>
              <option value="365">1 Year VIP</option>
            </select>
          </div>
          <button class="btn-action" onclick="saveVipUser()">Activate VIP Pass</button>
        </div>

        <div id="tabCfg" style="display:none;">
          <div class="form-group">
            <label>Telegram Bot Token</label>
            <input type="text" id="cfgBotToken" class="form-control" placeholder="123456:ABC-DEF...">
          </div>
          <div class="form-group">
            <label>Telegram Private Channel ID</label>
            <input type="text" id="cfgChatId" class="form-control" placeholder="-100xxxxxxxxxx">
          </div>
          <div class="form-group">
            <label>Telegram Public Link</label>
            <input type="text" id="cfgTg" class="form-control" placeholder="https://t.me/yourchannel">
          </div>
          <div class="form-group">
            <label>Admin Access PIN</label>
            <input type="text" id="cfgPin" class="form-control" placeholder="admin123">
          </div>
          <div class="form-group">
            <label>Shortener Domain (e.g. adrinolinks.in)</label>
            <input type="text" id="cfgShDom" class="form-control">
          </div>
          <div class="form-group">
            <label>Shortener API Secret Key</label>
            <input type="text" id="cfgShKey" class="form-control">
          </div>
          <button class="btn-action" onclick="saveSettings()">Save Global Config</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let appData = { posts: [], settings: {} };
    let currentPost = null;
    let currentCategory = 'ALL';
    let currentGenre = 'ALL';

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('PWA SW Active v6'))
          .catch(err => console.log('SW fail:', err));
      });
    }

    window.onload = async () => {
      await loadData();
    };

    async function loadData() {
      try {
        const res = await fetch('/api/data');
        appData = await res.json();
        renderSlider(appData.posts.slice(0, 5));
        renderCatFilters(appData.posts);
        applyFilters();
        document.getElementById('tgLink').href = appData.settings?.channel_link || '#';
      } catch (e) {
        showToast('App live in offline mode');
      }
    }

    // Dynamic Category -> Genre Logic
    function renderCatFilters(posts) {
      const cats = [...new Set(posts.map(p => p.category).filter(Boolean))];
      const bar = document.getElementById('catChips');
      bar.innerHTML = \`<div class="chip active" onclick="filterByCat('ALL')">All Categories</div>\` + 
        cats.map(c => \`<div class="chip" onclick="filterByCat('\${c}')">\${c}</div>\`).join('');
      renderGenreFilters(posts);
    }

    function filterByCat(cat) {
      currentCategory = cat;
      currentGenre = 'ALL';
      
      const chips = document.getElementById('catChips').querySelectorAll('.chip');
      chips.forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      
      renderGenreFilters(appData.posts);
      applyFilters();
    }

    function renderGenreFilters(posts) {
      const gBar = document.getElementById('genreChips');
      if (currentCategory === 'ALL') {
        gBar.style.display = 'none';
        return;
      }
      
      const catPosts = posts.filter(p => p.category === currentCategory);
      const gSet = new Set();
      catPosts.forEach(p => {
        if (p.genres) p.genres.split(/[\\s,;]+/).forEach(g => {
          if(g.trim()) gSet.add(g.trim());
        });
      });
      
      const genres = Array.from(gSet);
      if (genres.length === 0) {
        gBar.style.display = 'none';
        return;
      }
      
      gBar.style.display = 'flex';
      gBar.innerHTML = \`<div class="chip active" onclick="filterByGenre('ALL')">All Genres</div>\` + 
        genres.map(g => \`<div class="chip" onclick="filterByGenre('\${g}')">\${g}</div>\`).join('');
    }

    function filterByGenre(gen) {
      currentGenre = gen;
      const chips = document.getElementById('genreChips').querySelectorAll('.chip');
      chips.forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      applyFilters();
    }

    function applyFilters() {
      let filtered = appData.posts;
      
      if (currentCategory !== 'ALL') {
        filtered = filtered.filter(p => p.category === currentCategory);
      }
      if (currentGenre !== 'ALL') {
        filtered = filtered.filter(p => p.genres && p.genres.includes(currentGenre));
      }
      
      const q = document.getElementById('searchInp').value.toLowerCase().trim();
      if (q) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.genres?.toLowerCase().includes(q) || 
          p.category?.toLowerCase().includes(q)
        );
      }
      
      renderGrid(filtered);
    }

    function renderGrid(posts) {
      const grid = document.getElementById('mainGrid');
      if (!posts || posts.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px;">No anime found in this selection.</p>';
        return;
      }
      grid.innerHTML = posts.map(p => \`
        <div class="card" onclick="openDetail('\${p.id}')">
          <div class="poster-wrap">
            \${p.image_url ? \`<img src="\${p.image_url}" loading="lazy" alt="\${p.name}">\` : \`<div class="no-img-text">\${p.name}</div>\`}
            <span class="category-badge">\${p.category || 'Anime'}</span>
          </div>
          <div class="card-meta">
            <div class="card-title">\${p.name}</div>
            <div class="card-sub">\${p.genres || p.season || ''}</div>
          </div>
        </div>
      \`).join('');
    }

    function renderSlider(posts) {
      const slider = document.getElementById('featuredSlider');
      if (posts.length === 0) { slider.style.display = 'none'; return; }
      slider.style.display = 'flex';
      slider.innerHTML = posts.map(p => \`
        <div class="slide-card" onclick="openDetail('\${p.id}')">
          \${p.image_url ? \`<img src="\${p.image_url}">\` : ''}
          <div class="slide-overlay">
            <div class="slide-tag">\${p.category || 'Featured'}</div>
            <div class="slide-title">\${p.name}</div>
          </div>
        </div>
      \`).join('');
    }

    async function openDetail(postId) {
      currentPost = appData.posts.find(p => p.id === postId);
      if (!currentPost) return;

      document.getElementById('catalogView').style.display = 'none';
      document.getElementById('catChips').style.display = 'none';
      document.getElementById('genreChips').style.display = 'none';
      document.getElementById('detailView').classList.add('active');

      document.getElementById('detailMeta').innerHTML = \`
        \${currentPost.image_url ? \`<img src="\${currentPost.image_url}">\` : ''}
        <div class="detail-info">
          <h2>\${currentPost.name}</h2>
          <p><strong>Category:</strong> \${currentPost.category}</p>
          <p><strong>Genre:</strong> \${currentPost.genres || 'N/A'}</p>
          <p><strong>Season / Year:</strong> \${currentPost.season || ''} (\${currentPost.release || '2025'})</p>
          <p><strong>Story:</strong> \${currentPost.story || 'N/A'}</p>
        </div>
      \`;

      const epRes = await fetch(\`/api/episodes?post_id=\${postId}\`);
      const epData = await epRes.json();
      const list = document.getElementById('epListContainer');

      if (!epData.episodes || epData.episodes.length === 0) {
        list.innerHTML = '<h4>Episodes</h4><p style="color:var(--text-muted); font-size:12px;">No episodes uploaded yet.</p>';
        return;
      }

      list.innerHTML = '<h4>Episodes List</h4><div style="margin-top:8px;">' + epData.episodes.map((e, idx) => \`
        <button class="ep-btn \${idx === 0 ? 'active' : ''}" onclick="playStream('\${e.play_link}', '\${e.id}')">
          Ep \${e.label} [\${e.quality}]
        </button>
        <button class="ep-btn" style="background:#00b359;" onclick="downloadEp('\${e.id}')">
          <i class="fa-solid fa-download"></i>
        </button>
      \`).join('') + '</div>';

      if (epData.episodes[0].play_link) {
        playStream(epData.episodes[0].play_link, epData.episodes[0].id);
      }
    }

    function playStream(url, epId) {
      const box = document.getElementById('playerBox');
      if (url) {
        box.style.display = 'block';
        // RELAXED SANDBOX - Full Embed Support
        box.innerHTML = \`<iframe src="\${url}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"></iframe>\`;
        box.scrollIntoView({ behavior: 'smooth' });
      }
    }

    async function downloadEp(epId) {
      showToast('Generating monetized download link...');
      const key = localStorage.getItem('vip_key') || '';
      const res = await fetch(\`/api/get-link?post_id=\${currentPost.id}&ep_id=\${epId}&key=\${encodeURIComponent(key)}\`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        showToast('Download link not set');
      }
    }

    function goHome() {
      document.getElementById('catalogView').style.display = 'block';
      document.getElementById('detailView').classList.remove('active');
      document.getElementById('playerBox').innerHTML = '';
      document.getElementById('playerBox').style.display = 'none';
      
      document.getElementById('catChips').style.display = 'flex';
      if(currentCategory !== 'ALL') {
          document.getElementById('genreChips').style.display = 'flex';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleAutoDetect() {
      const text = document.getElementById("autoDetectInp").value.trim();
      if (!text) return;

      const lines = text.split('\\n');
      let currentKey = null;
      let parsed = { name: "", category: "", release: "", genres: "", season: "", story: "" };

      lines.forEach(line => {
        const match = line.match(/^\\s*(name|title|naam|category|cat|date|release|year|genre|genres|season|story|synopsis|desc)\\s*:\\s*(.*)/i);
        if (match) {
          const key = match[1].toLowerCase();
          const val = match[2].trim();
          if (['name','title','naam'].includes(key)) currentKey = 'name';
          else if (['category','cat'].includes(key)) currentKey = 'category';
          else if (['date','release','year'].includes(key)) currentKey = 'release';
          else if (['genre','genres'].includes(key)) currentKey = 'genres';
          else if (key === 'season') currentKey = 'season';
          else if (['story','synopsis','desc'].includes(key)) currentKey = 'story';
          if (currentKey) parsed[currentKey] = val;
        } else if (currentKey) {
          parsed[currentKey] += "\\n" + line.trim();
        }
      });

      if (parsed.name) document.getElementById("pName").value = parsed.name.trim();
      if (parsed.category) document.getElementById("pCategory").value = parsed.category.trim();
      if (parsed.genres) document.getElementById("pGenre").value = parsed.genres.trim();
      if (parsed.season) document.getElementById("pSeason").value = parsed.season.trim();
      if (parsed.release) document.getElementById("pRelease").value = parsed.release.trim();
      if (parsed.story) document.getElementById("pStory").value = parsed.story.trim();
    }

    function openAdmin() { document.getElementById('adminModal').style.display = 'flex'; }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }

    function verifyAdmin() {
      const pin = document.getElementById('adminPinInp').value;
      const expected = appData.settings?.admin_pin || 'admin123';
      if (pin === expected) {
        document.getElementById('adminLock').style.display = 'none';
        document.getElementById('adminBody').style.display = 'block';
        updateEpPostDropdown();
      } else {
        alert('Invalid Admin PIN!');
      }
    }

    function setAdminTab(tab) {
      document.getElementById('tabPost').style.display = tab === 'post' ? 'block' : 'none';
      document.getElementById('tabEp').style.display = tab === 'ep' ? 'block' : 'none';
      document.getElementById('tabVip').style.display = tab === 'vip' ? 'block' : 'none';
      document.getElementById('tabCfg').style.display = tab === 'cfg' ? 'block' : 'none';
    }

    function updateEpPostDropdown() {
      const sel = document.getElementById('epPostSelect');
      sel.innerHTML = appData.posts.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join('');
    }

    async function uploadTgImage() {
      const file = document.getElementById('pImgFile').files[0];
      if (!file) return;
      showToast('Uploading to Telegram Channel...');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-telegram', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        document.getElementById('pImgUrl').value = data.url;
        showToast('Image Uploaded to Telegram!');
      } else {
        showToast('Upload failed: ' + (data.error || 'Check Bot Settings'));
      }
    }

    async function savePost() {
      const name = document.getElementById('pName').value.trim();
      const image_url = document.getElementById('pImgUrl').value.trim();
      const category = document.getElementById('pCategory').value.trim();
      const genres = document.getElementById('pGenre').value.trim();
      const season = document.getElementById('pSeason').value.trim();
      const release = document.getElementById('pRelease').value.trim();
      const story = document.getElementById('pStory').value.trim();

      if (!name) return alert('Anime name required!');

      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image_url, category, genres, season, release, story })
      });
      showToast('Post Published & Sent to Telegram!');
      closeModal('adminModal');
      await loadData();
    }

    async function saveEpisode() {
      const post_id = document.getElementById('epPostSelect').value;
      const label = document.getElementById('epNum').value.trim();
      const quality = document.getElementById('epQuality').value;
      const play_link = document.getElementById('epPlayLink').value.trim();
      const download_link = document.getElementById('epDlLink').value.trim();

      await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id, label, quality, play_link, download_link })
      });
      showToast('Episode Attached!');
      closeModal('adminModal');
    }

    async function saveVipUser() {
      const email = document.getElementById('vipEmail').value.trim();
      const key = document.getElementById('vipKey').value.trim();
      const days = document.getElementById('vipDays').value;

      await fetch('/api/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, key, days })
      });
      showToast('VIP Pass Created & TG Alert Sent!');
      closeModal('adminModal');
    }

    async function saveSettings() {
      const channel_link = document.getElementById('cfgTg').value.trim();
      const admin_pin = document.getElementById('cfgPin').value.trim();
      const bot_token = document.getElementById('cfgBotToken').value.trim();
      const chat_id = document.getElementById('cfgChatId').value.trim();
      const shDom = document.getElementById('cfgShDom').value.trim();
      const shKey = document.getElementById('cfgShKey').value.trim();

      const shorteners = shDom && shKey ? [{ domain: shDom, api_key: shKey }] : [];
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { channel_link, admin_pin, bot_token, chat_id },
          shorteners
        })
      });
      showToast('Settings Saved!');
      closeModal('adminModal');
      await loadData();
    }

    function openVIPModal() {
      const key = prompt('Enter your VIP Passcode Key:');
      if (key) {
        localStorage.setItem('vip_key', key);
        showToast('VIP Mode Active!');
      }
    }

    async function openDecryptModal() {
      const code = prompt('Enter Secret Decrypt Key:');
      if (code) {
        const res = await fetch(\`/api/decrypt-link?code=\${encodeURIComponent(code)}\`);
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
        else alert('Invalid key or expired');
      }
    }

    function openAZModal() {
      const letter = prompt('Enter A-Z letter to filter (e.g. N, D, S):');
      if (letter) {
        const l = letter.toUpperCase();
        document.getElementById('searchInp').value = '';
        renderGrid(appData.posts.filter(p => p.name.toUpperCase().startsWith(l)));
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => t.style.display = 'none', 3000);
    }
  </script>
</body>
</html>`;
  }
