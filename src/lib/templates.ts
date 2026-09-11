import { DEFAULT_VFS, cloneVfs } from "@/lib/vfs";

export type TemplateId =
  | "blank"
  | "saas"
  | "ecommerce"
  | "chat"
  | "portfolio"
  | "blog";

export type ProjectTemplate = {
  id: TemplateId;
  title: string;
  category: string;
  desc: string;
  prompt: string;
  vfs: Record<string, string>;
};

const BASE_CSS = `* { box-sizing: border-box; }
body { margin: 0; background: #050505; color: #fff; font-family: Inter, system-ui, sans-serif; }
button, input, textarea { font: inherit; }
button { cursor: pointer; }
img { max-width: 100%; display: block; }
`;

const shell = (app: string, extras: Record<string, string> = {}) => ({
  "index.css": BASE_CSS,
  "App.tsx": app,
  ...extras,
});

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    title: "Blank Start",
    category: "Landing Pages",
    desc: "Empty canvas — describe what to build in chat",
    prompt: "Blank canvas — invent a unique app from the user's first prompt",
    vfs: cloneVfs(DEFAULT_VFS),
  },
  {
    id: "saas",
    title: "SaaS Dashboard",
    category: "Dashboards",
    desc: "Sidebar nav, live stats, and a filterable table",
    prompt: "SaaS dashboard with sidebar, metrics, and customer table — keep editing from here",
    vfs: shell(
      `import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Stats } from "./components/Stats";
import { RecentTable } from "./components/RecentTable";

export default function App() {
  const [section, setSection] = useState("Overview");
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar active={section} onSelect={setSection} />
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-auto">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{section}</h1>
            <p className="text-white/40 text-sm mt-1">Interactive starter — edit any file or ask the agent to extend it.</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter customers…"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400/50 w-full sm:w-64"
          />
        </header>
        {section === "Overview" && (
          <>
            <Stats />
            <RecentTable query={query} />
          </>
        )}
        {section === "Customers" && <RecentTable query={query} />}
        {section === "Billing" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 max-w-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Plan</div>
            <div className="text-2xl font-black">Pro · $49/mo</div>
            <p className="text-sm text-white/40 mt-2">Next invoice on Apr 1. Swap this panel via chat anytime.</p>
            <button className="mt-6 px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-widest">
              Manage billing
            </button>
          </div>
        )}
        {section === "Settings" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 max-w-lg space-y-4">
            <label className="block text-sm">
              <span className="text-white/40 text-xs uppercase tracking-widest font-bold">Workspace name</span>
              <input defaultValue="Acme OS" className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400/50" />
            </label>
            <button className="px-4 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest">
              Save settings
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
`,
      {
        "components/Sidebar.tsx": `import React from "react";

const links = ["Overview", "Customers", "Billing", "Settings"];

export function Sidebar({ active, onSelect }) {
  return (
    <aside className="w-56 border-r border-white/10 p-6 hidden md:flex flex-col gap-6 bg-black/40 shrink-0">
      <div className="font-black tracking-tight">ACME<span className="text-emerald-400">OS</span></div>
      <nav className="space-y-1">
        {links.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onSelect(l)}
            className={\`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors \${
              active === l ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }\`}
          >
            {l}
          </button>
        ))}
      </nav>
    </aside>
  );
}
`,
        "components/Stats.tsx": `import React from "react";

const stats = [
  { label: "MRR", value: "$12.4k", delta: "+8%" },
  { label: "Active users", value: "1,284", delta: "+12%" },
  { label: "Churn", value: "2.1%", delta: "-0.4%" },
];

export function Stats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{s.label}</div>
          <div className="text-2xl font-black mt-2">{s.value}</div>
          <div className="text-xs text-emerald-400 mt-1">{s.delta}</div>
        </div>
      ))}
    </div>
  );
}
`,
        "components/RecentTable.tsx": `import React, { useMemo } from "react";

const rows = [
  { name: "Nova Labs", plan: "Pro", status: "Active" },
  { name: "Pixel Co", plan: "Starter", status: "Trial" },
  { name: "Orbit Inc", plan: "Pro", status: "Active" },
  { name: "Harbor AI", plan: "Enterprise", status: "Active" },
  { name: "Kindling", plan: "Starter", status: "Paused" },
];

export function RecentTable({ query = "" }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 text-xs font-bold uppercase tracking-widest text-white/40">
        Customers · {filtered.length}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {filtered.map((r) => (
            <tr key={r.name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <td className="px-5 py-3 font-medium">{r.name}</td>
              <td className="px-5 py-3 text-white/40">{r.plan}</td>
              <td className={\`px-5 py-3 \${r.status === "Active" ? "text-emerald-400" : "text-white/50"}\`}>
                {r.status}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-8 text-center text-white/30 text-sm">
                No matches for “{query}”
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
`,
      }
    ),
  },
  {
    id: "ecommerce",
    title: "E-Commerce Suite",
    category: "E-Commerce",
    desc: "Product grid with a working cart drawer",
    prompt: "E-commerce storefront with products and cart — keep editing from here",
    vfs: shell(
      `import React, { useMemo, useState } from "react";
import { CartBar } from "./components/CartBar";
import { ProductGrid } from "./components/ProductGrid";
import { CartDrawer } from "./components/CartDrawer";

const PRODUCTS = [
  { id: 1, name: "Aura Lamp", price: 48, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80" },
  { id: 2, name: "Clay Mug", price: 22, img: "https://images.unsplash.com/photo-1514228742587-6b1554072818?w=600&q=80" },
  { id: 3, name: "Desk Mat", price: 36, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80" },
  { id: 4, name: "Oak Stand", price: 64, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80" },
];

export default function App() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);

  const count = useMemo(() => cart.reduce((n, i) => n + i.qty, 0), [cart]);
  const total = useMemo(() => cart.reduce((n, i) => n + i.price * i.qty, 0), [cart]);

  const add = (product) => {
    setCart((prev) => {
      const hit = prev.find((p) => p.id === product.id);
      if (hit) return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { ...product, qty: 1 }];
    });
    setOpen(true);
  };

  const setQty = (id, qty) => {
    setCart((prev) =>
      qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty } : p))
    );
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <CartBar count={count} onOpen={() => setOpen(true)} />
      <main className="max-w-5xl mx-auto p-6 md:p-10">
        <h1 className="text-4xl font-black tracking-tight mb-2">Shop</h1>
        <p className="text-white/40 mb-8">Add products to the cart — fully editable starter.</p>
        <ProductGrid products={PRODUCTS} onAdd={add} />
      </main>
      <CartDrawer open={open} items={cart} total={total} onClose={() => setOpen(false)} onSetQty={setQty} />
    </div>
  );
}
`,
      {
        "components/CartBar.tsx": `import React from "react";

export function CartBar({ count, onOpen }) {
  return (
    <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-black/50 sticky top-0 z-20 backdrop-blur">
      <div className="font-black tracking-tight">STORE<span className="text-emerald-400">FRONT</span></div>
      <button
        type="button"
        onClick={onOpen}
        className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white border border-white/10 rounded-full px-4 py-2"
      >
        Cart · {count}
      </button>
    </header>
  );
}
`,
        "components/ProductGrid.tsx": `import React from "react";

export function ProductGrid({ products, onAdd }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((p) => (
        <div key={p.id} className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] flex flex-col">
          <img src={p.img} alt={p.name} className="h-40 w-full object-cover" />
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <div className="font-bold">{p.name}</div>
              <div className="text-sm text-white/40 mt-1">{"$" + p.price}</div>
            </div>
            <button
              type="button"
              onClick={() => onAdd(p)}
              className="mt-auto w-full py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-400"
            >
              Add to cart
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
`,
        "components/CartDrawer.tsx": `import React from "react";

export function CartDrawer({ open, items, total, onClose, onSetQty }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close cart" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-[#0c0c0c] border-l border-white/10 h-full p-6 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black tracking-tight text-xl">Cart</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-sm">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-4">
          {items.length === 0 && <p className="text-sm text-white/40">Cart is empty.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-center border border-white/10 rounded-xl p-3">
              <img src={item.img} alt="" className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-white/40">{"$" + item.price + " each"}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="w-7 h-7 rounded-lg bg-white/10" onClick={() => onSetQty(item.id, item.qty - 1)}>
                  −
                </button>
                <span className="text-sm w-4 text-center">{item.qty}</span>
                <button type="button" className="w-7 h-7 rounded-lg bg-white/10" onClick={() => onSetQty(item.id, item.qty + 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-white/10 mt-4">
          <div className="flex justify-between text-sm mb-4">
            <span className="text-white/40">Total</span>
            <span className="font-black">{"$" + total}</span>
          </div>
          <button
            type="button"
            disabled={!items.length}
            className="w-full py-3 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}
`,
      }
    ),
  },
  {
    id: "chat",
    title: "AI Chat Assistant",
    category: "AI Apps",
    desc: "Working thread + composer you can extend",
    prompt: "Chat UI with messages and composer — keep editing from here",
    vfs: shell(
      `import React, { useEffect, useRef, useState } from "react";
import { Thread } from "./components/Thread";
import { Composer } from "./components/Composer";

const REPLIES = [
  "Got it. Drafting a plan…",
  "Nice — I'll sketch the layout first.",
  "We can split that into three files.",
  "Want me to wire state next?",
];

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Hey — what are we building today?" },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text) => {
    const id = Date.now();
    setMessages((m) => [...m, { id, role: "user", text }]);
    window.setTimeout(() => {
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      setMessages((m) => [...m, { id: id + 1, role: "assistant", text: reply }]);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col max-w-2xl mx-auto border-x border-white/5">
      <header className="p-4 border-b border-white/10 font-black tracking-tight shrink-0">
        CHAT<span className="text-emerald-400">LINE</span>
      </header>
      <Thread messages={messages} endRef={endRef} />
      <Composer onSend={send} />
    </div>
  );
}
`,
      {
        "components/Thread.tsx": `import React from "react";

export function Thread({ messages, endRef }) {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className={\`max-w-[85%] rounded-2xl px-4 py-3 text-sm \${
            m.role === "user"
              ? "ml-auto bg-emerald-500/20 border border-emerald-500/20"
              : "bg-white/5 border border-white/5"
          }\`}
        >
          {m.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
`,
        "components/Composer.tsx": `import React, { useState } from "react";

export function Composer({ onSend }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="p-4 border-t border-white/10 flex gap-2 shrink-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSend(value.trim());
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Message…"
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400/40"
      />
      <button type="submit" className="px-4 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest">
        Send
      </button>
    </form>
  );
}
`,
      }
    ),
  },
  {
    id: "portfolio",
    title: "Creative Portfolio",
    category: "Portfolio",
    desc: "Hero, filterable work, and contact CTA",
    prompt: "Portfolio site with projects and filters — keep editing from here",
    vfs: shell(
      `import React, { useMemo, useState } from "react";
import { Hero } from "./components/Hero";
import { WorkGrid } from "./components/WorkGrid";

const WORK = [
  { title: "Northwind", tag: "Brand", blurb: "Identity system for a climate fund." },
  { title: "Pulse", tag: "Product", blurb: "Analytics UI for a health startup." },
  { title: "Archive", tag: "Web", blurb: "Editorial site for a photo collective." },
  { title: "Harbor", tag: "Product", blurb: "Onboarding for a fintech wallet." },
  { title: "Glyph", tag: "Brand", blurb: "Type-first mark for a studio." },
  { title: "Lattice", tag: "Web", blurb: "Docs marketing for an API platform." },
];

export default function App() {
  const [tag, setTag] = useState("All");
  const tags = ["All", "Brand", "Product", "Web"];
  const filtered = useMemo(
    () => (tag === "All" ? WORK : WORK.filter((w) => w.tag === tag)),
    [tag]
  );

  return (
    <div className="min-h-screen bg-[#040404] text-white">
      <Hero />
      <div className="px-6 md:px-16 pb-6 flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={\`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border \${
              tag === t ? "bg-white text-black border-white" : "border-white/15 text-white/50 hover:text-white"
            }\`}
          >
            {t}
          </button>
        ))}
      </div>
      <WorkGrid work={filtered} />
      <footer className="px-6 md:px-16 pb-24 pt-8 border-t border-white/5">
        <p className="text-white/40 text-sm mb-4">Available for select collaborations.</p>
        <a href="mailto:hello@example.com" className="text-emerald-400 font-bold hover:underline">
          hello@example.com
        </a>
      </footer>
    </div>
  );
}
`,
      {
        "components/Hero.tsx": `import React from "react";

export function Hero() {
  return (
    <section className="px-6 md:px-16 pt-24 pb-12">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-4">Designer / Engineer</p>
      <h1 className="text-5xl md:text-7xl font-black tracking-tighter max-w-3xl leading-[0.95]">
        I build calm interfaces for loud ideas.
      </h1>
      <p className="mt-6 text-white/40 max-w-xl text-sm leading-relaxed">
        Filter the grid, then rewrite this copy in chat or edit the component files directly.
      </p>
    </section>
  );
}
`,
        "components/WorkGrid.tsx": `import React from "react";

export function WorkGrid({ work }) {
  return (
    <section className="px-6 md:px-16 pb-16 grid grid-cols-1 md:grid-cols-3 gap-4">
      {work.map((w) => (
        <article
          key={w.title}
          className="aspect-[4/5] rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 flex flex-col justify-end hover:border-emerald-400/30 transition-colors"
        >
          <div className="text-[10px] uppercase tracking-widest text-white/40">{w.tag}</div>
          <div className="text-2xl font-black mt-1">{w.title}</div>
          <p className="text-sm text-white/40 mt-2">{w.blurb}</p>
        </article>
      ))}
      {work.length === 0 && (
        <p className="text-white/30 text-sm col-span-full py-12 text-center">No projects in this filter.</p>
      )}
    </section>
  );
}
`,
      }
    ),
  },
  {
    id: "blog",
    title: "Developer Blog",
    category: "Blog",
    desc: "Post list with readable article view",
    prompt: "Developer blog with post list and article view — keep editing from here",
    vfs: shell(
      `import React, { useState } from "react";
import { PostList } from "./components/PostList";
import { PostView } from "./components/PostView";

const POSTS = [
  {
    slug: "shipping-smaller-diffs",
    title: "Shipping smaller diffs",
    date: "Mar 2",
    excerpt: "Why incremental previews beat giant rewrites.",
    body: "When the preview updates file-by-file, you catch layout bugs early. Prefer a thin vertical slice over a perfect architecture that never ships.",
  },
  {
    slug: "vfs-mental-model",
    title: "VFS mental model",
    date: "Feb 18",
    excerpt: "Treat generated apps as file trees, not strings.",
    body: "A virtual filesystem lets the agent edit one component without regenerating the whole app. Keep paths stable and imports relative.",
  },
  {
    slug: "byok-without-drama",
    title: "BYOK without drama",
    date: "Jan 30",
    excerpt: "Keep keys local and failures loud.",
    body: "Store API keys in the browser when possible, probe models on save, and surface auth errors with a clear Test button — not a silent spinner.",
  },
];

export default function App() {
  const [slug, setSlug] = useState(null);
  const post = POSTS.find((p) => p.slug === slug) || null;

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <header className="border-b border-white/10 px-6 py-5 font-black tracking-tight flex items-center justify-between">
        <button type="button" onClick={() => setSlug(null)} className="hover:opacity-80">
          DEV<span className="text-emerald-400">LOG</span>
        </button>
        {post && (
          <button type="button" onClick={() => setSlug(null)} className="text-xs uppercase tracking-widest text-white/40 hover:text-white">
            ← All posts
          </button>
        )}
      </header>
      <main className="max-w-2xl mx-auto p-6 md:p-10">
        {post ? <PostView post={post} /> : (
          <>
            <h1 className="text-4xl font-black tracking-tight mb-8">Writing</h1>
            <PostList posts={POSTS} onOpen={setSlug} />
          </>
        )}
      </main>
    </div>
  );
}
`,
      {
        "components/PostList.tsx": `import React from "react";

export function PostList({ posts, onOpen }) {
  return (
    <div className="space-y-2">
      {posts.map((p) => (
        <button
          key={p.slug}
          type="button"
          onClick={() => onOpen(p.slug)}
          className="w-full text-left border border-transparent hover:border-white/10 rounded-2xl p-5 hover:bg-white/[0.03] transition-colors"
        >
          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">{p.date}</div>
          <h2 className="text-xl font-bold">{p.title}</h2>
          <p className="text-sm text-white/40 mt-2">{p.excerpt}</p>
        </button>
      ))}
    </div>
  );
}
`,
        "components/PostView.tsx": `import React from "react";

export function PostView({ post }) {
  return (
    <article>
      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">{post.date}</div>
      <h1 className="text-4xl font-black tracking-tight mb-6">{post.title}</h1>
      <p className="text-lg text-white/70 leading-relaxed">{post.body}</p>
      <p className="text-sm text-white/30 mt-10">Edit this post in components/PostView.tsx or ask the agent to add more articles.</p>
    </article>
  );
}
`,
      }
    ),
  },
];

export function getTemplate(id: string | undefined | null) {
  return PROJECT_TEMPLATES.find((t) => t.id === id) || PROJECT_TEMPLATES[0];
}

export function getTemplateVfs(id: string | undefined | null) {
  return cloneVfs(getTemplate(id).vfs);
}

export function matchTemplateByTitle(title: string) {
  const t = title.toLowerCase();
  return (
    PROJECT_TEMPLATES.find(
      (x) =>
        x.title.toLowerCase() === t ||
        x.id === t ||
        t.includes(x.id) ||
        x.title.toLowerCase().includes(t)
    ) || null
  );
}
