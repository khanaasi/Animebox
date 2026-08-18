/**
 * AnimeBox / Asi Anime - Cloudflare Worker Core Engine (ULTIMATE EDITION)
 * Features: Auto-Detect Parser, Telegram CDN Upload/Auto-Delete, Netflix UI, 
 * PWA 100% Score, Premium Auto-Expiry, Paid Requests, Shortener Rotation.
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
      if (!env.ANIME_KV) return defaultVal;
      const val = await env.ANIME_KV.get(key, "json");
      return val !== null ? val : defaultVal;
    };
    
    const kvSet = async (key, val) => {
      if (env.ANIME_KV) await env.ANIME_KV.put(key, JSON.stringify(val));
    };

    // =========================================================================
    // 🚀 1. PWA ENGINE: 100% SCORE (No Scope Extensions Error)
    // =========================================================================

    if (url.pathname === "/manifest.json") {
      const manifest = {
        id: "/?source=pwa",
        name: "AnimeBox - Watch Hindi Sub/Dub Anime & K-Drama",
        short_name: "AnimeBox",
        description: "Stream or download free Anime Hindi Sub/Dub, Korean Drama (K-Drama), and Chinese Donghua.",
        lang: "en-US",
        dir: "ltr",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#05080c",
        theme_color: "#00ff66",
        categories: ["entertainment", "video", "multimedia"],
        iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
        launch_handler: { client_mode: "navigate-existing" },
        icons: [
          { src: "https://placehold.co/192x192/05080c/00ff66.png?text=AB", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "https://placehold.co/512x512/05080c/00ff66.png?text=AB", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
        screenshots: [
          { src: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=720&h=1280&fit=crop", sizes: "720x1280", type: "image/jpeg", form_factor: "narrow" },
          { src: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&h=720&fit=crop", sizes: "1280x720", type: "image/jpeg", form_factor: "wide" }
        ]
      };
      return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json" } });
    }

    if (url.pathname === "/sw.js") {
      const swScript = `
        const CACHE = 'animebox-v2-advance';
        self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/']))));
        self.addEventListener('fetch', e => {
          if (e.request.method !== 'GET') return;
          e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
        });
      `;
      return new Response(swScript, { headers: { "Content-Type": "application/javascript" } });
    }

    // =========================================================================
    // 🚀 2. BACKEND API (Data, Auto-Upload, Telegram, Security)
    // =========================================================================

    if (url.pathname === "/api/data" && method === "GET") {
      const posts = (await kvGet("posts", [])) || [];
      const settings = (await kvGet("settings", {})) || {};
      const shorteners = (await kvGet("shorteners", [])) || [];
      return json({ posts, settings, shorteners });
    }

    if (url.pathname === "/api/admin-data" && method === "POST") {
      const body = await request.json();
      const settings = (await kvGet("settings", {})) || {};
      if (body.pin !== (settings.admin_password || "admin123")) return json({ error: "Unauthorized" }, 401);
      
      return json({
        posts: await kvGet("posts", []),
        premium: await kvGet("premium_users", []),
        paid_requests: await kvGet("paid_requests", []),
        shorteners: await kvGet("shorteners", []),
        settings: settings
      });
    }

    // 📤 TELEGRAM FILE UPLOAD (Like app.py but in Worker)
    if (url.pathname === "/api/upload-telegram" && method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const settings = (await kvGet("settings", {})) || {};
        
        if (!settings.bot_token || !settings.chat_id) return json({ error: "Set Bot Token & Chat ID in settings" }, 400);

        const tgForm = new FormData();
        tgForm.append("chat_id", settings.chat_id);
        tgForm.append("photo", file);

        const tgRes = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendPhoto`, { method: "POST", body: tgForm });
        const tgData = await tgRes.json();
        
        if (!tgData.ok) return json({ error: tgData.description }, 400);

        // Get Direct File URL from Telegram
        const fileId = tgData.result.photo[tgData.result.photo.length - 1].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${settings.bot_token}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        const directUrl = `https://api.telegram.org/file/bot${settings.bot_token}/${fileData.result.file_path}`;

        return json({ success: true, url: directUrl, tg_message_id: tgData.result.message_id });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // CREATE POST
    if (url.pathname === "/api/posts" && method === "POST") {
      const body = await request.json();
      let posts = (await kvGet("posts", [])) || [];
      const newPost = {
        id: "p_" + Date.now(),
        name: body.name || "Untitled",
        image_url: body.image_url || "",
        category: body.category || "Anime",
        genres: body.genres || "",
        season: body.season || "",
        short_story: body.short_story || "",
        release_date: body.release_date || "",
        tg_message_id: body.tg_message_id || null,
        updatedAt: Date.now()
      };
      posts.unshift(newPost);
      await kvSet("posts", posts);
      return json({ success: true, post: newPost });
    }

    // DELETE POST (And auto delete from Telegram)
    if (url.pathname.startsWith("/api/posts/") && method === "DELETE") {
      const id = url.pathname.split("/").pop();
      let posts = (await kvGet("posts", [])) || [];
      const settings = (await kvGet("settings", {})) || {};
      const post = posts.find(p => p.id === id);
      
      if (post && post.tg_message_id && settings.bot_token && settings.chat_id) {
        await fetch(`https://api.telegram.org/bot${settings.bot_token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: settings.chat_id, message_id: post.tg_message_id })
        }).catch(()=>console.log("TG Delete error"));
      }

      posts = posts.filter(p => p.id !== id);
      await kvSet("posts", posts);
      await kvSet(`ep_${id}`, []); 
      return json({ success: true });
    }

    // EPISODES
    if (url.pathname === "/api/episodes" && method === "GET") {
      const postId = url.searchParams.get("post_id");
      return json({ episodes: (await kvGet(`ep_${postId}`, [])) || [] });
    }
    if (url.pathname === "/api/episodes" && method === "POST") {
      const body = await request.json();
      let episodes = (await kvGet(`ep_${body.post_id}`, [])) || [];
      episodes.push({ id: "ep_" + Date.now(), ...body });
      await kvSet(`ep_${body.post_id}`, episodes);
      return json({ success: true });
    }
    if (url.pathname.startsWith("/api/episodes/") && method === "DELETE") {
      const epId = url.pathname.split("/").pop();
      const postId = url.searchParams.get("post_id");
      let episodes = (await kvGet(`ep_${postId}`, [])) || [];
      episodes = episodes.filter(e => e.id !== epId);
      await kvSet(`ep_${postId}`, episodes);
      return json({ success: true });
    }

    // DECRYPT LINK (Paid Requests)
    if (url.pathname === "/api/decrypt") {
      const code = url.searchParams.get("code");
      const reqs = (await kvGet("paid_requests", [])) || [];
      const item = reqs.find(r => r.password === code);
      if (item) return json({ success: true, url: item.original_link });
      return json({ error: "Invalid Key" }, 404);
    }

    // PREMIUM AUTH
    if (url.pathname === "/api/premium-auth" && method === "POST") {
      const body = await request.json();
      let users = (await kvGet("premium_users", [])) || [];
      const now = new Date();
      users = users.filter(u => new Date(u.expires_at) > now); // Auto clean expired
      await kvSet("premium_users", users);

      const user = users.find(u => u.gmail === body.email && u.password === body.password);
      if (user) return json({ success: true, token: user.token });
      return json({ error: "Invalid Credentials or Expired" }, 401);
    }

    // LINK GENERATOR (Shorteners & Premium Bypass)
    if (url.pathname === "/api/get-link") {
      const epId = url.searchParams.get("ep_id");
      const postId = url.searchParams.get("post_id");
      const token = url.searchParams.get("token");

      const episodes = (await kvGet(`ep_${postId}`, [])) || [];
      const ep = episodes.find(e => e.id === epId);
      if (!ep || !ep.original_link) return json({ error: "No link found" }, 404);

      if (token) {
        const users = (await kvGet("premium_users", [])) || [];
        const validUser = users.find(u => u.token === token && new Date(u.expires_at) > new Date());
        if (validUser) return json({ url: ep.original_link, direct: true });
      }

      const shorteners = (await kvGet("shorteners", [])) || [];
      if (shorteners.length > 0) {
        const sh = shorteners[Math.floor(Math.random() * shorteners.length)];
        const domain = sh.domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
        try {
          const res = await fetch(`https://${domain}/api?api=${sh.api_key}&url=${encodeURIComponent(ep.original_link)}&format=text`);
          const shortLink = (await res.text()).trim();
          if (shortLink.startsWith("http")) return json({ url: shortLink, direct: false });
        } catch(e) {}
      }
      return json({ url: ep.original_link, direct: true });
    }

    // SAVE SETTINGS (Admin Panel)
    if (url.pathname === "/api/settings" && method === "POST") {
      const body = await request.json();
      if (body.settings) await kvSet("settings", body.settings);
      if (body.shorteners) await kvSet("shorteners", body.shorteners);
      if (body.premium_users) await kvSet("premium_users", body.premium_users);
      if (body.paid_requests) await kvSet("paid_requests", body.paid_requests);
      return json({ success: true });
    }

    // 🚀 3. FRONTEND RENDER (HTML/CSS/JS)
    return new Response(renderFullApp(), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
};

function renderFullApp() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AnimeBox - Ultimate Anime & Movies</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#00ff66">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #030708; --header: rgba(6,12,10,0.95); --card: rgba(10,20,16,0.7);
      --primary: #00ff66; --primary-glow: rgba(0,255,102,0.25);
      --text: #f0f5f2; --muted: #94a3b8; --border: rgba(0,255,102,0.12);
    }
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI', system-ui, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: var(--bg); color: var(--text); padding-bottom: 70px; overflow-x: hidden; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }

    /* Netflix Header */
    header { background: var(--header); padding: 15px 5%; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--border); backdrop-filter: blur(15px); }
    .logo { font-size: 24px; font-weight: 900; color: var(--primary); cursor: pointer; text-shadow: 0 0 10px var(--primary-glow); }
    .search-bar { flex: 1; margin: 0 20px; position: relative; max-width: 400px; }
    .search-bar input { width: 100%; padding: 10px 15px 10px 35px; border-radius: 20px; background: rgba(10,20,16,0.8); border: 1px solid var(--border); color: #fff; outline: none; }
    .search-bar input:focus { border-color: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
    .search-bar i { position: absolute; left: 12px; top: 12px; color: var(--muted); }
    
    /* UI Layouts */
    .section-title { padding: 20px 5% 10px; font-size: 20px; font-weight: 800; text-transform: uppercase; }
    .section-title span { color: var(--primary); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; padding: 10px 5% 20px; }
    .card { background: transparent; cursor: pointer; transition: 0.3s; position: relative; }
    .card:hover { transform: translateY(-5px); }
    .card-img-wrap { width: 100%; aspect-ratio: 16/9; border-radius: 10px; overflow: hidden; position: relative; border: 1px solid var(--border); }
    .card:hover .card-img-wrap { border-color: var(--primary); box-shadow: 0 5px 15px var(--primary-glow); }
    .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .badge-cat { position: absolute; bottom: 5px; right: 5px; background: #e67e22; color: #fff; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
    .badge-new { position: absolute; top: 5px; left: 5px; background: var(--primary); color: #000; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 900; }
    .card-title { padding-top: 8px; font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Detail Page */
    #detailView { display: none; padding: 20px 5%; max-width: 1000px; margin: auto; }
    .player-section { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; margin: 20px 0; border: 1px solid var(--border); }
    .player-section iframe { width: 100%; height: 100%; border: none; }
    
    .ep-group { margin-top: 20px; background: rgba(5,10,7,0.8); padding: 15px; border-radius: 10px; border: 1px solid var(--border); }
    .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 10px; }
    .ep-btn { background: #0b110e; border: 1px solid var(--border); color: #fff; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; text-align: center; }
    .ep-btn:hover { background: var(--primary); color: #000; }

    /* Modals & Forms */
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; padding: 20px; }
    .modal-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; width: 100%; max-width: 500px; max-height: 85vh; overflow-y: auto; padding: 20px; position: relative; }
    .close-btn { position: absolute; right: 15px; top: 15px; font-size: 20px; cursor: pointer; color: var(--muted); }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 5px; font-weight: bold; }
    .input { width: 100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid var(--border); color: #fff; border-radius: 8px; outline: none; }
    .input:focus { border-color: var(--primary); }
    .btn { background: var(--primary); color: #000; padding: 12px 20px; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; width: 100%; }
    
    /* Bottom Mobile Nav */
    .bottom-nav { position: fixed; bottom: 0; width: 100%; background: var(--header); display: flex; justify-content: space-around; padding: 10px 0; border-top: 1px solid var(--border); z-index: 100; backdrop-filter: blur(10px); }
    .nav-item { display: flex; flex-direction: column; align-items: center; color: var(--muted); font-size: 10px; cursor: pointer; }
    .nav-item i { font-size: 20px; margin-bottom: 4px; }
    .nav-item.active { color: var(--primary); }

    /* Admin Tabs */
    .admin-tabs { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    .tab-btn { background: transparent; color: var(--muted); border: none; font-weight: bold; padding: 5px 10px; cursor: pointer; white-space: nowrap; }
    .tab-btn.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>

  <header>
    <div class="logo" onclick="goHome()">𝙰𝚂𝙸☠</div>
    <div class="search-bar">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="searchInp" placeholder="Search anime, drama..." oninput="doSearch()">
    </div>
  </header>

  <div id="homeView">
    <div class="section-title" id="gridTitle">🔥 Latest <span>Updates</span></div>
    <div class="grid" id="mainGrid"></div>
  </div>

  <div id="detailView">
    <button onclick="goHome()" style="background:none; color:var(--primary); border:none; font-size:14px; font-weight:bold; cursor:pointer; margin-bottom:15px;"><i class="fa fa-arrow-left"></i> Back to Catalog</button>
    <div style="display:flex; gap:20px; flex-wrap:wrap;">
      <div style="width:100%; max-width:300px; aspect-ratio:16/9; border-radius:10px; overflow:hidden; border:1px solid var(--border);">
        <img id="dImg" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div style="flex:1; min-width:280px;">
        <h2 id="dTitle" style="color:var(--primary); font-size:28px; margin-bottom:10px;"></h2>
        <p style="font-size:12px; color:var(--muted); margin-bottom:15px;">
          <span id="dCat" style="background:rgba(255,255,255,0.1); padding:3px 8px; border-radius:4px;"></span>
          &bull; <span id="dSeason"></span> &bull; <span id="dYear"></span>
        </p>
        <p style="font-size:13px; font-weight:bold; margin-bottom:5px;">Genres: <span id="dGenre" style="color:var(--muted); font-weight:normal;"></span></p>
        <p style="font-size:13px; font-weight:bold; margin-bottom:15px;">Story: <span id="dStory" style="color:var(--muted); font-weight:normal; line-height:1.5;"></span></p>
        <button class="btn" style="width:auto; padding:8px 15px; font-size:12px;" onclick="toggleWatchlist()"><i class="fa fa-bookmark"></i> <span id="wBtnText">Watchlist</span></button>
      </div>
    </div>
    
    <div class="player-section" id="playerBox" style="display:none;"></div>
    
    <div id="episodesContainer"></div>
  </div>

  <div class="bottom-nav">
    <div class="nav-item active" onclick="goHome()"><i class="fa fa-home"></i>Home</div>
    <div class="nav-item" onclick="openFilter('category')"><i class="fa fa-layer-group"></i>Categories</div>
    <div class="nav-item" onclick="openFilter('genre')"><i class="fa fa-masks-theater"></i>Genres</div>
    <div class="nav-item" onclick="openModal('premiumModal')"><i class="fa fa-gem"></i>Premium</div>
    <div class="nav-item" onclick="openModal('adminLock')"><i class="fa fa-cog"></i>Admin</div>
  </div>

  <!-- ADMIN LOCK MODAL -->
  <div class="modal" id="adminLock">
    <div class="modal-box">
      <span class="close-btn" onclick="closeModal('adminLock')">&times;</span>
      <h3 style="color:var(--primary); margin-bottom:15px;"><i class="fa fa-lock"></i> Admin Access</h3>
      <input type="password" id="adminPin" class="input" placeholder="Admin PIN (default: admin123)">
      <button class="btn" style="margin-top:15px;" onclick="unlockAdmin()">Unlock Panel</button>
    </div>
  </div>

  <!-- MAIN ADMIN PANEL (The Advance Tools) -->
  <div class="modal" id="adminPanel">
    <div class="modal-box" style="max-width:600px;">
      <span class="close-btn" onclick="closeModal('adminPanel')">&times;</span>
      <h3 style="color:var(--primary); margin-bottom:15px;"><i class="fa fa-cogs"></i> Studio Admin</h3>
      
      <div class="admin-tabs">
        <button class="tab-btn active" onclick="switchTab('post')">Upload Post</button>
        <button class="tab-btn" onclick="switchTab('eps')">Episodes</button>
        <button class="tab-btn" onclick="switchTab('prem')">Premium</button>
        <button class="tab-btn" onclick="switchTab('cfg')">Settings</button>
      </div>

      <!-- TAB: ADD POST -->
      <div id="tab_post" class="tab-content active">
        <div style="background:rgba(0,255,102,0.05); padding:10px; border-radius:8px; border:1px dashed var(--primary); margin-bottom:15px;">
          <label style="font-size:11px; color:var(--primary); font-weight:bold;"><i class="fa fa-wand-magic-sparkles"></i> Auto-Detect Parser (Paste Text Here)</label>
          <textarea id="autoParser" class="input" style="height:80px; resize:none; font-size:11px;" placeholder="Name: Naruto\\nGenre: Action\\nCategory: Anime..." oninput="runParser()"></textarea>
        </div>
        
        <div class="form-group">
          <label>Poster Image (Select to upload to Telegram CDN)</label>
          <input type="file" id="upFile" class="input" style="padding:8px;" accept="image/*" onchange="uploadToTG()">
          <input type="text" id="upImgUrl" class="input" placeholder="OR Paste Image URL directly" style="margin-top:8px;">
          <span id="tgMsgId" style="display:none;"></span>
        </div>

        <div class="form-group"><label>Name / Title</label><input type="text" id="upName" class="input"></div>
        <div style="display:flex; gap:10px;">
          <div class="form-group" style="flex:1;"><label>Category</label><input type="text" id="upCat" class="input" placeholder="e.g. Hindi Subbed"></div>
          <div class="form-group" style="flex:1;"><label>Season / Type</label><input type="text" id="upSeason" class="input" placeholder="Season 01"></div>
        </div>
        <div style="display:flex; gap:10px;">
          <div class="form-group" style="flex:1;"><label>Genres</label><input type="text" id="upGenre" class="input" placeholder="Action Comedy"></div>
          <div class="form-group" style="flex:1;"><label>Release Year</label><input type="text" id="upYear" class="input" placeholder="2025"></div>
        </div>
        <div class="form-group"><label>Short Story</label><textarea id="upStory" class="input" style="height:60px;"></textarea></div>
        <button class="btn" onclick="publishPost()">Publish Post</button>

        <h4 style="margin-top:20px; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">Manage Posts</h4>
        <div id="adminPostList" style="max-height:150px; overflow-y:auto;"></div>
      </div>

      <!-- TAB: EPISODES -->
      <div id="tab_eps" class="tab-content">
        <div class="form-group"><label>Select Target Post</label><select id="epPostSel" class="input"></select></div>
        <div class="form-group"><label>Season Group</label><input type="text" id="epSeason" class="input" value="Season 01"></div>
        <div class="form-group"><label>Episode Label</label><input type="text" id="epLabel" class="input" placeholder="e.g. 01, Full Pack"></div>
        <div class="form-group">
          <label>Quality Resolution</label>
          <select id="epQual" class="input"><option>FHD (1080p)</option><option selected>HD (720p)</option><option>SD (480p)</option></select>
        </div>
        <div class="form-group"><label>Direct/Shortener Download Link</label><input type="text" id="epDl" class="input" placeholder="https://drive..."></div>
        <div class="form-group"><label>Embed Play Link (Optional)</label><input type="text" id="epPlay" class="input" placeholder="https://streamwish..."></div>
        <button class="btn" onclick="publishEpisode()">Add Episode</button>
      </div>

      <!-- TAB: PREMIUM & LOCKS -->
      <div id="tab_prem" class="tab-content">
        <h4 style="color:var(--primary); margin-bottom:10px;">Create VIP User</h4>
        <div class="form-group"><input type="email" id="vpEmail" class="input" placeholder="User Gmail"></div>
        <div class="form-group"><input type="text" id="vpPass" class="input" placeholder="Set Password"></div>
        <div class="form-group"><input type="number" id="vpDays" class="input" placeholder="Validity Days (e.g. 30)"></div>
        <button class="btn" style="margin-bottom:20px;" onclick="addPremiumUser()">Activate VIP</button>

        <h4 style="color:var(--primary); margin-bottom:10px;">Create Locked Link Key</h4>
        <div class="form-group"><input type="text" id="lkCode" class="input" placeholder="Custom Secret Code (e.g. NARUTO99)"></div>
        <div class="form-group"><input type="text" id="lkUrl" class="input" placeholder="Original Target URL"></div>
        <button class="btn" onclick="addPaidRequest()">Create Locked Link</button>
      </div>

      <!-- TAB: SETTINGS -->
      <div id="tab_cfg" class="tab-content">
        <div class="form-group"><label>Telegram Bot Token</label><input type="text" id="cfgBot" class="input" placeholder="For Auto Uploads"></div>
        <div class="form-group"><label>Telegram Chat ID</label><input type="text" id="cfgChat" class="input" placeholder="-100xxxxxx"></div>
        <div class="form-group"><label>Admin PIN Password</label><input type="text" id="cfgPin" class="input" placeholder="admin123"></div>
        <div class="form-group"><label>Global Player Password</label><input type="text" id="cfgPlayPass" class="input" placeholder="stream123"></div>
        
        <h4 style="margin:20px 0 10px; border-bottom:1px solid #333; padding-bottom:5px;">Link Shortener Rotation</h4>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
          <input type="text" id="cfgShDom" class="input" placeholder="Domain (adrinolinks.in)">
          <input type="text" id="cfgShApi" class="input" placeholder="API Key">
        </div>
        <button class="btn" onclick="saveGlobalSettings()">Save All Settings</button>
      </div>

    </div>
  </div>

  <!-- PREMIUM / USER MODAL -->
  <div class="modal" id="premiumModal">
    <div class="modal-box">
      <span class="close-btn" onclick="closeModal('premiumModal')">&times;</span>
      <h3 style="color:var(--primary); margin-bottom:15px;"><i class="fa fa-gem"></i> VIP Access</h3>
      <input type="email" id="uMail" class="input" style="margin-bottom:10px;" placeholder="Registered Gmail">
      <input type="password" id="uPass" class="input" style="margin-bottom:15px;" placeholder="VIP Password">
      <button class="btn" onclick="loginPremium()">Login VIP</button>
      
      <hr style="border:0; border-bottom:1px solid #333; margin:20px 0;">
      
      <h3 style="color:var(--primary); margin-bottom:10px;"><i class="fa fa-lock"></i> Unlock Paid Request</h3>
      <input type="text" id="uCode" class="input" style="margin-bottom:15px;" placeholder="Enter Secret Code">
      <button class="btn" onclick="unlockLink()">Decrypt Link</button>
    </div>
  </div>

  <!-- FILTER MODAL -->
  <div class="modal" id="filterModal">
    <div class="modal-box">
      <span class="close-btn" onclick="closeModal('filterModal')">&times;</span>
      <h3 id="fTitle" style="color:var(--primary); margin-bottom:15px;"></h3>
      <div id="fList" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
    </div>
  </div>

  <script>
    let appData = { posts: [], settings: {}, shorteners: [] };
    let currentPost = null;
    let watchlist = JSON.parse(localStorage.getItem('ab_watchlist') || '[]');

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

    window.onload = async () => {
      const res = await fetch('/api/data');
      appData = await res.json();
      renderGrid(appData.posts);
    };

    function renderGrid(posts) {
      const g = document.getElementById('mainGrid');
      if (posts.length === 0) return g.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#666;">No posts found.</p>';
      
      g.innerHTML = posts.map(p => {
        const isNew = (Date.now() - p.updatedAt) < (3 * 24 * 60 * 60 * 1000);
        return \`
          <div class="card" onclick="openDetail('\${p.id}')">
            <div class="card-img-wrap">
              \${isNew ? '<span class="badge-new">NEW</span>' : ''}
              <span class="badge-cat">\${p.category}</span>
              \${p.image_url ? \`<img src="\${p.image_url}" loading="lazy">\` : \`<div style="width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;"><i class="fa fa-image" style="font-size:30px;color:#333;"></i></div>\`}
            </div>
            <div class="card-title">\${p.name}</div>
          </div>
        \`;
      }).join('');
    }

    function doSearch() {
      const q = document.getElementById('searchInp').value.toLowerCase();
      renderGrid(appData.posts.filter(p => p.name.toLowerCase().includes(q) || (p.genres||'').toLowerCase().includes(q)));
      document.getElementById('gridTitle').innerHTML = q ? 'Search <span>Results</span>' : '🔥 Latest <span>Updates</span>';
    }

    async function openDetail(id) {
      currentPost = appData.posts.find(p => p.id === id);
      document.getElementById('homeView').style.display = 'none';
      document.getElementById('detailView').style.display = 'block';
      window.scrollTo(0,0);

      document.getElementById('dImg').src = currentPost.image_url || '';
      document.getElementById('dTitle').innerText = currentPost.name;
      document.getElementById('dCat').innerText = currentPost.category;
      document.getElementById('dSeason').innerText = currentPost.season || 'Movie';
      document.getElementById('dYear').innerText = currentPost.release_date || 'N/A';
      document.getElementById('dGenre').innerText = currentPost.genres || 'N/A';
      document.getElementById('dStory').innerText = currentPost.short_story || 'No summary available.';
      
      updateWBtn();

      // Load Episodes
      document.getElementById('episodesContainer').innerHTML = '<p>Loading episodes...</p>';
      const res = await fetch(\`/api/episodes?post_id=\${id}\`);
      const data = await res.json();
      
      if(data.episodes.length === 0) {
        document.getElementById('episodesContainer').innerHTML = '<p style="color:#666;">No episodes uploaded yet.</p>';
        return;
      }

      // Grouping logic (Advanced UI)
      const group = {};
      data.episodes.forEach(e => {
        const s = e.season || 'Season 01';
        if(!group[s]) group[s] = { "FHD (1080p)": [], "HD (720p)": [], "SD (480p)": [] };
        const q = e.quality || "HD (720p)";
        if(group[s][q]) group[s][q].push(e); else group[s][q] = [e];
      });

      let html = '';
      Object.keys(group).sort().forEach(s => {
        html += \`<div class="ep-group"><h3 style="color:var(--primary);margin-bottom:10px;"><i class="fa fa-film"></i> \${s}</h3>\`;
        ["FHD (1080p)", "HD (720p)", "SD (480p)"].forEach(q => {
          if(group[s][q] && group[s][q].length > 0) {
            html += \`<div style="font-size:11px; color:#aaa; margin-top:10px;">\${q}</div><div class="ep-grid">\`;
            group[s][q].sort((a,b)=> parseInt(a.label||0)-parseInt(b.label||0)).forEach(ep => {
              html += \`<button class="ep-btn" onclick="handleEpClick('\${ep.id}', '\${ep.play_link}', '\${ep.download_link}')">Ep \${ep.label}</button>\`;
            });
            html += \`</div>\`;
          }
        });
        html += \`</div>\`;
      });
      document.getElementById('episodesContainer').innerHTML = html;
    }

    function handleEpClick(epId, play, dl) {
      const ask = confirm("Click OK to Watch Online, or Cancel to Download.");
      if (ask) {
        if(play) {
          const pass = prompt("Enter Global Player Password (if required):");
          const expected = appData.settings.player_password || "stream123";
          if (pass === expected) {
            const pb = document.getElementById('playerBox');
            pb.style.display = 'block';
            pb.innerHTML = \`<iframe src="\${play}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>\`;
            pb.scrollIntoView({behavior:'smooth'});
          } else alert("Invalid Player Password!");
        } else alert("No streaming link available.");
      } else {
        if(dl) startDownload(epId); else alert("No download link available.");
      }
    }

    async function startDownload(epId) {
      const token = localStorage.getItem('ab_vip_token') || '';
      const res = await fetch(\`/api/get-link?post_id=\${currentPost.id}&ep_id=\${epId}&token=\${token}\`);
      const data = await res.json();
      if(data.url) window.open(data.url, '_blank'); else alert("Link Error");
    }

    function toggleWatchlist() {
      if(watchlist.includes(currentPost.id)) watchlist = watchlist.filter(id => id !== currentPost.id);
      else watchlist.push(currentPost.id);
      localStorage.setItem('ab_watchlist', JSON.stringify(watchlist));
      updateWBtn();
    }
    function updateWBtn() {
      document.getElementById('wBtnText').innerText = watchlist.includes(currentPost.id) ? 'In Watchlist' : 'Add Watchlist';
    }

    function goHome() {
      document.getElementById('detailView').style.display = 'none';
      document.getElementById('homeView').style.display = 'block';
      document.getElementById('playerBox').innerHTML = ''; 
      document.getElementById('playerBox').style.display = 'none'; 
    }

    // --- FILTERS ---
    function openFilter(type) {
      const modal = document.getElementById('filterModal');
      const title = document.getElementById('fTitle');
      const list = document.getElementById('fList');
      modal.style.display = 'flex';

      if (type === 'category') {
        title.innerText = "Categories";
        const cats = [...new Set(appData.posts.map(p => p.category).filter(Boolean))];
        list.innerHTML = cats.map(c => \`<button class="btn" style="width:auto;padding:8px 15px;" onclick="applyFilter('category','\${c}')">\${c}</button>\`).join('');
      } else if (type === 'genre') {
        title.innerText = "Genres";
        const gs = new Set();
        appData.posts.forEach(p => (p.genres||'').split(/[ ,]+/).forEach(g => { if(g) gs.add(g.trim()) }));
        list.innerHTML = Array.from(gs).map(g => \`<button class="btn" style="width:auto;padding:8px 15px;" onclick="applyFilter('genre','\${g}')">\${g}</button>\`).join('');
      }
    }
    function applyFilter(type, val) {
      closeModal('filterModal');
      goHome();
      if(type==='category') renderGrid(appData.posts.filter(p => p.category === val));
      if(type==='genre') renderGrid(appData.posts.filter(p => (p.genres||'').includes(val)));
      document.getElementById('gridTitle').innerHTML = \`\${val} <span>Anime</span>\`;
    }

    // --- ADMIN SYSTEM ---
    function openModal(id) { document.getElementById(id).style.display = 'flex'; }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }
    function switchTab(t) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab_'+t).classList.add('active');
    }

    let adminData = null;
    async function unlockAdmin() {
      const pin = document.getElementById('adminPin').value;
      const res = await fetch('/api/admin-data', { method:'POST', body:JSON.stringify({pin}) });
      if(res.ok) {
        adminData = await res.json();
        closeModal('adminLock'); openModal('adminPanel');
        fillAdminData();
      } else alert("Invalid Admin PIN");
    }

    function fillAdminData() {
      // Setup Post Dropdown for Episodes
      document.getElementById('epPostSel').innerHTML = adminData.posts.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join('');
      // Populate Posts List
      document.getElementById('adminPostList').innerHTML = adminData.posts.map(p => \`
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #333;">
          <span style="font-size:12px;">\${p.name}</span>
          <button onclick="delPost('\${p.id}')" style="background:#e33; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">Delete</button>
        </div>
      \`).join('');
      // Fill Settings
      document.getElementById('cfgBot').value = adminData.settings.bot_token || '';
      document.getElementById('cfgChat').value = adminData.settings.chat_id || '';
      document.getElementById('cfgPin').value = adminData.settings.admin_password || '';
      document.getElementById('cfgPlayPass').value = adminData.settings.player_password || '';
      if(adminData.shorteners.length > 0) {
        document.getElementById('cfgShDom').value = adminData.shorteners[0].domain || '';
        document.getElementById('cfgShApi').value = adminData.shorteners[0].api_key || '';
      }
    }

    // Bulletproof Parser (from original)
    function runParser() {
      const txt = document.getElementById('autoParser').value;
      const lines = txt.split('\\n');
      let cur = null, d = {name:'', cat:'', year:'', gen:'', st:''};
      lines.forEach(l => {
        const m = l.match(/^\\s*(name|title|category|cat|date|release|year|genre|genres|story|synopsis)\\s*:\\s*(.*)/i);
        if(m) {
          const k = m[1].toLowerCase(); const v = m[2].trim();
          if(['name','title'].includes(k)) cur='name';
          else if(['category','cat'].includes(k)) cur='cat';
          else if(['date','release','year'].includes(k)) cur='year';
          else if(['genre','genres'].includes(k)) cur='gen';
          else if(['story','synopsis'].includes(k)) cur='st';
          if(cur) d[cur] = v;
        } else if (cur) d[cur] += "\\n" + l.trim();
      });
      if(d.name) document.getElementById('upName').value = d.name.trim();
      if(d.cat) document.getElementById('upCat').value = d.cat.trim();
      if(d.year) document.getElementById('upYear').value = d.year.trim();
      if(d.gen) document.getElementById('upGenre').value = d.gen.trim();
      if(d.st) document.getElementById('upStory').value = d.st.trim();
    }

    async function uploadToTG() {
      const file = document.getElementById('upFile').files[0];
      if(!file) return;
      document.getElementById('upImgUrl').value = "Uploading to Telegram CDN...";
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch('/api/upload-telegram', {method:'POST', body:fd});
      const data = await res.json();
      if(data.url) {
        document.getElementById('upImgUrl').value = data.url;
        document.getElementById('tgMsgId').innerText = data.tg_message_id;
      } else alert(data.error);
    }

    async function publishPost() {
      await fetch('/api/posts', { method:'POST', body:JSON.stringify({
        name: document.getElementById('upName').value,
        image_url: document.getElementById('upImgUrl').value,
        category: document.getElementById('upCat').value,
        season: document.getElementById('upSeason').value,
        genres: document.getElementById('upGenre').value,
        release_date: document.getElementById('upYear').value,
        short_story: document.getElementById('upStory').value,
        tg_message_id: document.getElementById('tgMsgId').innerText || null
      })});
      alert("Post Published!"); location.reload();
    }

    async function delPost(id) {
      if(!confirm("Delete fully? (Will delete from TG as well)")) return;
      await fetch(\`/api/posts/\${id}\`, {method:'DELETE'});
      alert("Deleted!"); location.reload();
    }

    async function publishEpisode() {
      await fetch('/api/episodes', {method:'POST', body:JSON.stringify({
        post_id: document.getElementById('epPostSel').value,
        season: document.getElementById('epSeason').value,
        label: document.getElementById('epLabel').value,
        quality: document.getElementById('epQual').value,
        download_link: document.getElementById('epDl').value,
        play_link: document.getElementById('epPlay').value
      })});
      alert("Episode Added!");
    }

    // --- Premium & Paid Requests ---
    async function loginPremium() {
      const res = await fetch('/api/premium-auth', { method:'POST', body:JSON.stringify({
        email: document.getElementById('uMail').value,
        password: document.getElementById('uPass').value
      })});
      const data = await res.json();
      if(data.success) {
        localStorage.setItem('ab_vip_token', data.token);
        alert("VIP Activated! You bypass shorteners now."); closeModal('premiumModal');
      } else alert(data.error);
    }

    async function unlockLink() {
      const code = document.getElementById('uCode').value;
      const res = await fetch(\`/api/decrypt?code=\${code}\`);
      const data = await res.json();
      if(data.url) { window.open(data.url, '_blank'); closeModal('premiumModal'); }
      else alert("Invalid Code");
    }

    async function addPremiumUser() {
      const email = document.getElementById('vpEmail').value;
      const pass = document.getElementById('vpPass').value;
      const days = document.getElementById('vpDays').value;
      const adminBody = adminData; 
      const expiry = new Date(); expiry.setDate(expiry.getDate() + parseInt(days||30));
      const token = "tok_"+Date.now()+Math.random().toString(36).substring(2);
      adminBody.premium.push({ gmail:email, password:pass, token, expires_at: expiry.toISOString() });
      await fetch('/api/settings', {method:'POST', body:JSON.stringify({premium_users: adminBody.premium})});
      alert("VIP User Created!");
    }

    async function addPaidRequest() {
      const pwd = document.getElementById('lkCode').value;
      const url = document.getElementById('lkUrl').value;
      adminData.paid_requests.push({password: pwd, original_link: url});
      await fetch('/api/settings', {method:'POST', body:JSON.stringify({paid_requests: adminData.paid_requests})});
      alert("Locked Link Created!");
    }

    async function saveGlobalSettings() {
      const set = {
        bot_token: document.getElementById('cfgBot').value,
        chat_id: document.getElementById('cfgChat').value,
        admin_password: document.getElementById('cfgPin').value,
        player_password: document.getElementById('cfgPlayPass').value
      };
      const sh = [{ domain: document.getElementById('cfgShDom').value, api_key: document.getElementById('cfgShApi').value }];
      await fetch('/api/settings', {method:'POST', body:JSON.stringify({settings: set, shorteners: sh})});
      alert("Settings Saved!"); location.reload();
    }
  </script>
</body>
</html>`;
        }
