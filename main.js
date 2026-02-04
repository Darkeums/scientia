import { supabase } from './supabaseClient.js';

const graphElement = document.getElementById('graph');
const Graph = ForceGraph()(graphElement);

let nodes = [];
let links = [];
let linkMode = false;
let sourceNode = null;

// Obsidian-style Physics & Visuals
Graph.backgroundColor('#050508')
    .nodeRelSize(5)
    .nodeId('id')
    .nodeLabel('name')
    .nodeColor(n => n.id === sourceNode?.id ? '#ffffff' : '#6366f1')
    .linkColor(() => 'rgba(255, 255, 255, 0.08)')
    .linkDirectionalParticles(2)
    .linkDirectionalParticleSpeed(0.005)
    .linkDirectionalParticleWidth(1.2)
    .onNodeClick(node => {
        if (linkMode) handleLinkSelection(node);
    });

// Tweak Forces (The "Obsidian Spread")
Graph.d3Force('charge').strength(-150);
Graph.d3Force('link').distance(60);

async function refreshData() {
    const { data: n } = await supabase.from('nodes').select('*');
    const { data: l } = await supabase.from('links').select('*');
    
    nodes = n || [];
    links = l?.map(link => ({ source: link.source, target: link.target })) || [];
    
    Graph.graphData({ nodes, links });
}

async function handleLinkSelection(node) {
    if (!sourceNode) {
        sourceNode = node;
        updateStatus(`Source: ${node.name} | Select Target...`);
    } else {
        if (sourceNode.id === node.id) return resetLinkMode();

        const { error } = await supabase.from('links').insert([
            { source: sourceNode.id, target: node.id }
        ]);

        if (!error) {
            await refreshData();
            resetLinkMode();
        }
    }
}

function resetLinkMode() {
    sourceNode = null;
    linkMode = false;
    updateStatus('');
    document.getElementById('toggleLink').classList.remove('active');
}

function updateStatus(msg) {
    document.getElementById('status-bar').innerText = msg;
}

// UI Event Listeners
document.getElementById('addNode').onclick = async () => {
    const name = prompt("Enter Node Topic:");
    if (name) {
        const { error } = await supabase.from('nodes').insert([{ name }]);
        if (!error) refreshData();
    }
};

document.getElementById('toggleLink').onclick = (e) => {
    linkMode = !linkMode;
    sourceNode = null;
    e.target.classList.toggle('active', linkMode);
    updateStatus(linkMode ? 'LINK MODE ACTIVE: Select source node' : '');
};
// Add this inside your Graph configuration in main.js
Graph.onNodeHover(node => {
    graphElement.style.cursor = node ? 'pointer' : null;
})
.nodeCanvasObject((node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 14/globalScale;
    ctx.font = `${fontSize}px Inter`;
    
    // Draw Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = node.color || '#6366f1';
    
    // Draw Node
    ctx.fillStyle = node.color || '#6366f1';
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
    ctx.fill();

    // Text Label
    if (globalScale > 2.5) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(label, node.x, node.y + 12);
    }
});

// Initial Load
refreshData();