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

    if (file && message) {
        pendingSend = { to, message, file, type: 'encrypted' };
        showKeyModal();
    }
    else if (file) {
        sendImageWithMessage(to, null, file, null);
    }
    else if (message) {
        sendTextMessage(to, message);
    }
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
    const password = document.getElementById('encryptionKeyInput').value.trim();
    if (!password) {
        addSystemMessage("Encryption key cannot be empty!");
        return;
    }
    
    if (pendingSend) {
        const { to, message, file } = pendingSend;
        hideKeyModal();
        sendImageWithMessage(to, message, file, password);
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
function sendImageWithMessage(to, message, file, password) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        
        socket.emit("private_image", {
            from: myNick,
            to: to,
            image: bytes,
            hiddenMessage: message,
            password: password
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-sent';
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png"});
        const url = URL.createObjectURL(blob);
        
        let displayText = message && password
            ? `🔒 Image with encrypted message`
            : 'Sent image';
        
        messageDiv.innerHTML = `
            <div class="message-sender">You → ${to}</div>
            <div class="message-text">${displayText}</div>
            <img src="${url}" class="message-image">
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
    
    const bytes = new Uint8Array(data.image);
    const blob = new Blob([bytes], { type: "image/png"});
    const url = URL.createObjectURL(blob);
    
    let displayText = data.hasHiddenMessage
        ? `🔒 Right click on the image to check for a hidden message.`
        : 'Sent image';
    
    const imgId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    messageDiv.innerHTML = `
        <div class="message-sender">${data.from}</div>
        <div class="message-text">${displayText}</div>
        <img src="${url}" class="message-image" id="${imgId}" ${data.hasHiddenMessage ? `data-has-message="true"` : ''}>
    `;
    document.getElementById('chat').appendChild(messageDiv);
    
    // Store image bytes for extraction
    if (data.hasHiddenMessage) {
        const img = document.getElementById(imgId);
        img.imageBytes = bytes;
    }
    
    scrollToBottom();
});

// Context menu for images
document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('message-image')) {
        e.preventDefault();
        
        const hasMessage = e.target.getAttribute('data-has-message');
        if (hasMessage === 'true') {
            const contextMenu = document.getElementById('contextMenu');
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            
            currentImageData = {
                element: e.target,
                imageBytes: e.target.imageBytes
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
    const password = document.getElementById('decryptionKeyInput').value.trim();
    if (!password) {
        addSystemMessage("Decryption key cannot be empty!");
        return;
    }
    
    if (currentImageData && currentImageData.imageBytes) {
        // Send extraction request to server
        socket.emit('extract_message', {
            image: Array.from(currentImageData.imageBytes),
            password: password
        });
        
        hideDecryptModal();
    }
});

// Handle extraction response
socket.on('message_extracted', (data) => {
    if (data.success) {
        addSystemMessage(`🔓 Hidden message: "${data.message}"`);
    } else {
        addSystemMessage(`❌ Failed to decrypt: ${data.error}`);
    }
    currentImageData = null;
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