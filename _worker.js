/**
 * AnimeBox / Asi Anime - Cloudflare Worker Core Engine
 * Premium PWA APK Edition - 100% PWABuilder Score
 * Features: Auto-Detect Parser, Category->Genre Filtering, Telegram Bot Automation, 
 * VIP Auto-Delete, Advanced Shortener Fallbacks, Imbed Player Support.
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

    // Auto-Delete Expired Premium Users in Background
    ctx.waitUntil((async () => {
      if (env.ANIME_KV) {
        const users = (await kvGet("premium_users", [])) || [];
        const now = new Date();
        const validUsers = users.filter(u => new Date(u.expires_at) > now);
        if (users.length !== validUsers.length) {
          await kvSet("premium_users", validUsers);
        }
      }
    })());

    // Send Telegram Notification Helper
    const notifyTelegram = async (settings, message, imageUrl = null) => {
      if (!settings.bot_token || !settings.chat_id) return;
      try {
        const baseUrl = `https://api.telegram.org/bot${settings.bot_token}`;
        if (imageUrl && imageUrl.startsWith("http")) {
          await fetch(`${baseUrl}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: settings.chat_id, photo: imageUrl, caption: message, parse_mode: 'HTML' })
          });
        } else {
          await fetch(`${baseUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: settings.chat_id, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
          });
        }
      } catch (e) { console.error("Telegram Error", e); }
    };

    // =========================================================================
    // 🚀 PWA ENGINE: MANIFEST, SW, WIDGETS
    // =========================================================================

    if (url.pathname === "/manifest.json") {
      const manifest = {
        id: "/",
        name: "AnimeBox - Ultimate Anime Portal",
        short_name: "AnimeBox",
        description: "Watch and download high-definition anime, dramas, and movies with high-speed streaming.",
        lang: "en-US",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["tabbed", "window-controls-overlay", "standalone"],
        orientation: "portrait-primary",
        background_color: "#030708",
        theme_color: "#00ff66",
        categories: ["entertainment", "video"],
        
        // PWABUILDER FIXED: Scope Extensions attached perfectly!
        scope_extensions: [
          { origin: "*.workers.dev" },
          { origin: "*.t.me" },
          { origin: "*.telegram.org" },
          { origin: "*.youtube.com" }
        ],

        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        screenshots: [
          { src: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&h=720&fit=crop", sizes: "1280x720", type: "image/jpeg", form_factor: "wide", label: "Desktop View" },
          { src: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=720&h=1280&fit=crop", sizes: "720x1280", type: "image/jpeg", form_factor: "narrow", label: "Mobile View" }
        ],
        shortcuts: [
          { name: "Home", short_name: "Home", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          { name: "Watchlist", short_name: "Watchlist", url: "/#watchlist", icons: [{ src: "/icon-192.png", sizes: "192x192" }] }
        ]
      };
      return new Response(JSON.stringify(manifest), {
        headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/sw.js") {
      const swScript = `
        const CACHE_NAME = 'animebox-pwa-v6';
        self.addEventListener('install', (e) => { self.skipWaiting(); });
        self.addEventListener('activate', (e) => { self.clients.claim(); });
        self.addEventListener('fetch', (e) => {
          if (e.request.method !== 'GET') return;
          e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
        });
      `;
      return new Response(swScript, { headers: { "Content-Type": "application/javascript; charset=utf-8" } });
    }

    if (url.pathname.includes("icon-192") || url.pathname.includes("icon-512")) {
      const size = url.pathname.includes("512") ? "512x512" : "192x192";
      return Response.redirect(`https://placehold.co/${size}/030708/00ff66.png?text=AB`, 301);
    }

    // =========================================================================
    // API ENDPOINTS
    // =========================================================================

    if (url.pathname === "/api/data" && method === "GET") {
      const posts = (await kvGet("posts", [])) || [];
      const settings = (await kvGet("settings", {})) || {};
      const shorteners = (await kvGet("shorteners", [])) || [];
      const paid_requests = (await kvGet("paid_requests", [])) || [];
      return json({ posts, settings, shorteners, paid_requests });
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

      // Trigger Telegram Alert
      const settings = (await kvGet("settings", {})) || {};
      const msg = `🚀 <b>New Release Uploaded!</b>\n\n🎬 <b>Name:</b> ${newPost.name}\n📺 <b>Category:</b> ${newPost.category}\n🎭 <b>Genre:</b> ${newPost.genres}\n📅 <b>Season/Year:</b> ${newPost.season} (${newPost.release})\n\n📖 <b>Story:</b> ${newPost.story}\n\n👉 <b>Watch & Download Now!</b>`;
      ctx.waitUntil(notifyTelegram(settings, msg, newPost.image_url));

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
        season: body.season || "Season 1",
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

    // Advanced Shortener Logic with Direct Route Bypass
    if (url.pathname === "/api/get-link") {
      const epId = url.searchParams.get("ep_id");
      const postId = url.searchParams.get("post_id");
      const userKey = url.searchParams.get("key");

      const episodes = (await kvGet(`ep_${postId}`, [])) || [];
      const ep = episodes.find(e => e.id === epId);
      if (!ep) return json({ error: "Episode not found" }, 404);

      const targetUrl = ep.download_link || ep.play_link;
      if (!targetUrl) return json({ error: "Empty link" }, 400);

      // Check VIP Key
      if (userKey) {
        const premiumUsers = (await kvGet("premium_users", [])) || [];
        const user = premiumUsers.find(u => u.key === userKey);
        if (user && new Date(user.expires_at) > new Date()) {
          return json({ direct: true, url: targetUrl });
        }
      }

      // Shortener Generation
      const shorteners = (await kvGet("shorteners", [])) || [];
      if (shorteners.length === 0) return json({ direct: true, url: targetUrl });

      const activeSh = shorteners[Math.floor(Math.random() * shorteners.length)];
      try {
        const domain = activeSh.domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
        const apiEndpoint = `https://${domain}/api?api=${activeSh.api_key}&url=${encodeURIComponent(targetUrl)}&format=text`;
        
        const res = await fetch(apiEndpoint);
        const shortLink = (await res.text()).trim();
        if (shortLink.startsWith("http")) return json({ direct: false, url: shortLink });

        // Fallback CORS Proxy if primary fails
        const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(apiEndpoint)}`);
        const proxyData = await proxyRes.json();
        if (proxyData.contents && proxyData.contents.trim().startsWith("http")) {
          return json({ direct: false, url: proxyData.contents.trim() });
        }
      } catch (err) {
        console.error("Shortener logic failed:", err);
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

      // Telegram Automation
      const settings = (await kvGet("settings", {})) || {};
      const tgMsg = `💎 <b>New VIP Pass Created!</b>\n\n📧 <b>User:</b> ${newUser.email}\n🔑 <b>Access Key:</b> <code>${newUser.key}</code>\n⏳ <b>Expires:</b> ${expiry.toLocaleDateString()}\n\n<i>Bot will auto-delete access when expired.</i>`;
      ctx.waitUntil(notifyTelegram(settings, tgMsg));

      return json({ success: true, user: newUser });
    }

    if (url.pathname.startsWith("/api/premium/") && method === "DELETE") {
      const email = url.pathname.split("/").pop();
      let users = (await kvGet("premium_users", [])) || [];
      users = users.filter(u => u.email !== email);
      await kvSet("premium_users", users);
      return json({ success: true });
    }

    if (url.pathname === "/api/settings" && method === "POST") {
      const body = await request.json();
      if (body.settings) await kvSet("settings", body.settings);
      if (body.shorteners) await kvSet("shorteners", body.shorteners);
      if (body.paid_requests) await kvSet("paid_requests", body.paid_requests);
      return json({ success: true });
    }

    // Render Frontend
    return new Response(renderFullAppHTML(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};

function renderFullAppHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AnimeBox - Ultimate Anime & Drama Portal</title>
  <meta name="theme-color" content="#00ff66">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root { 
      --bg: #030708; 
      --header: rgba(3, 7, 8, 0.95); 
      --card-bg: rgba(10, 20, 16, 0.7);
      --primary: #00ff66; 
      --primary-glow: rgba(0, 255, 102, 0.25);
      --text: #f0f5f2; 
      --text-muted: #94a3b8;
      --border: rgba(0, 255, 102, 0.12); 
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; -webkit-tap-highlight-color: transparent;}
    body { background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; padding-bottom: 70px;}
    ::-webkit-scrollbar { display: none; }

    /* Header */
    .header { background: var(--header); padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--border); backdrop-filter: blur(15px); gap: 10px; }
    .brand { font-size: 22px; font-weight: 900; color: var(--primary); cursor: pointer; text-shadow: 0 0 10px var(--primary-glow); }
    .search-box { flex: 1; max-width: 400px; position: relative; }
    .search-box input { width: 100%; padding: 8px 14px 8px 36px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 20px; color: #fff; font-size: 13px; outline: none; }
    .search-box input:focus { border-color: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
    .search-box i { position: absolute; left: 12px; top: 10px; color: var(--text-muted); font-size: 13px; }
    .admin-btn { background: rgba(0, 255, 102, 0.1); color: var(--primary); border: 1px solid var(--border); padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; }

    /* Dynamic Category & Genre Filter Chips */
    .chip-container { display: flex; gap: 8px; overflow-x: auto; padding: 12px 18px; border-bottom: 1px solid var(--border); }
    .chip { background: var(--card-bg); border: 1px solid var(--border); color: var(--text-muted); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: 0.2s; }
    .chip.active { background: var(--primary); color: #000; border-color: var(--primary); box-shadow: 0 0 8px var(--primary-glow); }

    /* Grid Layout */
    .section-head { padding: 15px 18px 5px; font-size: 18px; font-weight: 800; text-transform: uppercase; }
    .section-head span { color: var(--primary); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; padding: 15px 18px; }
    .card { cursor: pointer; transition: 0.3s; display: flex; flex-direction: column; }
    .card:active { transform: scale(0.96); }
    .poster-wrap { width: 100%; aspect-ratio: 2/3; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); position: relative; background: linear-gradient(135deg, #050a07 0%, #0d1a14 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .poster-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .poster-wrap .icon-bg { font-size: 30px; color: rgba(0, 255, 102, 0.15); margin-bottom: 8px; }
    .poster-wrap .fallback-txt { color: var(--primary); font-size: 13px; font-weight: bold; padding: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
    .badge { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.8); color: var(--primary); font-size: 9px; font-weight: 900; padding: 3px 6px; border-radius: 4px; border: 1px solid var(--border); }
    .card-title { margin-top: 8px; font-size: 13px; font-weight: 700; color: #fff; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

    /* Bottom App Bar */
    .app-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: rgba(3, 7, 8, 0.95); backdrop-filter: blur(15px); border-top: 1px solid var(--border); display: flex; justify-content: space-around; align-items: center; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-muted); font-size: 10px; font-weight: 700; cursor: pointer; }
    .nav-item i { font-size: 18px; }
    .nav-item.active { color: var(--primary); }

    /* Detail View */
    .detail-view { display: none; padding: 18px; max-width: 900px; margin: auto; }
    .detail-view.active { display: block; }
    .back-btn { background: none; border: 1px solid var(--border); color: var(--primary); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
    .detail-header { display: flex; gap: 15px; margin-bottom: 20px; }
    .detail-header img { width: 120px; aspect-ratio: 2/3; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); }
    .detail-info h2 { font-size: 20px; color: var(--primary); margin-bottom: 10px; }
    .detail-info p { font-size: 12px; color: var(--text-muted); margin-bottom: 5px; line-height: 1.5; }
    .detail-info p strong { color: #fff; }

    .player-box { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; display: none; margin-bottom: 20px; }
    .player-box iframe { width: 100%; height: 100%; border: none; }

    .ep-group { margin-top: 15px; border-top: 1px solid rgba(0,255,102,0.1); padding-top: 10px; }
    .ep-group-title { font-size: 14px; font-weight: bold; color: var(--primary); margin-bottom: 10px; }
    .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
    .ep-btn { background: #0a1410; border: 1px solid var(--border); color: #fff; padding: 10px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: center; }
    .ep-btn:hover { background: var(--primary); color: #000; }

    /* Admin Modals */
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; padding: 15px; }
    .modal-box { background: var(--header); border: 1px solid var(--border); border-radius: 12px; padding: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative; }
    .close-modal { position: absolute; top: 15px; right: 15px; font-size: 22px; color: var(--text-muted); cursor: pointer; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 11px; font-weight: bold; color: var(--primary); margin-bottom: 4px; }
    .form-control { width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 12px; outline: none; }
    .btn-submit { width: 100%; background: var(--primary); color: #000; padding: 12px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin-top: 5px; }
    .tab-bar { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid var(--border); }
    .tab-btn { background: transparent; border: 1px solid var(--border); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; white-space: nowrap; }
    .tab-btn.active { background: var(--primary); color: #000; }
    .list-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(0,255,102,0.1); font-size: 12px; align-items: center; }
    .del-btn { background: #d32f2f; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; font-size: 10px; cursor: pointer; }

    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #00ff66; color: #000; padding: 10px 20px; border-radius: 30px; font-size: 12px; font-weight: bold; z-index: 2000; display: none; box-shadow: 0 0 15px rgba(0,255,102,0.5); }
  </style>
</head>
<body>

  <div class="toast" id="toast"></div>

  <div class="header">
    <div class="brand" onclick="goHome()">AnimeBox</div>
    <div class="search-box">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="searchInp" placeholder="Search anime..." oninput="applyFilters()">
    </div>
    <button class="admin-btn" onclick="openAdmin()"><i class="fa-solid fa-shield-halved"></i> Admin</button>
  </div>

  <div id="mainView">
    <!-- Categories Row -->
    <div class="chip-container" id="catChips"></div>
    <!-- Genres Row (Dynamic based on Category) -->
    <div class="chip-container" id="genreChips" style="display:none; padding-top: 5px; border-top:none;"></div>

    <div class="section-head" id="gridTitle">🔥 Latest <span>Updates</span></div>
    <div class="grid" id="mainGrid"></div>
  </div>

  <div class="detail-view" id="detailView">
    <button class="back-btn" onclick="goHome()"><i class="fa-solid fa-arrow-left"></i> Back to Grid</button>
    <div id="detailContent"></div>
    <div class="player-box" id="playerBox"></div>
    <div id="episodesList"></div>
  </div>

  <div class="app-bar">
    <div class="nav-item active" onclick="goHome()"><i class="fa-solid fa-house"></i>Home</div>
    <div class="nav-item" onclick="openVIPPrompt()"><i class="fa-solid fa-gem"></i>VIP Pass</div>
    <div class="nav-item" onclick="openUnlockPrompt()"><i class="fa-solid fa-lock"></i>Decrypt</div>
    <div class="nav-item" onclick="showWatchlist()"><i class="fa-solid fa-bookmark"></i>Watchlist</div>
    <a id="tgLink" href="#" target="_blank" class="nav-item" style="text-decoration:none;"><i class="fa-brands fa-telegram"></i>Telegram</a>
  </div>

  <!-- ADMIN MODAL -->
  <div class="modal" id="adminModal">
    <div class="modal-box">
      <span class="close-modal" onclick="closeModal('adminModal')">&times;</span>
      
      <div id="adminLock">
        <h3 style="color:var(--primary); margin-bottom:15px;">Admin Login</h3>
        <input type="password" id="adminPin" class="form-control" placeholder="Enter Admin PIN">
        <button class="btn-submit" onclick="verifyAdmin()">Unlock Control Panel</button>
      </div>

      <div id="adminPanel" style="display:none;">
        <h3 style="color:var(--primary); margin-bottom:10px;">Control Center</h3>
        <div class="tab-bar">
          <button class="tab-btn active" onclick="switchAdminTab('post')">Add Post</button>
          <button class="tab-btn" onclick="switchAdminTab('ep')">Episodes</button>
          <button class="tab-btn" onclick="switchAdminTab('del')">Delete DB</button>
          <button class="tab-btn" onclick="switchAdminTab('vip')">VIP Pass</button>
          <button class="tab-btn" onclick="switchAdminTab('link')">Decrypt Links</button>
          <button class="tab-btn" onclick="switchAdminTab('cfg')">Settings</button>
        </div>

        <div id="tab_post">
          <div class="form-group"><label>Auto Fill Parser</label><textarea id="pParse" class="form-control" style="height:60px;" placeholder="Name: Naruto\nCategory: Hindi Sub..."></textarea></div>
          <button class="btn-submit" style="margin-bottom:10px;" onclick="parseData()">Auto Fill</button>
          <div class="form-group"><label>Post Name</label><input type="text" id="pName" class="form-control"></div>
          <div class="form-group"><label>Poster URL</label><input type="text" id="pImg" class="form-control"></div>
          <div class="form-group"><label>Category Group</label><input type="text" id="pCat" class="form-control" placeholder="Hindi Sub Anime"></div>
          <div class="form-group"><label>Genres</label><input type="text" id="pGen" class="form-control" placeholder="Action Comedy"></div>
          <div class="form-group"><label>Season</label><input type="text" id="pSea" class="form-control" placeholder="Season 1"></div>
          <div class="form-group"><label>Story</label><textarea id="pStory" class="form-control"></textarea></div>
          <button class="btn-submit" onclick="savePost()">Publish Post & Notify TG</button>
        </div>

        <div id="tab_ep" style="display:none;">
          <div class="form-group"><label>Select Post</label><select id="epPost" class="form-control"></select></div>
          <div class="form-group"><label>Season Label</label><input type="text" id="epSea" class="form-control" value="Season 1"></div>
          <div class="form-group"><label>Episode Number</label><input type="text" id="epNum" class="form-control" placeholder="01"></div>
          <div class="form-group"><label>Quality</label><select id="epQual" class="form-control"><option>HD (720p)</option><option>FHD (1080p)</option><option>SD (480p)</option></select></div>
          <div class="form-group"><label>Stream Embed Link</label><input type="text" id="epPlay" class="form-control"></div>
          <div class="form-group"><label>Download Link</label><input type="text" id="epDl" class="form-control"></div>
          <button class="btn-submit" onclick="saveEp()">Attach Episode</button>
        </div>

        <div id="tab_del" style="display:none;">
          <div id="delList" style="max-height:300px; overflow-y:auto; border:1px solid var(--border); padding:5px; border-radius:8px;"></div>
        </div>

        <div id="tab_vip" style="display:none;">
          <div class="form-group"><label>Email</label><input type="text" id="vEmail" class="form-control"></div>
          <div class="form-group"><label>Passkey</label><input type="text" id="vKey" class="form-control"></div>
          <div class="form-group"><label>Days Valid</label><input type="number" id="vDays" class="form-control" value="30"></div>
          <button class="btn-submit" onclick="saveVip()">Generate VIP & Notify TG</button>
          <div id="vipList" style="margin-top:15px; border-top:1px solid var(--border); padding-top:10px;"></div>
        </div>

        <div id="tab_link" style="display:none;">
          <div class="form-group"><label>Secret Code</label><input type="text" id="lCode" class="form-control"></div>
          <div class="form-group"><label>Hidden Target URL</label><input type="text" id="lUrl" class="form-control"></div>
          <button class="btn-submit" onclick="saveLink()">Lock Link</button>
        </div>

        <div id="tab_cfg" style="display:none;">
          <div class="form-group"><label>Telegram Bot Token</label><input type="password" id="cBot" class="form-control"></div>
          <div class="form-group"><label>Telegram Chat ID</label><input type="text" id="cChat" class="form-control"></div>
          <div class="form-group"><label>Telegram Public Link</label><input type="text" id="cTgLink" class="form-control"></div>
          <div class="form-group"><label>Admin PIN</label><input type="text" id="cPin" class="form-control"></div>
          <div class="form-group"><label>Shortener Domain</label><input type="text" id="cShDom" class="form-control" placeholder="domain.com"></div>
          <div class="form-group"><label>Shortener API Key</label><input type="text" id="cShKey" class="form-control"></div>
          <button class="btn-submit" onclick="saveSettings()">Save Global Settings</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ACTION MODAL -->
  <div class="modal" id="actionModal">
    <div class="modal-box" id="actionContent" style="text-align:center;"></div>
  </div>

  <script>
    let appData = { posts: [], settings: {}, shorteners: [], paid_requests: [] };
    let selCat = 'ALL', selGen = 'ALL', viewMode = 'home';
    let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];

    // Init PWA SW
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    }

    window.onload = async () => {
      await loadData();
    };

    async function loadData() {
      try {
        const res = await fetch('/api/data');
        appData = await res.json();
        document.getElementById('tgLink').href = appData.settings?.channel_link || '#';
        renderCatChips();
        applyFilters();
      } catch (e) { showToast("Offline Mode Active"); }
    }

    // ==========================================
    // DYNAMIC CATEGORY -> GENRE CHAIN LOGIC
    // ==========================================
    function renderCatChips() {
      const cats = [...new Set(appData.posts.map(p => p.category).filter(Boolean))];
      let html = \`<div class="chip \${selCat==='ALL'?'active':''}" onclick="setCat('ALL')">All Categories</div>\`;
      cats.forEach(c => { html += \`<div class="chip \${selCat===c?'active':''}" onclick="setCat('\${c}')">\${c}</div>\`; });
      document.getElementById('catChips').innerHTML = html;
      renderGenChips();
    }

    function setCat(c) {
      selCat = c; selGen = 'ALL'; viewMode = 'home';
      renderCatChips();
      applyFilters();
    }

    function renderGenChips() {
      const gb = document.getElementById('genreChips');
      if (selCat === 'ALL') { gb.style.display = 'none'; return; }
      
      const inCat = appData.posts.filter(p => p.category === selCat);
      const gSet = new Set();
      inCat.forEach(p => { if (p.genres) p.genres.split(/[\\s,;]+/).forEach(g => gSet.add(g.trim())); });
      const gens = Array.from(gSet).filter(Boolean);

      if (gens.length === 0) { gb.style.display = 'none'; return; }

      gb.style.display = 'flex';
      let html = \`<div class="chip \${selGen==='ALL'?'active':''}" onclick="setGen('ALL')">All Genres</div>\`;
      gens.forEach(g => { html += \`<div class="chip \${selGen===g?'active':''}" onclick="setGen('\${g}')">\${g}</div>\`; });
      gb.innerHTML = html;
    }

    function setGen(g) {
      selGen = g;
      renderGenChips();
      applyFilters();
    }

    function applyFilters() {
      if (viewMode === 'watchlist') {
        renderGrid(appData.posts.filter(p => watchlist.includes(p.id)));
        return;
      }
      
      let res = appData.posts;
      if (selCat !== 'ALL') res = res.filter(p => p.category === selCat);
      if (selGen !== 'ALL') res = res.filter(p => p.genres && p.genres.includes(selGen));
      
      const q = document.getElementById('searchInp').value.toLowerCase().trim();
      if (q) res = res.filter(p => p.name.toLowerCase().includes(q) || p.genres?.toLowerCase().includes(q));
      
      renderGrid(res);
    }

    function renderGrid(posts) {
      const grid = document.getElementById('mainGrid');
      if (!posts.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#777;padding:30px;">No results found.</div>'; return; }
      
      grid.innerHTML = posts.map(p => \`
        <div class="card" onclick="openDetail('\${p.id}')">
          <div class="poster-wrap">
            <span class="badge">\${p.category}</span>
            \${p.image_url ? \`<img src="\${p.image_url}" loading="lazy">\` : \`<i class="fa-solid fa-film icon-bg"></i><div class="fallback-txt">\${p.name}</div>\`}
          </div>
          <div class="card-title">\${p.name}</div>
        </div>
      \`).join('');
    }

    function goHome() {
      viewMode = 'home';
      document.getElementById('mainView').style.display = 'block';
      document.getElementById('detailView').classList.remove('active');
      document.getElementById('playerBox').style.display = 'none';
      document.getElementById('playerBox').innerHTML = '';
      document.getElementById('gridTitle').innerHTML = '🔥 Latest <span>Updates</span>';
      document.getElementById('catChips').style.display = 'flex';
      applyFilters();
    }

    function showWatchlist() {
      viewMode = 'watchlist';
      document.getElementById('mainView').style.display = 'block';
      document.getElementById('detailView').classList.remove('active');
      document.getElementById('catChips').style.display = 'none';
      document.getElementById('genreChips').style.display = 'none';
      document.getElementById('gridTitle').innerHTML = '🔖 My <span>Watchlist</span>';
      applyFilters();
    }

    // ==========================================
    // DETAIL & EPISODES
    // ==========================================
    let currentPost = null;
    async function openDetail(id) {
      currentPost = appData.posts.find(p => p.id === id);
      if (!currentPost) return;

      document.getElementById('mainView').style.display = 'none';
      document.getElementById('detailView').classList.add('active');

      const inFav = watchlist.includes(id);

      document.getElementById('detailContent').innerHTML = \`
        <div class="detail-header">
          \${currentPost.image_url ? \`<img src="\${currentPost.image_url}">\` : ''}
          <div class="detail-info">
            <h2>\${currentPost.name}</h2>
            <p><strong>Category:</strong> \${currentPost.category}</p>
            <p><strong>Genre:</strong> \${currentPost.genres || 'N/A'}</p>
            <p><strong>Season:</strong> \${currentPost.season || ''}</p>
            <button onclick="toggleWatchlist('\${id}')" style="background:\${inFav?'var(--primary)':'#111'}; color:\${inFav?'#000':'#fff'}; border:1px solid var(--border); padding:6px 12px; border-radius:6px; margin-top:10px; cursor:pointer; font-weight:bold;">
              <i class="fa-solid fa-bookmark"></i> \${inFav?'In Watchlist':'Add to Watchlist'}
            </button>
          </div>
        </div>
        <div style="color:var(--text-muted); font-size:12px; line-height:1.5; margin-bottom:20px; border-top:1px solid var(--border); padding-top:10px;">
          \${currentPost.story || 'No summary available.'}
        </div>
      \`;

      const epRes = await fetch(\`/api/episodes?post_id=\${id}\`);
      const epData = await epRes.json();
      renderEpisodes(epData.episodes || []);
    }

    function toggleWatchlist(id) {
      if (watchlist.includes(id)) watchlist = watchlist.filter(x => x !== id);
      else watchlist.push(id);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      openDetail(id);
    }

    function renderEpisodes(eps) {
      const list = document.getElementById('episodesList');
      if (!eps.length) { list.innerHTML = '<p style="color:#777;">No episodes uploaded yet.</p>'; return; }

      // Group by Season -> Quality
      const grouped = {};
      eps.forEach(e => {
        const s = e.season || "Season 1";
        if (!grouped[s]) grouped[s] = {};
        const q = e.quality || "HD (720p)";
        if (!grouped[s][q]) grouped[s][q] = [];
        grouped[s][q].push(e);
      });

      let html = '';
      Object.keys(grouped).sort().forEach(sea => {
        html += \`<div class="ep-group"><div class="ep-group-title">\${sea}</div>\`;
        Object.keys(grouped[sea]).sort().forEach(qual => {
          html += \`<div style="font-size:11px; color:#aaa; margin:8px 0 5px;">\${qual}</div><div class="ep-grid">\`;
          const epArray = grouped[sea][qual].sort((a,b) => parseInt(a.label) - parseInt(b.label));
          epArray.forEach(e => {
            html += \`<button class="ep-btn" onclick="openAction('\${e.id}', \${!!e.play_link}, \${!!e.download_link})">Ep \${e.label}</button>\`;
          });
          html += \`</div>\`;
        });
        html += \`</div>\`;
      });
      list.innerHTML = html;
    }

    function openAction(epId, hasPlay, hasDl) {
      const m = document.getElementById('actionModal');
      document.getElementById('actionContent').innerHTML = \`
        <span class="close-modal" onclick="closeModal('actionModal')">&times;</span>
        <h3 style="color:var(--primary); margin-bottom:15px;">Choose Action</h3>
        \${hasPlay ? \`<button class="btn-submit" style="background:#0088cc; color:#fff;" onclick="playVid('\${epId}')"><i class="fa-solid fa-play"></i> Stream Video</button>\` : ''}
        \${hasDl ? \`<button class="btn-submit" onclick="dlVid('\${epId}')"><i class="fa-solid fa-download"></i> Standard Download</button>
                    <button class="btn-submit" style="background:#00b359;" onclick="dlVid('\${epId}', true)"><i class="fa-solid fa-gem"></i> VIP Direct Download</button>\` : ''}
      \`;
      m.style.display = 'flex';
    }

    async function playVid(epId) {
      closeModal('actionModal');
      const box = document.getElementById('playerBox');
      const epRes = await fetch(\`/api/episodes?post_id=\${currentPost.id}\`);
      const eps = await epRes.json();
      const ep = eps.episodes.find(e => e.id === epId);
      if (ep?.play_link) {
        box.style.display = 'block';
        // RELAXED SANDBOX FOR ALL EMBEDS
        box.innerHTML = \`<iframe src="\${ep.play_link}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox"></iframe>\`;
        box.scrollIntoView({behavior: 'smooth'});
      }
    }

    async function dlVid(epId, isVip = false) {
      let key = '';
      if (isVip) {
        key = prompt("Enter VIP Passcode:");
        if (!key) return;
      }
      showToast("Generating link... Please wait.");
      const res = await fetch(\`/api/get-link?post_id=\${currentPost.id}&ep_id=\${epId}&key=\${encodeURIComponent(key)}\`);
      const data = await res.json();
      if (data.url) {
        const form = document.createElement("form");
        form.method = "GET"; form.action = data.url; form.target = "_blank"; form.rel = "noreferrer noopener";
        document.body.appendChild(form); form.submit(); document.body.removeChild(form);
        closeModal('actionModal');
      } else {
        alert(data.error || "Link failed.");
      }
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================
    function openAdmin() { document.getElementById('adminModal').style.display = 'flex'; }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }
    function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.style.display='block'; setTimeout(()=>t.style.display='none',3000); }

    function verifyAdmin() {
      const pin = document.getElementById('adminPin').value;
      if (pin === (appData.settings.admin_pin || 'admin123')) {
        document.getElementById('adminLock').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        refreshAdminData();
      } else { alert("Wrong PIN"); }
    }

    function switchAdminTab(t) {
      ['post','ep','del','vip','link','cfg'].forEach(x => {
        document.getElementById('tab_'+x).style.display = (x===t)?'block':'none';
      });
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      if(t==='del') renderDelList();
    }

    function parseData() {
      const text = document.getElementById('pParse').value;
      const lines = text.split('\\n');
      let p={n:"", c:"", g:"", s:"", st:""}, key=null;
      lines.forEach(l => {
        const m = l.match(/^\\s*(name|category|genre|season|story)\\s*:\\s*(.*)/i);
        if(m) { key = m[1].toLowerCase().substring(0,1); p[key] = m[2].trim(); }
        else if(key==="s" && l.trim()) p["st"] += " " + l.trim();
      });
      if(p.n) document.getElementById('pName').value=p.n;
      if(p.c) document.getElementById('pCat').value=p.c;
      if(p.g) document.getElementById('pGen').value=p.g;
      if(p.s) document.getElementById('pSea').value=p.s;
    }

    async function savePost() {
      const body = {
        name: document.getElementById('pName').value,
        image_url: document.getElementById('pImg').value,
        category: document.getElementById('pCat').value,
        genres: document.getElementById('pGen').value,
        season: document.getElementById('pSea').value,
        story: document.getElementById('pStory').value
      };
      if(!body.name) return alert("Name required");
      await fetch('/api/posts', { method: 'POST', body: JSON.stringify(body) });
      showToast("Post Saved & Notified");
      await loadData(); refreshAdminData();
      document.getElementById('pName').value='';
    }

    function refreshAdminData() {
      const sel = document.getElementById('epPost');
      sel.innerHTML = appData.posts.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join('');
      
      document.getElementById('cBot').value = appData.settings.bot_token || '';
      document.getElementById('cChat').value = appData.settings.chat_id || '';
      document.getElementById('cTgLink').value = appData.settings.channel_link || '';
      document.getElementById('cPin').value = appData.settings.admin_pin || '';
      if(appData.shorteners.length){
        document.getElementById('cShDom').value = appData.shorteners[0].domain;
        document.getElementById('cShKey').value = appData.shorteners[0].api_key;
      }
    }

    async function saveEp() {
      const body = {
        post_id: document.getElementById('epPost').value,
        season: document.getElementById('epSea').value,
        label: document.getElementById('epNum').value,
        quality: document.getElementById('epQual').value,
        play_link: document.getElementById('epPlay').value,
        download_link: document.getElementById('epDl').value
      };
      await fetch('/api/episodes', { method: 'POST', body: JSON.stringify(body) });
      showToast("Episode Linked");
    }

    function renderDelList() {
      const list = document.getElementById('delList');
      list.innerHTML = appData.posts.map(p => \`
        <div class="list-item"><span>\${p.name}</span><button class="del-btn" onclick="delPost('\${p.id}')">Delete</button></div>
      \`).join('');
    }
    async function delPost(id) {
      if(!confirm("Erase post and all episodes?")) return;
      await fetch('/api/posts/'+id, { method: 'DELETE' });
      await loadData(); renderDelList(); showToast("Deleted");
    }

    async function saveVip() {
      const body = {
        email: document.getElementById('vEmail').value,
        key: document.getElementById('vKey').value,
        days: document.getElementById('vDays').value
      };
      await fetch('/api/premium', { method: 'POST', body: JSON.stringify(body) });
      showToast("VIP Created & Notified");
    }

    async function saveLink() {
      appData.paid_requests.push({
        password: document.getElementById('lCode').value,
        original_link: document.getElementById('lUrl').value
      });
      await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ paid_requests: appData.paid_requests }) });
      showToast("Locked Link Saved");
    }

    async function saveSettings() {
      const body = {
        settings: {
          bot_token: document.getElementById('cBot').value,
          chat_id: document.getElementById('cChat').value,
          channel_link: document.getElementById('cTgLink').value,
          admin_pin: document.getElementById('cPin').value
        },
        shorteners: [{ domain: document.getElementById('cShDom').value, api_key: document.getElementById('cShKey').value }]
      };
      await fetch('/api/settings', { method: 'POST', body: JSON.stringify(body) });
      showToast("Config Saved"); await loadData();
    }

    // Modal Prompts
    function openVIPPrompt() {
      const k = prompt("Enter VIP Passcode to test:");
      if(k) showToast("Try downloading a video with VIP direct option.");
    }

    async function openUnlockPrompt() {
      const c = prompt("Enter Secret Decrypt Code:");
      if(c) {
        const res = await fetch(\`/api/decrypt-link?code=\${encodeURIComponent(c)}\`);
        const d = await res.json();
        if(d.url) {
          const form = document.createElement("form");
          form.method = "GET"; form.action = d.url; form.target = "_blank"; form.rel = "noreferrer noopener";
          document.body.appendChild(form); form.submit(); document.body.removeChild(form);
        } else alert("Invalid code.");
      }
    }
  </script>
</body>
</html>`;
}
