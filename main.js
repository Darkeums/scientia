import { supabase } from './supabaseClient.js';

// --- 1. INITIALIZATION & STATE ---
const Graph = ForceGraph()(document.getElementById('graph'));
let nodes = [], links = [], activeNode = null, currentWsId = null;
let isConnecting = false, firstNode = null;

const colors = { 
    'General': '#6366f1', 
    'CS': '#3b82f6', 
    'Math': '#ef4444', 
    'Personal': '#10b981' 
};

// --- 2. GRAPH CONFIGURATION (Fixes blandness & invisible threads) ---
Graph.backgroundColor('#050508')
    .nodeColor(n => colors[n.category] || '#6366f1')
    .linkColor(() => 'rgba(255, 255, 255, 0.4)') // Visible threads
    .linkWidth(2)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleSpeed(0.005)
    .onNodeClick(node => {
        if (isConnecting) {
            handleConnection(node);
        } else {
            openSidebar(node);
        }
    })
    .nodeCanvasObject((node, ctx, globalScale) => {
        const color = colors[node.category] || '#6366f1';
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath(); 
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI); 
        ctx.fill();
        
        // Label styling
        ctx.shadowBlur = 0;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px 'Inter'`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(node.name, node.x, node.y + 12);
    });

// --- 3. DATA FETCHING & WORKSPACES ---
async function loadWorkspace(name) {
    const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('name', name)
        .maybeSingle();

    if (data) {
        currentWsId = data.id;
        // Update tab UI
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-ws') === name);
        });
        refreshData();
    }
}

async function refreshData() {
    if (!currentWsId) return;

    const { data: nData } = await supabase.from('nodes').select('*').eq('workspace_id', currentWsId);
    const { data: lData } = await supabase.from('links').select('*').eq('workspace_id', currentWsId);

    nodes = nData || [];
    // Map links so the library can read source/target IDs
    links = lData?.map(l => ({ source: l.source, target: l.target })) || [];

    Graph.graphData({ nodes, links });
}

// --- 4. CONNECT NODES LOGIC ---
document.getElementById('toggleLink').onclick = () => {
    isConnecting = !isConnecting;
    firstNode = null;
    const btn = document.getElementById('toggleLink');
    
    if (isConnecting) {
        btn.innerText = "❌ CANCEL";
        btn.style.background = "#ef4444";
    } else {
        btn.innerText = "🔗 CONNECT";
        btn.style.background = "var(--glass)";
    }
};

async function handleConnection(secondNode) {
    if (!firstNode) {
        firstNode = secondNode;
        alert(`Selected ${firstNode.name}. Now click the node to link it to.`);
    } else {
        if (firstNode.id === secondNode.id) return;

        const { error } = await supabase.from('links').insert([{ 
            source: firstNode.id, 
            target: secondNode.id, 
            workspace_id: currentWsId 
        }]);

        if (!error) {
            isConnecting = false;
            document.getElementById('toggleLink').innerText = "🔗 CONNECT";
            document.getElementById('toggleLink').style.background = "var(--glass)";
            refreshData();
        }
    }
}

// --- 5. NOTEPAD & SIDEBAR LOGIC ---
async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    document.getElementById('node-content').value = node.content || "";
    document.getElementById('node-category').value = node.category || "General";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

// Auto-save typing
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

// Category dropdown update
document.getElementById('node-category').onchange = async (e) => {
    if (!activeNode) return;
    const category = e.target.value;
    await supabase.from('nodes').update({ category }).eq('id', activeNode.id);
    refreshData();
};

// --- 6. DELETE LOGIC ---
document.getElementById('delete-node').onclick = async () => {
    if (!activeNode) return;
    
    if (confirm(`Delete "${activeNode.name}" and all its links?`)) {
        // Delete links first (Foreign Key constraint)
        await supabase.from('links')
            .delete()
            .or(`source.eq.${activeNode.id},target.eq.${activeNode.id}`);
        
        // Delete node
        const { error } = await supabase.from('nodes').delete().eq('id', activeNode.id);
        
        if (!error) {
            document.getElementById('sidebar').classList.add('sidebar-hidden');
            activeNode = null;
            refreshData();
        }
    }
};

// --- 7. GLOBAL CONTROLS ---
document.getElementById('addNode').onclick = async () => {
    const name = prompt("Topic name:");
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

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => loadWorkspace(btn.getAttribute('data-ws'));
});

window.addEventListener('resize', () => {
    Graph.width(window.innerWidth).height(window.innerHeight);
});

// Start the app
loadWorkspace("Personal");