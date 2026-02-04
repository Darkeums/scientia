import { supabase } from './supabaseClient.js';

const Graph = ForceGraph()(document.getElementById('graph'));
let nodes = [], links = [], activeNode = null, currentWsId = null;

// --- GRAPH SETUP (FIXES INVISIBLE THREADS) ---
Graph.backgroundColor('#050508')
    .nodeColor(n => n.category === 'CS' ? '#3b82f6' : '#6366f1')
    .linkColor(() => 'rgba(255, 255, 255, 0.3)') // Visible threads
    .linkWidth(1.5)
    .linkDirectionalParticles(2)
    .onNodeClick(node => openSidebar(node))
    .nodeCanvasObject((node, ctx, globalScale) => {
        const color = '#6366f1';
        ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `${12/globalScale}px Inter`; ctx.textAlign = 'center'; ctx.fillStyle = 'white';
        ctx.fillText(node.name, node.x, node.y + 12);
    });

// --- NOTEPAD FUNCTIONALITY ---
async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    document.getElementById('node-content').value = node.content || "";
    document.getElementById('node-category').value = node.category || "General";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

// Auto-save logic for the notepad
document.getElementById('node-content').oninput = () => {
    if (!activeNode) return;
    document.getElementById('save-status').innerText = "Typing...";
    
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(async () => {
        const content = document.getElementById('node-content').value;
        const { error } = await supabase.from('nodes')
            .update({ content: content })
            .eq('id', activeNode.id);
        
        if (!error) document.getElementById('save-status').innerText = "All changes saved";
    }, 1000);
};

// Close Sidebar
document.getElementById('close-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.add('sidebar-hidden');
    activeNode = null;
};

// ... (Rest of your refreshData and loadWorkspace functions)