export const css = `
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
`;