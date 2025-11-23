const socket = io();
let myNick = '';
let pendingSend = null;
let currentImageData = null;

// Update file name display
function updateFileName() {
    const input = document.getElementById('imgInput');
    const fileNameDisplay = document.getElementById('fileName');
    if (input.files.length > 0) {
        fileNameDisplay.textContent = `Selected: ${input.files[0].name}`;
    } else {
        fileNameDisplay.textContent = '';
    }
}

// Register user
document.getElementById('registerBtn').addEventListener('click', () => {
    const nick = document.getElementById('nickInput').value.trim();
    if (nick) {
        myNick = nick;
        socket.emit('register', nick);
        document.getElementById('statusText').textContent = 'Connected as ' + nick;
    }
});

// Unified send function
document.getElementById('sendBtn').addEventListener('click', () => {
    const to = document.getElementById('toInput').value.trim();
    const message = document.getElementById('messageInput').value.trim();
    const file = document.getElementById('imgInput').files[0];

    if (!to) {
        addSystemMessage("Enter recipient's nickname!");
        return;
    }

    // Case 1: Image with message (steganography) - prompt for encryption key
    if (file && message) {
        pendingSend = { to, message, file, type: 'encrypted' };
        showKeyModal();
    }
    // Case 2: Image without message
    else if (file) {
        sendImageWithMessage(to, null, file, null);
    }
    // Case 3: Text only
    else if (message) {
        sendTextMessage(to, message);
    }
    // Case 4: Nothing to send
    else {
        addSystemMessage("Enter a message or choose an image!");
    }
});

// Show encryption key modal
function showKeyModal() {
    const modal = document.getElementById('keyModal');
    const input = document.getElementById('encryptionKeyInput');
    modal.style.display = 'flex';
    input.value = '';
    input.focus();
}

// Hide encryption key modal
function hideKeyModal() {
    document.getElementById('keyModal').style.display = 'none';
    pendingSend = null;
}

// Confirm encryption key
document.getElementById('confirmKeyBtn').addEventListener('click', () => {
    const key = document.getElementById('encryptionKeyInput').value.trim();
    if (!key) {
        addSystemMessage("Encryption key cannot be empty!");
        return;
    }
    
    if (pendingSend) {
        const { to, message, file } = pendingSend;
        hideKeyModal();
        sendImageWithMessage(to, message, file, key);
    }
});

// Cancel encryption
document.getElementById('cancelKeyBtn').addEventListener('click', hideKeyModal);

// Enter key on encryption modal
document.getElementById('encryptionKeyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('confirmKeyBtn').click();
    }
});

// Simple encryption function (XOR-based, replace with proper crypto in production)
function encryptMessage(message, key) {
    let encrypted = '';
    for (let i = 0; i < message.length; i++) {
        encrypted += String.fromCharCode(message.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted); // Base64 encode
}

// Simple decryption function
function decryptMessage(encryptedMessage, key) {
    try {
        const encrypted = atob(encryptedMessage); // Base64 decode
        let decrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
            decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return decrypted;
    } catch (e) {
        return null;
    }
}

// Send text-only message
function sendTextMessage(to, message) {
    socket.emit('private_message', { from: myNick, to: to, message: message });
    
    // Add to own chat
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-sent';
    messageDiv.innerHTML = `
        <div class="message-sender">You → ${to}</div>
        <div class="message-text">${message}</div>
    `;
    document.getElementById('chat').appendChild(messageDiv);
    
    document.getElementById('messageInput').value = '';
    scrollToBottom();
}

// Send image with hidden message (if provided)
function sendImageWithMessage(to, message, file, key) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        
        let encryptedMessage = null;
        if (message && key) {
            encryptedMessage = encryptMessage(message, key);
        }
        
        socket.emit("private_image", {
            from: myNick,
            to: to,
            image: bytes,
            hiddenMessage: encryptedMessage
        });

        // Add to own chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-sent';
        const blob = new Blob([bytes], { type: "image/png"});
        const url = URL.createObjectURL(blob);
        
        let displayText = encryptedMessage 
            ? `🔒 Image with encrypted message`
            : 'Sent image';
        
        messageDiv.innerHTML = `
            <div class="message-sender">You → ${to}</div>
            <div class="message-text">${displayText}</div>
            <img src="${url}" class="message-image" ${encryptedMessage ? `data-encrypted="${encryptedMessage}"` : ''}>
        `;
        document.getElementById('chat').appendChild(messageDiv);
        
        document.getElementById('messageInput').value = '';
        document.getElementById('imgInput').value = '';
        updateFileName();
        scrollToBottom();
    };
    reader.readAsArrayBuffer(file);
}

// Receive text message
socket.on('receive_message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-received';
    messageDiv.innerHTML = `
        <div class="message-sender">${data.from}</div>
        <div class="message-text">${data.message}</div>
    `;
    document.getElementById('chat').appendChild(messageDiv);
    scrollToBottom();
});

// Receive image (with optional hidden message)
socket.on('receive_image', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-received';
    
    const blob = new Blob([data.image], { type: "image/png"});
    const url = URL.createObjectURL(blob);
    
    let displayText = data.hiddenMessage 
        ? `🔒 Image (may contain hidden message)`
        : 'Sent image';
    
    messageDiv.innerHTML = `
        <div class="message-sender">${data.from}</div>
        <div class="message-text">${displayText}</div>
        <img src="${url}" class="message-image" ${data.hiddenMessage ? `data-encrypted="${data.hiddenMessage}"` : ''}>
    `;
    document.getElementById('chat').appendChild(messageDiv);
    scrollToBottom();
});

// Context menu for images
document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('message-image')) {
        e.preventDefault();
        
        const encryptedMessage = e.target.getAttribute('data-encrypted');
        if (encryptedMessage) {
            const contextMenu = document.getElementById('contextMenu');
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            
            currentImageData = {
                element: e.target,
                encryptedMessage: encryptedMessage
            };
        }
    } else {
        document.getElementById('contextMenu').style.display = 'none';
    }
});

// Hide context menu on click elsewhere
document.addEventListener('click', () => {
    document.getElementById('contextMenu').style.display = 'none';
});

// Check for hidden message option
document.getElementById('checkMessageOption').addEventListener('click', () => {
    document.getElementById('contextMenu').style.display = 'none';
    if (currentImageData) {
        showDecryptModal();
    }
});

// Show decryption modal
function showDecryptModal() {
    const modal = document.getElementById('decryptModal');
    const input = document.getElementById('decryptionKeyInput');
    modal.style.display = 'flex';
    input.value = '';
    input.focus();
}

// Hide decryption modal
function hideDecryptModal() {
    document.getElementById('decryptModal').style.display = 'none';
}

// Confirm decryption
document.getElementById('confirmDecryptBtn').addEventListener('click', () => {
    const key = document.getElementById('decryptionKeyInput').value.trim();
    if (!key) {
        addSystemMessage("Decryption key cannot be empty!");
        return;
    }
    
    if (currentImageData) {
        const decrypted = decryptMessage(currentImageData.encryptedMessage, key);
        if (decrypted) {
            addSystemMessage(`🔓 Hidden message: "${decrypted}"`);
        } else {
            addSystemMessage("❌ Failed to decrypt. Wrong key or corrupted message.");
        }
        hideDecryptModal();
        currentImageData = null;
    }
});

// Cancel decryption
document.getElementById('cancelDecryptBtn').addEventListener('click', hideDecryptModal);

// Enter key on decryption modal
document.getElementById('decryptionKeyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('confirmDecryptBtn').click();
    }
});

// System messages
socket.on('system_message', (msg) => {
    addSystemMessage(msg);
});

function addSystemMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = msg;
    document.getElementById('chat').appendChild(messageDiv);
    scrollToBottom();
}

function scrollToBottom() {
    const chat = document.getElementById('chat');
    chat.scrollTop = chat.scrollHeight;
}

// Event listeners
document.getElementById('imgInput').addEventListener('change', updateFileName);

// Enter key to send
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('sendBtn').click();
    }
});