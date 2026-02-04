import { supabase } from './supabaseClient.js';

const Graph = ForceGraph()(document.getElementById('graph'));

// App State
let nodes = [], links = [], linkMode = false, sourceNode = null, activeNode = null, isPreview = false;

// Theme Mapping
const categoryColors = { 'General': '#6366f1', 'CS': '#3b82f6', 'Math': '#ef4444', 'Personal': '#10b981', 'Project': '#f59e0b' };

// --- GRAPH ENGINE CONFIG ---
Graph.backgroundColor('#050508')
    .linkColor(() => 'rgba(255, 255, 255, 0.2)')
    .linkWidth(1.5)
    .nodeColor(node => categoryColors[node.category] || '#6366f1')
    .nodeCanvasObject((node, ctx, globalScale) => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = categoryColors[node.category] || '#6366f1';
        ctx.fillStyle = categoryColors[node.category] || '#6366f1';
        ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI); ctx.fill();
        if (globalScale > 2.5) {
            ctx.shadowBlur = 0; ctx.font = `${12/globalScale}px Inter`;
            ctx.textAlign = 'center'; ctx.fillStyle = 'white';
            ctx.fillText(node.name, node.x, node.y + 12);
        }
    })
    .onNodeClick(node => linkMode ? handleLinkSelection(node) : openSidebar(node));

// --- SIDEBAR & MARKDOWN ---
async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    const { data } = await supabase.from('nodes').select('*').eq('id', node.id).single();
    document.getElementById('node-content').value = data?.content || "";
    document.getElementById('node-category').value = data?.category || "General";
    
    // Reset View
    isPreview = false;
    document.getElementById('node-content').classList.remove('hidden');
    document.getElementById('node-preview').classList.add('hidden');
    document.getElementById('edit-toggle').innerText = "👁 Preview";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

document.getElementById('edit-toggle').onclick = () => {
    isPreview = !isPreview;
    const content = document.getElementById('node-content');
    const preview = document.getElementById('node-preview');
    if (isPreview) {
        preview.innerHTML = marked.parse(content.value);
        content.classList.add('hidden'); preview.classList.remove('hidden');
        document.getElementById('edit-toggle').innerText = "✍️ Edit";
    } else {
        content.classList.remove('hidden'); preview.classList.add('hidden');
        document.getElementById('edit-toggle').innerText = "👁 Preview";
    }
};

// --- AUTO-SAVE & CATEGORY ---
document.getElementById('node-content').oninput = () => {
    document.getElementById('save-status').innerText = "Saving...";
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(async () => {
        await supabase.from('nodes').update({ content: document.getElementById('node-content').value }).eq('id', activeNode.id);
        document.getElementById('save-status').innerText = "All changes saved";
    }, 1000);
};

document.getElementById('node-category').onchange = async (e) => {
    await supabase.from('nodes').update({ category: e.target.value }).eq('id', activeNode.id);
    refreshData();
};

// --- SEARCH & TELEPORT ---
document.getElementById('node-search').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    const results = document.getElementById('search-results');
    results.innerHTML = '';
    if (!val) return results.classList.add('hidden');
    
    const matches = nodes.filter(n => n.name.toLowerCase().includes(val));
    matches.forEach(node => {
        const div = document.createElement('div');
        div.className = 'search-item'; div.innerText = node.name;
        div.onclick = () => {
            Graph.centerAt(node.x, node.y, 1000); Graph.zoom(4, 1000);
            openSidebar(node); results.classList.add('hidden');
        };
        results.appendChild(div);
    });
    results.classList.remove('hidden');
};

// --- DELETE & REFRESH ---
document.getElementById('delete-node').onclick = async () => {
    if (confirm(`Delete ${activeNode.name}?`)) {
        await supabase.from('nodes').delete().eq('id', activeNode.id);
        document.getElementById('sidebar').classList.add('sidebar-hidden');
        refreshData();
    }
};

async function refreshData() {
    const { data: n } = await supabase.from('nodes').select('*');
    const { data: l } = await supabase.from('links').select('*');
    nodes = n || [];
    links = l?.map(link => ({ source: link.source, target: link.target })) || [];
    Graph.graphData({ nodes, links });
}

// Global UI
document.getElementById('addNode').onclick = async () => {
    const name = prompt("Node Name:");
    if (name) { await supabase.from('nodes').insert([{ name }]); refreshData(); }
};

document.getElementById('toggleLink').onclick = (e) => {
    linkMode = !linkMode;
    e.target.classList.toggle('active', linkMode);
};

document.getElementById('close-sidebar').onclick = () => document.getElementById('sidebar').classList.add('sidebar-hidden');

refreshData();