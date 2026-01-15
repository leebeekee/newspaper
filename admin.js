// Store editorials in memory for the session
let editorialData = [];

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editorForm');
    const xmlOutput = document.getElementById('xmlOutput');
    const itemsList = document.getElementById('itemsList');
    const downloadBtn = document.getElementById('downloadXmlBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Initial render
    updateXmlPreview();

    // Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newItem = {
            id: 'edit-' + Date.now(),
            title: document.getElementById('editTitle').value,
            author: document.getElementById('editAuthor').value,
            date: document.getElementById('editDate').value,
            structure: {
                background: document.getElementById('editBackground').value,
                evidence: document.getElementById('editEvidence').value,
                argument: document.getElementById('editArgument').value,
                fact: document.getElementById('editFact').value
            }
        };

        editorialData.push(newItem);
        renderItemsList();
        updateXmlPreview();
        form.reset();
        
        // Set date to today by default after reset
        document.getElementById('editDate').valueAsDate = new Date();
    });

    // Clear Form
    clearBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('editDate').valueAsDate = new Date();
    });

    // --- GitHub Integration ---
    const modal = document.getElementById('githubModal');
    const openSettingsBtn = document.getElementById('openGhSettings');
    const closeSettingsBtn = document.getElementById('closeGhModal');
    const saveSettingsBtn = document.getElementById('saveGhConfig');
    
    // Load saved settings
    if(localStorage.getItem('gh_owner')) document.getElementById('ghOwner').value = localStorage.getItem('gh_owner');
    if(localStorage.getItem('gh_repo')) document.getElementById('ghRepo').value = localStorage.getItem('gh_repo');
    if(localStorage.getItem('gh_token')) document.getElementById('ghToken').value = localStorage.getItem('gh_token');

    openSettingsBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    saveSettingsBtn.addEventListener('click', () => {
        const owner = document.getElementById('ghOwner').value.trim();
        const repo = document.getElementById('ghRepo').value.trim();
        const token = document.getElementById('ghToken').value.trim();
        
        if(owner && repo && token) {
            localStorage.setItem('gh_owner', owner);
            localStorage.setItem('gh_repo', repo);
            localStorage.setItem('gh_token', token);
            alert('설정이 저장되었습니다.');
            modal.classList.add('hidden');
        } else {
            alert('모든 항목을 입력해주세요.');
        }
    });

    // Save Logic (Order: GitHub -> Local Server -> Download)
    downloadBtn.addEventListener('click', async () => {
        const xmlContent = generateXmlString();
        downloadBtn.textContent = '저장 중...';
        
        // 1. Try GitHub Direct Save
        const ghOwner = localStorage.getItem('gh_owner');
        const ghRepo = localStorage.getItem('gh_repo');
        const ghToken = localStorage.getItem('gh_token');

        if (ghOwner && ghRepo && ghToken) {
            try {
                await saveToGitHub(ghOwner, ghRepo, ghToken, xmlContent);
                alert('GitHub에 성공적으로 저장(Commit)되었습니다!');
                loadExistingXml();
                downloadBtn.textContent = '저장 (Save)';
                return;
            } catch (e) {
                console.error('GitHub save failed:', e);
                if(!confirm(`GitHub 저장 실패: ${e.message}\n로컬 저장소(내 컴퓨터)로 저장을 시도할까요?`)) {
                    downloadBtn.textContent = '저장 (Save)';
                    return;
                }
            }
        }

        // 2. Try Local Node Server
        try {
            const response = await fetch('/save-xml', {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml' },
                body: xmlContent
            });

            if (response.ok) {
                alert('로컬 서버(editor.xml)에 저장되었습니다!');
                loadExistingXml(); 
            } else {
                throw new Error('Server returned ' + response.status);
            }
        } catch (e) {
            // 3. Fallback to Download
            console.warn('Server save failed, download fallback:', e);
            const blob = new Blob([xmlContent], { type: 'text/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'editor.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        downloadBtn.textContent = '저장 (Save)';
    });

    // Initialize Date
    document.getElementById('editDate').valueAsDate = new Date();
    loadExistingXml();
});

// Helper: Save to GitHub
async function saveToGitHub(owner, repo, token, content) {
    const path = 'editor.xml';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    // 1. Get current file SHA (required for update)
    let sha = null;
    try {
        const getRes = await fetch(apiUrl, {
             headers: { 
                 'Authorization': `token ${token}`,
                 'Accept': 'application/vnd.github.v3+json'
             }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }
    } catch (e) {
        console.warn('File might not exist yet, creating new...');
    }

    // 2. Encode content to Base64 (handle UTF-8 correctly)
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    let binary = '';
    for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
    }
    const base64Content = btoa(binary);

    // 3. PUT request
    const body = {
        message: 'Update editor.xml via Editorial Manager',
        content: base64Content,
        branch: 'main' // or 'master', check your repo
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || 'GitHub API Error');
    }
}

const connectionStatus = document.getElementById('connectionStatus');

async function loadExistingXml() {
    try {
        const response = await fetch('editor.xml');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const str = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(str, "text/xml");
        
        // Check for parser errors
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            throw new Error("XML Parsing error");
        }

        const editorials = xmlDoc.getElementsByTagName('editorial');
        editorialData = []; // Clear current

        for (let i = 0; i < editorials.length; i++) {
            const editorial = editorials[i];
            // ... (extraction logic helpers needed here if not defined globally, but we can reuse the loop cleanly)
             const getVal = (tag) => editorial.getElementsByTagName(tag)[0]?.textContent || '';
             const structure = editorial.getElementsByTagName('structure')[0];
             const getStructVal = (tag) => structure?.getElementsByTagName(tag)[0]?.textContent || '';

            editorialData.push({
                id: editorial.getAttribute('id') || 'edit-' + Date.now() + i,
                title: getVal('title'),
                author: getVal('author'),
                date: getVal('date'),
                structure: {
                    background: getStructVal('background'),
                    evidence: getStructVal('evidence'),
                    argument: getStructVal('argument'),
                    fact: getStructVal('fact')
                }
            });
        }
        
        console.log(`Loaded ${editorialData.length} entries.`);
        renderItemsList();
        updateXmlPreview();
        
        if(connectionStatus) {
            connectionStatus.textContent = `● DB 연결됨 (${editorialData.length}건 로드)`;
            connectionStatus.style.color = '#4ade80'; // Green
        }

    } catch (e) {
        console.error('Error loading XML:', e);
        if(connectionStatus) {
            connectionStatus.textContent = '● DB 연결 실패 (서버 확인 필요)';
            connectionStatus.style.color = '#f87171'; // Red
        }
        alert("기존 데이터를 불러오지 못했습니다. 서버(node server.js)가 실행 중인지 확인하세요.\n그렇지 않으면 저장 시 기존 데이터가 사라질 수 있습니다.");
    }
}

function generateXmlString() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    // Added schema reference attributes
    xml += '<editorials xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="editorial.xsd">\n';
    
    editorialData.forEach(item => {
        xml += '  <editorial id="' + item.id + '">\n';
        xml += `    <title><![CDATA[${item.title}]]></title>\n`;
        xml += `    <author>${item.author}</author>\n`;
        xml += `    <date>${item.date}</date>\n`;
        xml += '    <structure>\n';
        xml += `      <background><![CDATA[${item.structure.background}]]></background>\n`;
        xml += `      <evidence><![CDATA[${item.structure.evidence}]]></evidence>\n`;
        xml += `      <argument><![CDATA[${item.structure.argument}]]></argument>\n`;
        xml += `      <fact><![CDATA[${item.structure.fact}]]></fact>\n`;
        xml += '    </structure>\n';
        xml += '  </editorial>\n';
    });
    
    xml += '</editorials>';
    return xml;
}

function updateXmlPreview() {
    const xml = generateXmlString();
    document.getElementById('xmlOutput').textContent = xml;
}

function renderItemsList() {
    const list = document.getElementById('itemsList');
    list.innerHTML = '';

    editorialData.slice().reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <strong>${item.title}</strong>
                <span style="font-size: 0.8rem; color: #94a3b8; margin-left: 0.5rem;">${item.author} | ${item.date}</span>
            </div>
            <button onclick="deleteItem(${item.id})" class="delete-btn">삭제</button>
        `;
        list.appendChild(div);
    });
}

function deleteItem(id) {
    if(confirm('이 항목을 삭제하시겠습니까?')) {
        editorialData = editorialData.filter(item => item.id !== id);
        renderItemsList();
        updateXmlPreview();
    }
}

// Global scope for delete function
window.deleteItem = deleteItem;
