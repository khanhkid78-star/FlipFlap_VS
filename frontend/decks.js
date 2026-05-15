document.addEventListener('DOMContentLoaded', () => {
    renderAllDecks();
});

function renderAllDecks() {
    const decksContainer = document.getElementById('all-decks-container');
    const decks = JSON.parse(localStorage.getItem('decks')) || [];

    if (decks.length === 0) {
        decksContainer.innerHTML = '<p class="no-data" style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px 0;">No decks found. Go to Home to create one!</p>';
        return;
    }

    decksContainer.innerHTML = decks.map(deck => {
        // Tính toán số lượng folder, set, card bên trong giống mục Home
        const folderCount = deck.folders ? deck.folders.length : 0;
        let setCount = 0;
        let cardCount = 0;

        if (deck.folders) {
            deck.folders.forEach(f => {
                if (f.sets) {
                    setCount += f.sets.length;
                    f.sets.forEach(s => {
                        if (s.cards) cardCount += s.cards.length;
                    });
                }
            });
        }

        return `
            <div class="deck-card" style="border-top: 5px solid ${deck.color || '#ff6b6b'}; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                <div class="deck-info" onclick="window.location.href='deck-details.html?id=${deck.id}'" style="cursor: pointer; flex-grow: 1;">
                    <h3 style="margin-bottom: 10px; font-size: 1.2rem; color: #333;">${deck.title}</h3>
                    <p class="deck-meta" style="color: #666; font-size: 0.9rem; display: flex; gap: 15px; margin-bottom: 15px;">
                        <span><i class="fas fa-folder" style="color:#4dadf7"></i> ${folderCount}</span>
                        <span><i class="fas fa-layer-group" style="color:#51cf66"></i> ${setCount}</span>
                        <span><i class="fas fa-clone" style="color:#ff922b"></i> ${cardCount}</span>
                    </p>
                </div>
                <button class="study-now-btn" onclick="studyNow('deck', '${deck.id}')" style="width: 100%; padding: 10px; background: #FF8A00; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-play"></i> Study Now
                </button>
            </div>
        `;
    }).join('');
}

// Hàm logic Study Now tổng hợp (Yêu cầu số 5)
function studyNow(type, id) {
    const decks = JSON.parse(localStorage.getItem('decks')) || [];
    let compiledCards = [];

    if (type === 'deck') {
        const deck = decks.find(d => d.id === id);
        if (deck && deck.folders) {
            deck.folders.forEach(folder => {
                if (folder.sets) {
                    folder.sets.forEach(set => {
                        if (set.cards) compiledCards.push(...set.cards);
                    });
                }
            });
        }
    } 
    else if (type === 'folder') {
        for (const deck of decks) {
            if (deck.folders) {
                const folder = deck.folders.find(f => f.id === id);
                if (folder && folder.sets) {
                    folder.sets.forEach(set => {
                        if (set.cards) compiledCards.push(...set.cards);
                    });
                    break; 
                }
            }
        }
    } 
    else if (type === 'set') {
        for (const deck of decks) {
            if (deck.folders) {
                for (const folder of deck.folders) {
                    if (folder.sets) {
                        const set = folder.sets.find(s => s.id === id);
                        if (set && set.cards) {
                            compiledCards = [...set.cards];
                            break;
                        }
                    }
                }
            }
        }
    }

    if (compiledCards.length === 0) {
        alert("This selection doesn't have any cards to study yet! Please add some cards first.");
        return;
    }

    localStorage.setItem('current_study_queue', JSON.stringify(compiledCards));
    window.location.href = 'study-session.html'; 
}
