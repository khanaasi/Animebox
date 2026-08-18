import { css } from './style.js';

export function renderFullAppHTML() {
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
  
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="icon" type="image/png" href="/icon-192.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    ${css}
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

        <!-- Add Post Tab -->
        <div id="tabPost">
          <div class="form-group" style="background: rgba(0,255,102,0.04); padding:10px; border-radius:8px; border:1px dashed var(--border);">
            <label style="color:var(--primary);"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto Post Fill</label>
            <textarea id="autoDetectInp" class="form-control" style="height:80px; font-size:11px;" oninput="handleAutoDetect()"></textarea>
          </div>
          <div class="form-group"><input type="file" id="pImgFile" class="form-control" onchange="uploadTgImage()"><input type="text" id="pImgUrl" class="form-control" placeholder="Image URL"></div>
          <div class="form-group"><input type="text" id="pName" class="form-control" placeholder="Post Name"></div>
          <div class="form-group"><input type="text" id="pCategory" class="form-control" placeholder="Category"></div>
          <div class="form-group"><input type="text" id="pGenre" class="form-control" placeholder="Genres"></div>
          <div class="form-group"><input type="text" id="pSeason" class="form-control" placeholder="Season"></div>
          <div class="form-group"><input type="text" id="pRelease" class="form-control" placeholder="Year"></div>
          <div class="form-group"><textarea id="pStory" class="form-control" style="height:60px;"></textarea></div>
          <button class="btn-action" onclick="savePost()">Publish Post</button>
        </div>

        <!-- Add Episode Tab -->
        <div id="tabEp" style="display:none;">
          <div class="form-group"><select id="epPostSelect" class="form-control"></select></div>
          <div class="form-group"><input type="text" id="epNum" class="form-control" placeholder="Episode Number"></div>
          <div class="form-group"><select id="epQuality" class="form-control"><option>SD (480p)</option><option selected>HD (720p)</option><option>FHD (1080p)</option></select></div>
          <div class="form-group"><input type="text" id="epPlayLink" class="form-control" placeholder="Play Link"></div>
          <div class="form-group"><input type="text" id="epDlLink" class="form-control" placeholder="Download Link"></div>
          <button class="btn-action" onclick="saveEpisode()">Save Episode</button>
        </div>

        <!-- VIP Tab -->
        <div id="tabVip" style="display:none;">
          <div class="form-group"><input type="email" id="vipEmail" class="form-control" placeholder="Email"></div>
          <div class="form-group"><input type="text" id="vipKey" class="form-control" placeholder="Key Passcode"></div>
          <div class="form-group"><select id="vipDays" class="form-control"><option value="30">30 Days</option></select></div>
          <button class="btn-action" onclick="saveVipUser()">Activate VIP</button>
        </div>

        <!-- Settings Tab -->
        <div id="tabCfg" style="display:none;">
          <div class="form-group"><input type="text" id="cfgBotToken" class="form-control" placeholder="Bot Token"></div>
          <div class="form-group"><input type="text" id="cfgChatId" class="form-control" placeholder="Chat ID"></div>
          <div class="form-group"><input type="text" id="cfgTg" class="form-control" placeholder="Telegram Link"></div>
          <div class="form-group"><input type="text" id="cfgPin" class="form-control" placeholder="Admin PIN"></div>
          <div class="form-group"><input type="text" id="cfgShDom" class="form-control" placeholder="Shortener Domain"></div>
          <div class="form-group"><input type="text" id="cfgShKey" class="form-control" placeholder="Shortener Key"></div>
          <button class="btn-action" onclick="saveSettings()">Save Config</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let appData = { posts: [], settings: {} };
    let currentPost = null; let currentCategory = 'ALL'; let currentGenre = 'ALL';

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    }

    window.onload = async () => { await loadData(); };

    async function loadData() {
      try {
        const res = await fetch('/api/data');
        appData = await res.json();
        renderSlider(appData.posts.slice(0, 5));
        renderCatFilters(appData.posts);
        applyFilters();
        document.getElementById('tgLink').href = appData.settings?.channel_link || '#';
      } catch (e) { showToast('App offline'); }
    }

    function renderCatFilters(posts) {
      const cats = [...new Set(posts.map(p => p.category).filter(Boolean))];
      document.getElementById('catChips').innerHTML = '<div class="chip active" onclick="filterByCat(`ALL`)">All</div>' + 
        cats.map(c => \`<div class="chip" onclick="filterByCat('\${c}')">\${c}</div>\`).join('');
      renderGenreFilters(posts);
    }

    function filterByCat(cat) {
      currentCategory = cat; currentGenre = 'ALL';
      document.querySelectorAll('#catChips .chip').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      renderGenreFilters(appData.posts); applyFilters();
    }

    function renderGenreFilters(posts) {
      const gBar = document.getElementById('genreChips');
      if (currentCategory === 'ALL') return gBar.style.display = 'none';
      const catPosts = posts.filter(p => p.category === currentCategory);
      const gSet = new Set();
      catPosts.forEach(p => p.genres && p.genres.split(/[\\s,;]+/).forEach(g => gSet.add(g.trim())));
      const genres = Array.from(gSet);
      if (!genres.length) return gBar.style.display = 'none';
      gBar.style.display = 'flex';
      gBar.innerHTML = '<div class="chip active" onclick="filterByGenre(`ALL`)">All</div>' + genres.map(g => \`<div class="chip" onclick="filterByGenre('\${g}')">\${g}</div>\`).join('');
    }

    function filterByGenre(gen) {
      currentGenre = gen;
      document.querySelectorAll('#genreChips .chip').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active'); applyFilters();
    }

    function applyFilters() {
      let filtered = appData.posts;
      if (currentCategory !== 'ALL') filtered = filtered.filter(p => p.category === currentCategory);
      if (currentGenre !== 'ALL') filtered = filtered.filter(p => p.genres && p.genres.includes(currentGenre));
      const q = document.getElementById('searchInp').value.toLowerCase();
      if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
      renderGrid(filtered);
    }

    function renderGrid(posts) {
      document.getElementById('mainGrid').innerHTML = posts.map(p => \`
        <div class="card" onclick="openDetail('\${p.id}')">
          <div class="poster-wrap">\${p.image_url ? \`<img src="\${p.image_url}">\` : \`<div class="no-img-text">\${p.name}</div>\`}</div>
          <div class="card-meta"><div class="card-title">\${p.name}</div><div class="card-sub">\${p.season || ''}</div></div>
        </div>\`).join('');
    }

    function renderSlider(posts) {
      const slider = document.getElementById('featuredSlider');
      if (!posts.length) return slider.style.display = 'none';
      slider.style.display = 'flex';
      slider.innerHTML = posts.map(p => \`<div class="slide-card" onclick="openDetail('\${p.id}')">\${p.image_url ? \`<img src="\${p.image_url}">\` : ''}<div class="slide-overlay"><div class="slide-title">\${p.name}</div></div></div>\`).join('');
    }

    async function openDetail(id) {
      currentPost = appData.posts.find(p => p.id === id);
      document.getElementById('catalogView').style.display = 'none';
      document.getElementById('detailView').classList.add('active');
      document.getElementById('detailMeta').innerHTML = \`\${currentPost.image_url ? \`<img src="\${currentPost.image_url}">\` : ''}<div class="detail-info"><h2>\${currentPost.name}</h2></div>\`;
      
      const res = await fetch(\`/api/episodes?post_id=\${id}\`);
      const data = await res.json();
      document.getElementById('epListContainer').innerHTML = data.episodes.map((e, i) => \`
        <button class="ep-btn \${i===0?'active':''}" onclick="playStream('\${e.play_link}')">Ep \${e.label}</button>
        <button class="ep-btn" style="background:#00b359;" onclick="downloadEp('\${e.id}')"><i class="fa-solid fa-download"></i></button>
      \`).join('');
      if(data.episodes[0]) playStream(data.episodes[0].play_link);
    }

    function playStream(url) {
      const box = document.getElementById('playerBox');
      if (url) { box.style.display = 'block'; box.innerHTML = \`<iframe src="\${url}" allowfullscreen sandbox="allow-scripts allow-same-origin"></iframe>\`; }
    }

    async function downloadEp(epId) {
      showToast('Getting link...');
      const key = localStorage.getItem('vip_key') || '';
      const res = await fetch(\`/api/get-link?post_id=\${currentPost.id}&ep_id=\${epId}&key=\${key}\`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank'); else showToast('Error');
    }

    function goHome() {
      document.getElementById('catalogView').style.display = 'block';
      document.getElementById('detailView').classList.remove('active');
      document.getElementById('playerBox').style.display = 'none';
    }

    function handleAutoDetect() {
      const txt = document.getElementById("autoDetectInp").value;
      const lines = txt.split('\\n');
      lines.forEach(line => {
        const match = line.match(/^\\s*(name|category|release|season|story)\\s*:\\s*(.*)/i);
        if(match) {
          if(match[1].toLowerCase() === 'name') document.getElementById('pName').value = match[2];
          if(match[1].toLowerCase() === 'category') document.getElementById('pCategory').value = match[2];
        }
      });
    }

    function openAdmin() { document.getElementById('adminModal').style.display = 'flex'; }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }
    function verifyAdmin() { document.getElementById('adminLock').style.display = 'none'; document.getElementById('adminBody').style.display = 'block'; document.getElementById('epPostSelect').innerHTML = appData.posts.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join(''); }
    function setAdminTab(tab) { ['post','ep','vip','cfg'].forEach(t => document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1)).style.display = t === tab ? 'block' : 'none'); }
    
    async function savePost() {
      await fetch('/api/posts', { method: 'POST', body: JSON.stringify({ name: document.getElementById('pName').value, category: document.getElementById('pCategory').value }) });
      showToast('Saved'); loadData();
    }
    async function saveEpisode() { await fetch('/api/episodes', { method: 'POST', body: JSON.stringify({ post_id: document.getElementById('epPostSelect').value, label: document.getElementById('epNum').value, play_link: document.getElementById('epPlayLink').value, download_link: document.getElementById('epDlLink').value }) }); showToast('Saved'); }
    function openVIPModal() { const key = prompt('Key:'); if (key) localStorage.setItem('vip_key', key); }
    function openDecryptModal() {} function openAZModal() {}
    function showToast(m) { const t = document.getElementById('toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display='none', 3000); }
  </script>
</body>
</html>`;
}