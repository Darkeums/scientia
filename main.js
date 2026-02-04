import { supabase } from './supabaseClient.js';

const graphElement = document.getElementById('graph');
const Graph = ForceGraph()(graphElement);

let nodes = [];
let links = [];
let linkMode = false;
let sourceNode = null;
let activeNode = null;

// UI Elements
const sidebar = document.getElementById('sidebar');
const nodeTitle = document.getElementById('node-title');
const nodeContent = document.getElementById('node-content');
const saveStatus = document.getElementById('save-status');

// Configuration
Graph.backgroundColor('#050508')
    .nodeRelSize(6)
    .nodeCanvasObject((node, ctx, globalScale) => {
        const label = node.name;
        const fontSize = 12/globalScale;
        
        // NEON BLOOM EFFECT
        ctx.shadowColor = node.color || '#6366f1';
        ctx.shadowBlur = 15;
        ctx.fillStyle = node.color || '#6366f1';
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        ctx.fill();
        
        // Label logic
        if (globalScale > 2.5) {
            ctx.shadowBlur = 0;
            ctx.font = `${fontSize}px Inter`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(label, node.x, node.y + 12);
        }
    })
    .onNodeClick(node => {
    if (linkMode) {
        // If we are in link mode, ONLY handle the connection
        handleLinkSelection(node);
    } else {
        // If we are NOT in link mode, open the sidebar
        openSidebar(node);
    }
});

// Physics
Graph.d3Force('charge').strength(-180);

// Sidebar & Note Logic
async function openSidebar(node) {
    activeNode = node;
    nodeTitle.innerText = node.name;
    
    const { data } = await supabase.from('nodes').select('content').eq('id', node.id).single();
    nodeContent.value = data?.content || "";
    sidebar.classList.remove('sidebar-hidden');
}

// Auto-save with Debouncing
let saveTimeout;
nodeContent.oninput = () => {
    saveStatus.innerText = "Saving...";
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        await supabase.from('nodes').update({ content: nodeContent.value }).eq('id', activeNode.id);
        saveStatus.innerText = "All changes saved";
    }, 1000); 
};

document.getElementById('close-sidebar').onclick = () => sidebar.classList.add('sidebar-hidden');

async function refreshData() {
    const { data: n } = await supabase.from('nodes').select('*');
    const { data: l } = await supabase.from('links').select('*');
    nodes = n || [];
    links = l?.map(link => ({ source: link.source, target: link.target })) || [];
    Graph.graphData({ nodes, links });
}

// Controls
document.getElementById('addNode').onclick = async () => {
    const name = prompt("Topic name:");
    if (name) {
        await supabase.from('nodes').insert([{ name }]);
        refreshData();
    }
};

document.getElementById('toggleLink').onclick = (e) => {
    linkMode = !linkMode;
    e.target.classList.toggle('active', linkMode);
};

refreshData();