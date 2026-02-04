import { supabase } from './supabaseClient.js';

const Graph = ForceGraph()(document.getElementById('graph'));
let nodes = [], links = [], activeNode = null, currentWsId = null;
let isConnecting = false, firstNode = null;
const colors = { 'General': '#6366f1', 'CS': '#3b82f6', 'Math': '#ef4444', 'Personal': '#10b981' };

// --- AUTH ---
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) { await loadWorkspace("Personal"); } 
    else { document.getElementById('auth-overlay').classList.remove('hidden'); }
}

document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) document.getElementById('auth-error').innerText = error.message;
    else window.location.reload();
};

// --- WORKSPACE & DATA ---
async function loadWorkspace(name) {
    const { data } = await supabase.from('workspaces').select('id').eq('name', name).maybeSingle();
    if (data) {
        currentWsId = data.id;
        document.getElementById('auth-overlay').classList.add('hidden');
        refreshData();
    }
}

async function refreshData() {
    if (!currentWsId) return;
    const { data: n } = await supabase.from('nodes').select('*').eq('workspace_id', currentWsId);
    const { data: l } = await supabase.from('links').select('*').eq('workspace_id', currentWsId);
    nodes = n || [];
    links = l?.map(link => ({ source: link.source, target: link.target })) || [];
    Graph.graphData({ nodes, links });
}

// --- GRAPH CONFIG ---
Graph.backgroundColor('#050508')
    .nodeColor(n => colors[n.category] || '#6366f1')
    .onNodeClick(node => {
        if (isConnecting) handleConnection(node);
        else openSidebar(node);
    })
    .nodeCanvasObject((node, ctx, globalScale) => {
        const label = node.name;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px Inter`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'white';
        ctx.fillText(label, node.x, node.y + 10);
        ctx.fillStyle = colors[node.category] || '#6366f1';
        ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI); ctx.fill();
    });

// --- ACTIONS ---
document.getElementById('addNode').onclick = async () => {
    const name = prompt("Topic:");
    if (name && currentWsId) {
        await supabase.from('nodes').insert([{ name, workspace_id: currentWsId, category: 'General' }]);
        refreshData();
    }
};

document.getElementById('toggleLink').onclick = () => {
    isConnecting = !isConnecting;
    document.getElementById('toggleLink').innerText = isConnecting ? "❌ CANCEL" : "🔗 CONNECT";
    firstNode = null;
};

async function handleConnection(node) {
    if (!firstNode) { firstNode = node; alert("Select second node"); }
    else {
        await supabase.from('links').insert([{ source: firstNode.id, target: node.id, workspace_id: currentWsId }]);
        isConnecting = false; document.getElementById('toggleLink').innerText = "🔗 CONNECT";
        refreshData();
    }
}

async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    document.getElementById('node-content').value = node.content || "";
    document.getElementById('node-category').value = node.category || "General";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

document.getElementById('delete-node').onclick = async () => {
    if (confirm("Delete this node?")) {
        await supabase.from('links').delete().or(`source.eq.${activeNode.id},target.eq.${activeNode.id}`);
        await supabase.from('nodes').delete().eq('id', activeNode.id);
        document.getElementById('sidebar').classList.add('sidebar-hidden');
        refreshData();
    }
};

document.getElementById('close-sidebar').onclick = () => document.getElementById('sidebar').classList.add('sidebar-hidden');

checkUser();