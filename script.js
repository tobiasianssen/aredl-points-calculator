const API_URL = 'https://api.aredl.net/v2/api/aredl/levels';
const THUMBNAIL_BASE = 'https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards';
const STORAGE_KEY = 'aredl-selected-levels';

let levels = [];
let selectedLevels = [];

const levelInput = document.getElementById('levelInput');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const suggestionsEl = document.getElementById('suggestions');
const levelList = document.getElementById('levelList');
const totalPointsEl = document.getElementById('totalPoints');
const totalCountEl = document.getElementById('totalCount');
const statusMessage = document.getElementById('statusMessage');

async function loadLevels() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        levels = await response.json();
        const storedIds = getStoredLevelIds();
        selectedLevels = storedIds
            .map(id => levels.find(level => level.level_id === id))
            .filter(Boolean);
        renderLevels();
        showStatus('AREDL level data loaded successfully.');
    } catch (error) {
        console.error('Error loading levels:', error);
        showStatus('Unable to load AREDL data. Try again later.', 'error');
    }
}

function normalize(text) {
    return text.trim().toLowerCase();
}

function getStoredLevelIds() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveSelectedLevels() {
    try {
        const ids = selectedLevels.map(level => level.level_id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
        // ignore storage errors
    }
}

function findLevelByName(name) {
    const search = normalize(name);
    return levels.find(level => normalize(level.name) === search);
}

function searchLevels(query) {
    const search = normalize(query);
    if (!search) return [];

    return levels
        .filter(level => normalize(level.name).includes(search) && !selectedLevels.some(item => item.level_id === level.level_id))
        .slice(0, 6);
}

function formatPoints(rawPoints) {
    return (Number(rawPoints) / 10).toFixed(1);
}

function ordinalSuffix(value) {
    const number = Number(value);
    const tens = number % 100;
    if (tens >= 11 && tens <= 13) return `${number}th`;
    switch (number % 10) {
        case 1: return `${number}st`;
        case 2: return `${number}nd`;
        case 3: return `${number}rd`;
        default: return `${number}th`;
    }
}

function renderSuggestions(matches) {
    suggestionsEl.innerHTML = '';

    if (!matches.length) {
        suggestionsEl.hidden = true;
        return;
    }

    matches.forEach(level => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'suggestion-item';
        item.innerHTML = `
            <span class="suggestion-name">${level.name}</span>
            <span class="suggestion-points">${formatPoints(level.points)} pts</span>
        `;

        item.addEventListener('click', () => {
            addLevel(level.name);
        });

        suggestionsEl.appendChild(item);
    });

    suggestionsEl.hidden = false;
}

function sortSelectedLevels() {
    selectedLevels.sort((a, b) => Number(b.points) - Number(a.points));
}

function renderLevels() {
    sortSelectedLevels();
    levelList.innerHTML = '';
    let totalPoints = 0;

    selectedLevels.forEach((level, index) => {
        totalPoints += Number(level.points) / 10;
        const card = document.createElement('article');
        card.className = 'level-card';
        card.style.backgroundImage = `url('${THUMBNAIL_BASE}/${level.level_id}.webp')`;

        const content = document.createElement('div');
        content.className = 'level-content';
        content.innerHTML = `
            <div class="level-info">
                <strong>${level.name}</strong>
                <p>${Array.isArray(level.tags) ? level.tags.join(' • ') : 'AREDL level'}</p>
            </div>
            <div class="level-meta">
                <div class="level-meta-top">
                    <span class="level-rank">${index === 0 ? 'Current hardest' : `Current ${ordinalSuffix(index + 1)} hardest`}</span>
                    <span class="level-position">AREDL #${level.position || 'N/A'}</span>
                    <span class="level-points">${formatPoints(level.points)} pts</span>
                    <button type="button" class="remove-btn" data-level-id="${level.level_id}">Remove</button>
                </div>
                <div class="level-meta-bottom">
                    <span class="level-id">ID: ${level.level_id}</span>
                </div>
            </div>
        `;

        card.appendChild(content);
        levelList.appendChild(card);
    });

    totalPointsEl.textContent = totalPoints.toFixed(1);
    totalCountEl.textContent = selectedLevels.length;
    saveSelectedLevels();
    attachRemoveHandlers();
}

function attachRemoveHandlers() {
    const buttons = document.querySelectorAll('.remove-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.levelId;
            handleRemoveLevel(id);
        });
    });
}

function handleRemoveLevel(levelId) {
    selectedLevels = selectedLevels.filter(level => String(level.level_id) !== String(levelId));
    renderLevels();
}

function clearAllLevels() {
    selectedLevels = [];
    renderLevels();
    showStatus('Cleared all completed levels.');
}

function showStatus(message, type = 'normal') {
    statusMessage.textContent = message;
    statusMessage.style.color = type === 'error' ? '#ff8a8b' : 'var(--muted)';
}

function addLevel(name) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const exact = findLevelByName(trimmedName);
    const level = exact || searchLevels(trimmedName)[0];
    if (!level) {
        showStatus(`Level not found: ${trimmedName}`, 'error');
        return;
    }

    const exists = selectedLevels.some(item => item.level_id === level.level_id);
    if (exists) {
        showStatus(`Level already added: ${level.name}`, 'error');
        return;
    }

    selectedLevels.push(level);
    renderLevels();
    showStatus(`Added ${level.name}`);
    levelInput.value = '';
    renderSuggestions([]);
}

addBtn.addEventListener('click', () => {
    addLevel(levelInput.value);
    levelInput.focus();
});

clearBtn.addEventListener('click', () => {
    clearAllLevels();
});

levelInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        addLevel(levelInput.value);
    }
});

levelInput.addEventListener('input', () => {
    const matches = searchLevels(levelInput.value);
    renderSuggestions(matches);
});

document.addEventListener('click', event => {
    if (!suggestionsEl.contains(event.target) && event.target !== levelInput) {
        renderSuggestions([]);
    }
});

loadLevels();