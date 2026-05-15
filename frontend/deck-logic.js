document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        await loadAndRenderDecks();
    }, 500);
});

async function loadAndRenderDecks() {
    const decksGrid = document.getElementById('decksGrid');
    if (!decksGrid) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: decks, error } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id);

    if (error || !decks || decks.length === 0) {
        decksGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--ff-text-secondary);">No decks found. Create one to start learning!</p>';
        return;
    }

    document.getElementById('totalDecks').textContent = decks.length;
    
    let totalCardsCount = 0;
    document.getElementById('totalCards').textContent = totalCardsCount;

    decksGrid.innerHTML = decks.map(deck => {
        const borderStyle = deck.color ? `border-top: 6px solid ${deck.color}` : 'border-top: 6px solid #994700';
        
        return `
            <div class="ff-card flex flex-col justify-between" style="${borderStyle}; min-height: 160px; transition: all 0.3s ease;">
                <div onclick="window.location.href='deck-details.html?id=${deck.id}'" class="cursor-pointer flex-grow">
                    <h3 class="text-lg font-bold mb-2 text-gray-800">${deck.title || deck.name}</h3>
                    <p class="text-sm text-gray-500 mb-4">${deck.description || 'No description available.'}</p>
                </div>
                
                <button onclick="studyNow('deck', '${deck.id}')" class="ff-btn ff-btn-primary w-full flex items-center justify-center gap-2 mt-2" type="button">
                    <span class="material-symbols-outlined text-sm">play_arrow</span>
                    Study Now
                </button>
            </div>
        `;
    }).join('');
}

async function studyNow(type, id) {
    let cardsToStudy = [];

    try {
        if (type === 'deck') {
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('deck_id', id);

            if (!error && cards) cardsToStudy = cards;
        } 
        else if (type === 'folder') {
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('folder_id', id);

            if (!error && cards) cardsToStudy = cards;
        } 
        else if (type === 'set') {
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('set_id', id);

            if (!error && cards) cardsToStudy = cards;
        }

        if (cardsToStudy.length === 0) {
            alert("This selection doesn't have any cards to study yet!");
            return;
        }

        localStorage.setItem('current_study_queue', JSON.stringify(cardsToStudy));
        window.location.href = 'study-session.html';

    } catch (err) {
        console.error("Error generating study session:", err);
    }
}
