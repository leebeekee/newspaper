// Editorials Data Container
let editorials = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch real data from editor.xml
    try {
        const response = await fetch('editor.xml');
        if (response.ok) {
            const str = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(str, "text/xml");
            const items = xmlDoc.getElementsByTagName('editorial');

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const getVal = (tag) => item.getElementsByTagName(tag)[0]?.textContent || '';
                const getStruct = (tag) => item.getElementsByTagName('structure')[0]?.getElementsByTagName(tag)[0]?.textContent || '';

                editorials.push({
                    id: item.getAttribute('id'),
                    title: getVal('title'),
                    author: getVal('author'),
                    date: getVal('date'),
                    structure: {
                        background: getStruct('background'),
                        evidence: getStruct('evidence'),
                        argument: getStruct('argument'),
                        fact: getStruct('fact')
                    }
                });
            }
        }
    } catch (e) {
        console.error("Failed to load XML data:", e);
    }
    
    // Fallback if empty (optional demo data)
    if (editorials.length === 0) {
        console.log("No data loaded, using empty set.");
    }

    // Check if we are on the index page
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsArea = document.getElementById('resultsArea');
    const loginForm = document.getElementById('loginForm');

    if (searchInput) {
        // Search Functionality
        const performSearch = () => {
            const generalQuery = searchInput.value.toLowerCase().trim();
            
            const backgroundQuery = document.getElementById('searchBackground').value.toLowerCase().trim();
            const evidenceQuery = document.getElementById('searchEvidence').value.toLowerCase().trim();
            const argumentQuery = document.getElementById('searchArgument').value.toLowerCase().trim();
            const factQuery = document.getElementById('searchFact').value.toLowerCase().trim();

            if (!generalQuery && !backgroundQuery && !evidenceQuery && !argumentQuery && !factQuery) {
                resultsArea.classList.add('hidden');
                return;
            }

            const results = editorials.filter(item => {
                // 1. General Search (Title OR Author) - ONLY if query exists
                const matchesGeneral = generalQuery ? 
                    (item.title.toLowerCase().includes(generalQuery) || item.author.toLowerCase().includes(generalQuery)) : true;

                // 2. Structural Search (AND condition for each specific field if it has a query)
                const matchesBackground = backgroundQuery ? item.structure.background.includes(backgroundQuery) : true;
                const matchesEvidence = evidenceQuery ? item.structure.evidence.includes(evidenceQuery) : true;
                const matchesArgument = argumentQuery ? item.structure.argument.includes(argumentQuery) : true;
                const matchesFact = factQuery ? item.structure.fact.includes(factQuery) : true;

                return matchesGeneral && matchesBackground && matchesEvidence && matchesArgument && matchesFact;
            });

            displayResults(results);
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('adminId').value;
            const pw = document.getElementById('adminPw').value;

            // Mock Login (Accept abc/1234)
            if (id === 'abc' && pw === '1234') {
                window.location.href = 'admin.html';
            } else {
                alert('아이디 또는 비밀번호가 잘못되었습니다.');
            }
        });
    }
});

function displayResults(results) {
    const resultsArea = document.getElementById('resultsArea');
    resultsArea.innerHTML = '';
    
    if (results.length === 0) {
        resultsArea.classList.remove('hidden');
        resultsArea.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-dim);">구조를 분석한 결과가 없습니다.</p>';
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'editorial-card';
        card.innerHTML = `
            <h3>${item.title}</h3>
            <div class="meta">
                <span>${item.author}</span>
                <span>${item.date}</span>
            </div>
            <div class="tags">
                <span class="tag">배경</span>
                <span class="tag">근거</span>
                <span class="tag">주장</span>
                <span class="tag">사실</span>
            </div>
            <div style="margin-top: 1rem; color: #cbd5e1; font-size: 0.9rem;">
                <strong>주장:</strong> ${item.structure.argument}
            </div>
        `;
        resultsArea.appendChild(card);
    });

    resultsArea.classList.remove('hidden');
}
