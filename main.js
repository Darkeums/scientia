import { supabase } from './supabaseClient.js';

// 1. INITIALIZE GRAPH
const Graph = ForceGraph()(document.getElementById('graph'));
let nodes = [], links = [], activeNode = null, currentWsId = null;

const colors = { 
    'General': '#6366f1', 
    'CS': '#3b82f6', 
    'Math': '#ef4444', 
    'Personal': '#10b981' 
};

// 2. GRAPH CONFIGURATION (Fixes invisible threads & bland UI)
Graph.backgroundColor('#050508')
    .nodeColor(n => colors[n.category] || '#6366f1')
    .linkColor(() => 'rgba(255, 255, 255, 0.3)') // Visible threads
    .linkWidth(2)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleSpeed(0.005)
    .onNodeClick(node => openSidebar(node))
    .nodeCanvasObject((node, ctx, globalScale) => {
        const color = colors[node.category] || '#6366f1';
        ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.shadowBlur = 0;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px 'Inter'`; ctx.textAlign = 'center'; ctx.fillStyle = 'white';
        ctx.fillText(node.name, node.x, node.y + 12);
    });

// 3. WORKSPACE & DATA LOADING
async function loadWorkspace(name) {
    console.log(`Switching to workspace: ${name}`);
    const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('name', name)
        .maybeSingle();

    if (data) {
        currentWsId = data.id;
        // Update UI Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-ws') === name);
        });
        refreshData();
    } else {
        console.error("Workspace not found:", error);
    }
}

async function refreshData() {
    if (!currentWsId) return;

    // Fetch Nodes
    const { data: nData } = await supabase
        .from('nodes')
        .select('*')
        .eq('workspace_id', currentWsId);

    // Fetch Links
    const { data: lData } = await supabase
        .from('links')
        .select('*')
        .eq('workspace_id', currentWsId);

    nodes = nData || [];
    links = lData?.map(l => ({ source: l.source, target: l.target })) || [];

    Graph.graphData({ nodes, links });
}

// 4. NOTEPAD / SIDEBAR LOGIC
async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    document.getElementById('node-content').value = node.content || "";
    document.getElementById('node-category').value = node.category || "General";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

// Auto-save Notepad
document.getElementById('node-content').oninput = () => {
    if (!activeNode) return;
    document.getElementById('save-status').innerText = "Saving...";
    
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(async () => {
        const content = document.getElementById('node-content').value;
        await supabase.from('nodes').update({ content }).eq('id', activeNode.id);
        document.getElementById('save-status').innerText = "All changes saved";
    }, 1000);
};

// 5. EVENT LISTENERS
document.getElementById('addNode').onclick = async () => {
    const name = prompt("Enter Node Topic:");
    if (name && currentWsId) {
        await supabase.from('nodes').insert([{ 
            name, 
            workspace_id: currentWsId, 
            category: 'General' 
        }]);
        refreshData();
    }
};

document.getElementById('close-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.add('sidebar-hidden');
    activeNode = null;
};

// Workspace Switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => loadWorkspace(btn.getAttribute('data-ws'));
});

// 6. INITIALIZATION
async function init() {
    // Check for session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        loadWorkspace("Personal");
    } else {
        // Fallback for dev: load personal anyway if no auth overlay is present
        loadWorkspace("Personal");
    }
}

init();

// Handle Window Resize
window.addEventListener('resize', () => {
    Graph.width(window.innerWidth).height(window.innerHeight);
});