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
const statusBar = document.getElementById('status-bar');

Graph.backgroundColor('#050508')
    .nodeRelSize(6)
    .linkColor(() => 'rgba(255, 255, 255, 0.3)') // BRIGHTER LINKS
    .linkWidth(1.5)
    .nodeCanvasObject((node, ctx, globalScale) => {
        // NEON BLOOM EFFECT
        ctx.shadowBlur = 15;
        ctx.shadowColor = node.color || '#6366f1';
        ctx.fillStyle = node.color || '#6366f1';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        if (globalScale > 2.5) {
            ctx.shadowBlur = 0;
            ctx.font = `${12/globalScale}px Inter`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'white';
            ctx.fillText(node.name, node.x, node.y + 12);
        }
    })
    .onNodeClick(node => {
        // Traffic Control: If linking, don't open sidebar
        if (linkMode) {
            handleLinkSelection(node);
        } else {
            openSidebar(node);
        }
    });

// Connection Logic
async function handleLinkSelection(node) {
    if (!sourceNode) {
        sourceNode = node;
        statusBar.innerText = `Source: ${node.name} | Select Target...`;
    } else {
        if (sourceNode.id === node.id) return resetLinkMode();
        
        await supabase.from('links').insert([{ source: sourceNode.id, target: node.id }]);
        await refreshData();
        resetLinkMode();
    }
}

function resetLinkMode() {
    sourceNode = null;
    statusBar.innerText = "";
}

// Sidebar & Auto-save
async function openSidebar(node) {
    activeNode = node;
    nodeTitle.innerText = node.name;
    const { data } = await supabase.from('nodes').select('content').eq('id', node.id).single();
    nodeContent.value = data?.content || "";
    sidebar.classList.remove('sidebar-hidden');
}

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

// Data Fetching
async function refreshData() {
    const { data: n } = await supabase.from('nodes').select('*');
    const { data: l } = await supabase.from('links').select('*');
    nodes = n || [];
    links = l?.map(link => ({ source: link.source, target: link.target })) || [];
    Graph.graphData({ nodes, links });
}

document.getElementById('addNode').onclick = async () => {
    const name = prompt("Enter Node Name:");
    if (name) {
        await supabase.from('nodes').insert([{ name }]);
        refreshData();
    }
};

document.getElementById('toggleLink').onclick = (e) => {
    linkMode = !linkMode;
    e.target.classList.toggle('active', linkMode);
    if (!linkMode) resetLinkMode();
};

refreshData();