// dashboard.js

// Function to fetch user storage information
async function fetchUserStorage() {
    try {
        const response = await fetch('/api/storage');
        const storageData = await response.json();
        displayStorageInfo(storageData);
    } catch (error) {
        console.error('Error fetching storage information:', error);
    }
}

// Function to display storage information
function displayStorageInfo(data) {
    const storageInfoContainer = document.getElementById('storage-info');
    storageInfoContainer.innerHTML = `Total Storage: ${data.total} MB, Used Storage: ${data.used} MB`;
}

// Function to fetch and display files list
async function fetchFilesList() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        displayFiles(files);
    } catch (error) {
        console.error('Error fetching files list:', error);
    }
}

// Function to display files list
function displayFiles(files) {
    const filesListContainer = document.getElementById('files-list');
    filesListContainer.innerHTML = files.map(file => `<li>${file.name} (${file.size} MB)</li>`).join('');
}

// Initial function calls
fetchUserStorage();
fetchFilesList();