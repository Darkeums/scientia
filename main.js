import { supabase } from './supabaseClient.js';

const Graph = ForceGraph()(document.getElementById('graph'));
let activeNode = null;

// Graph Config: Visible Link Threads
Graph.backgroundColor('#050508')
    .nodeColor(() => '#6366f1')
    .linkColor(() => 'rgba(255, 255, 255, 0.4)') // Light threads
    .linkWidth(2)
    .linkDirectionalParticles(2)
    .onNodeClick(node => openSidebar(node));

async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    document.getElementById('node-content').value = node.content || "";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

// Notepad Auto-save Logic
document.getElementById('node-content').oninput = () => {
    if (!activeNode) return;
    document.getElementById('save-status').innerText = "Typing...";
    
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(async () => {
        await supabase.from('nodes')
            .update({ content: document.getElementById('node-content').value })
            .eq('id', activeNode.id);
        document.getElementById('save-status').innerText = "All changes saved";
    }, 800);
};

document.getElementById('close-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.add('sidebar-hidden');
};