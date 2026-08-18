export const manifestData = {
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
  
  // FIXED SCOPE EXTENSIONS
  scope_extensions: [
    { origin: "https://t.me" },
    { origin: "https://telegram.org" }
  ],
  
  related_applications: [{ platform: "webapp", url: "https://animebox.khanaasif57828.workers.dev/manifest.json" }],
  prefer_related_applications: false,
  protocol_handlers: [{ protocol: "web+anime", url: "/?stream=%s" }],
  launch_handler: { client_mode: "navigate-existing" },
  file_handlers: [{ action: "/", accept: { "application/json": [".abx", ".json"] } }],
  share_target: { action: "/", method: "GET", params: { title: "title", text: "text", url: "url" } },
  
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
    { name: "Home", short_name: "Home", description: "Go to Home Page", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    { name: "VIP Pass", short_name: "VIP", description: "Unlock VIP Features", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] }
  ]
};