import { supabase } from './supabaseClient.js';

const Graph = ForceGraph()(document.getElementById('graph'));
let nodes = [], links = [], activeNode = null, linkMode = false, sourceNode = null, currentWsId = null;
const categoryColors = { 'General': '#6366f1', 'CS': '#3b82f6', 'Math': '#ef4444', 'Personal': '#10b981' };

// --- AUTH ---
async function checkUser() {
    // 1. Use getSession instead of getUser for faster/more reliable local check
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
        console.log("Session found for:", session.user.email);
        document.getElementById('auth-overlay').classList.add('hidden');
        
        // 2. Ensure we load the workspace ONLY after we're sure we have a user
        loadWorkspace("Personal"); 
    } else {
        console.log("No active session.");
        document.getElementById('auth-overlay').classList.remove('hidden');
    }
}

document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Provide visual feedback
    document.getElementById('auth-error').innerText = "Signing in...";
    document.getElementById('auth-error').style.color = "white";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        document.getElementById('auth-error').innerText = error.message;
        document.getElementById('auth-error').style.color = "#ef4444";
    } else {
        console.log("Login successful!");
        // 3. Instead of just calling checkUser, let's trigger the UI change directly
        document.getElementById('auth-overlay').classList.add('hidden');
        await loadWorkspace("Personal");
    }
};

// SIGN IN LOGIC
document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) document.getElementById('auth-error').innerText = error.message;
    else checkUser();
};

// SIGN UP LOGIC (This was missing!)
document.getElementById('signup-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        document.getElementById('auth-error').innerText = error.message;
    } else {
        document.getElementById('auth-error').innerText = "Success! Now click Sign In.";
        document.getElementById('auth-error').style.color = "#10b981"; 
    }
};
async function loadWorkspace(name) {
    console.log("Loading workspace:", name);
    
    // Change .single() to .maybeSingle() to stop the crashing
    const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('name', name)
        .maybeSingle(); 
    
    if (error) {
        console.error("Workspace error:", error.message);
        return;
    }

    if (data) {
        currentWsId = data.id;
        console.log("Success! Workspace ID:", currentWsId);
        refreshData();
    } else {
        console.log("No workspace found yet. RLS might be blocking or row is missing.");
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadWorkspace(e.target.dataset.ws);
    };
});

// --- GRAPH CONFIG ---
Graph.backgroundColor('#050508')
    .nodeColor(n => categoryColors[n.category] || '#6366f1')
    .nodeCanvasObject((node, ctx, globalScale) => {
        const color = categoryColors[node.category] || '#6366f1';
        ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI); ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.font = `${14/globalScale}px Inter`;
        ctx.textAlign = 'center'; ctx.fillStyle = 'white';
        ctx.fillText(node.name, node.x, node.y + 12);
    })
    .onNodeClick(node => linkMode ? handleLinkSelection(node) : openSidebar(node));

async function refreshData() {
    if (!currentWsId) return;
    const { data: n } = await supabase.from('nodes').select('*').eq('workspace_id', currentWsId);
    const { data: l } = await supabase.from('links').select('*').eq('workspace_id', currentWsId);
    nodes = n || [];
    links = l?.map(link => ({ source: link.source, target: link.target })) || [];
    Graph.graphData({ nodes, links });
}

// --- NODE ACTIONS ---
async function openSidebar(node) {
    activeNode = node;
    document.getElementById('node-title').innerText = node.name;
    const { data } = await supabase.from('nodes').select('*').eq('id', node.id).single();
    document.getElementById('node-content').value = data?.content || "";
    document.getElementById('node-category').value = data?.category || "General";
    document.getElementById('sidebar').classList.remove('sidebar-hidden');
}

document.getElementById('addNode').onclick = async () => {
    const name = prompt("Topic:");
    if (name && currentWsId) {
        await supabase.from('nodes').insert([{ name, workspace_id: currentWsId }]);
        refreshData();
    }
};
// Markdown Rendering Toggle
let isPreview = false;
document.getElementById('edit-toggle').onclick = () => {
    isPreview = !isPreview;
    const content = document.getElementById('node-content');
    const preview = document.getElementById('node-preview');
    if (isPreview) {
        preview.innerHTML = marked.parse(content.value);
        content.classList.add('hidden'); 
        preview.classList.remove('hidden');
        document.getElementById('edit-toggle').innerText = "✍️ Edit";
    } else {
        content.classList.remove('hidden'); 
        preview.classList.add('hidden');
        document.getElementById('edit-toggle').innerText = "👁 Preview";
    }
};

document.getElementById('node-content').oninput = () => {
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(async () => {
        await supabase.from('nodes').update({ content: document.getElementById('node-content').value }).eq('id', activeNode.id);
        document.getElementById('save-status').innerText = "Saved";
    }, 1000);
};

document.getElementById('close-sidebar').onclick = () => document.getElementById('sidebar').classList.add('sidebar-hidden');

checkUser();