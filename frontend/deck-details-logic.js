let currentDeckId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentDeckId = urlParams.get('id');

    if (!currentDeckId) {
        alert('No deck ID specified!');
        window.location.href = 'decks.html';
        return;
    }

    setTimeout(async () => {
        await fetchAndRenderDeckDetails();
    }, 500);
});

async function fetchAndRenderDeckDetails() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('*')
            .eq('id', currentDeckId)
            .single();

        if (deckError || !deck) {
            console.error('Error fetching deck:', deckError);
            return;
        }

        document.getElementById('deckTitle').textContent = deck.title || deck.name;
        if (deck.description) {
            document.getElementById('deckDescription').textContent = deck.description;
        }

        const pageHeader = document.querySelector('.ff-page-header');
        if (pageHeader && deck.color) {
            const userColor = deck.color;
            pageHeader.style.background = `linear-gradient(135deg, ${userColor}, ${adjustColorBrightness(userColor, -20)})`;
            pageHeader.style.color = '#ffffff'; // Chữ trắng nổi bật trên nền banner

            const kicker = pageHeader.querySelector('.ff-kicker');
            if (kicker) kicker.style.color = 'rgba(255, 255, 255, 0.8)';
            const subtitle = document.getElementById('deckDescription');
            if (subtitle) subtitle.style.color = 'rgba(255, 255, 255, 0.9)';
        }

        addStudyButtonToHeader(pageHeader, 'deck', currentDeckId);

        const { data: folders, error: folderError } = await supabase
            .from('folders')
            .select('*')
            .eq('deck_id', currentDeckId);

        if (folderError) console.error('Error fetching folders:', folderError);
        const folderCount = folders ? folders.length : 0;
        document.getElementById('deckFolderCount').textContent = folderCount;

        const { data: sets, error: setError } = await supabase
            .from('sets')
            .select('*')
            .eq('deck_id', currentDeckId);

        const setCount = sets ? sets.length : 0;
        document.getElementById('deckSetCount').textContent = setCount;

        const { data: cards, error: cardError } = await supabase
            .from('cards')
            .select('*')
            .eq('deck_id', currentDeckId);

        const cardCount = cards ? cards.length : 0;
        document.getElementById('deckCardCount').textContent = cardCount;

        renderFoldersListView(folders, sets);

    } catch (err) {
        console.error('System error:', err);
    }
}

function renderFoldersListView(folders, sets) {
    const container = document.getElementById('foldersContainer');
    if (!container) return;

    updateToolbarText("Folders and Sets", "Create folders first, then create sets inside them.", true);

    if (!folders || folders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 py-8 text-center col-span-full">This deck has no folders yet. Create one above!</p>';
        return;
    }

    container.className = "ff-grid"; // Trả lại grid layout
    container.innerHTML = folders.map(folder => {
        const internalSets = sets ? sets.filter(s => s.folder_id === folder.id) : [];
        
        return `
            <div class="ff-card flex flex-col justify-between" style="border-left: 6px solid #4dadf7; animation: slideInUp 0.3s ease-out;">
                <div onclick="viewFolderDetails('${folder.id}', '${folder.title || folder.name}')" class="cursor-pointer flex-grow">
                    <div class="flex items-center gap-2 text-blue-500 mb-2">
                        <span class="material-symbols-outlined">folder</span>
                        <span class="font-bold text-sm uppercase tracking-wider text-gray-400">Folder</span>
                    </div>
                    <h3 class="text-lg font-bold text-gray-800 mb-1">${folder.title || folder.name}</h3>
                    <p class="text-sm text-gray-500 mb-2">${folder.description || 'No description'}</p>
                    <span class="inline-block bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-semibold">
                        ${internalSets.length} Sets inside
                    </span>
                </div>
                <div class="flex gap-2 mt-4 pt-2 border-t border-gray-100">
                    <button onclick="studyNow('folder', '${folder.id}')" class="ff-btn ff-btn-tonal flex-grow flex items-center justify-center gap-1 py-2 text-xs" type="button">
                        <span class="material-symbols-outlined text-sm">play_arrow</span> Study Now
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewFolderDetails(folderId, folderTitle) {
    const container = document.getElementById('foldersContainer');
    
    updateToolbarText(
        `<span class="text-blue-500 cursor-pointer hover:underline" onclick="fetchAndRenderDeckDetails()">Folders</span> &gt; ${folderTitle}`, 
        "Showing all study sets inside this folder.",
        false
    );

    const { data: sets, error } = await supabase
        .from('sets')
        .select('*')
        .eq('folder_id', folderId);

    if (error || !sets || sets.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500 mb-4">This folder is empty.</p>
                <button onclick="fetchAndRenderDeckDetails()" class="ff-btn ff-btn-soft text-xs">
                    <span class="material-symbols-outlined text-sm">arrow_back</span> Back to Folders
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = sets.map(set => {
        return `
            <div class="ff-card flex flex-col justify-between" style="border-left: 6px solid #51cf66; animation: slideInUp 0.3s ease-out;">
                <div onclick="window.location.href='cards.html?deckId=${currentDeckId}&folderId=${folderId}&setId=${set.id}'" class="cursor-pointer flex-grow">
                    <div class="flex items-center gap-2 text-green-500 mb-2">
                        <span class="material-symbols-outlined">library_books</span>
                        <span class="font-bold text-sm uppercase tracking-wider text-gray-400">Study Set</span>
                    </div>
                    <h3 class="text-lg font-bold text-gray-800 mb-1">${set.title || set.name}</h3>
                    <p class="text-sm text-gray-500 mb-4">${set.description || 'No description'}</p>
                </div>
                <div class="flex gap-2 pt-2 border-t border-gray-100">
                    <button onclick="studyNow('set', '${set.id}')" class="ff-btn ff-btn-primary flex-grow flex items-center justify-center gap-1 py-2 text-xs" type="button">
                        <span class="material-symbols-outlined text-sm">play_arrow</span> Study Now
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateToolbarText(titleHtml, subtitleText, showNormalCreateButtons) {
    const toolbar = document.querySelector('.ff-toolbar');
    if (!toolbar) return;
    
    const textDiv = toolbar.querySelector('div');
    if (textDiv) {
        textDiv.innerHTML = `<h2>${titleHtml}</h2><p>${subtitleText}</p>`;
    }
    
    const actionDiv = toolbar.querySelector('div[style*="display:flex"]');
    if (actionDiv) {
        actionDiv.style.display = showNormalCreateButtons ? 'flex' : 'none';
    }
}

function addStudyButtonToHeader(headerElement, type, id) {
    if (!headerElement) return;
    let existBtn = document.getElementById('headerStudyNowBtn');
    if (existBtn) existBtn.remove();

    const btn = document.createElement('button');
    btn.id = 'headerStudyNowBtn';
    btn.className = 'ff-btn mt-4 sm:mt-0 flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-bold px-4 py-2 rounded-lg shadow';
    btn.style.color = '#111827'; 
    btn.type = 'button';
    btn.innerHTML = `<span class="material-symbols-outlined">play_arrow</span> Study Now All`;
    btn.onclick = () => studyNow(type, id);
    
    headerElement.appendChild(btn);
}

async function studyNow(type, id) {
    let cardsToStudy = [];
    try {
        if (type === 'deck') {
            const { data, error } = await supabase.from('cards').select('*').eq('deck_id', id);
            if (!error && data) cardsToStudy = data;
        } 
        else if (type === 'folder') {
            const { data, error } = await supabase.from('cards').select('*').eq('folder_id', id);
            if (!error && data) cardsToStudy = data;
        } 
        else if (type === 'set') {
            const { data, error } = await supabase.from('cards').select('*').eq('set_id', id);
            if (!error && data) cardsToStudy = data;
        }

        if (cardsToStudy.length === 0) {
            alert("This item has no flashcards to study yet!");
            return;
        }

        localStorage.setItem('current_study_queue', JSON.stringify(cardsToStudy));
        window.location.href = 'study-session.html';

    } catch (err) {
        console.error("Study session initiation error:", err);
    }
}

function adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1,3),16);
    let G = parseInt(hex.substring(3,5),16);
    let B = parseInt(hex.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255;
    const rHex = (R.toString(16).length==1)?"0"+R.toString(16):R.toString(16);
    const gHex = (G.toString(16).length==1)?"0"+G.toString(16):G.toString(16);
    const bHex = (B.toString(16).length==1)?"0"+B.toString(16):B.toString(16);
    return "#"+rHex+gHex+bHex;
}
