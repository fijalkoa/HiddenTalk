const socket = io();
let myNick = '';

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

// Send text message
document.getElementById('sendBtn').addEventListener('click', () => {
    const to = document.getElementById('toInput').value.trim();
    const message = document.getElementById('messageInput').value.trim();
    if (to && message) {
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
});

// Send image
function sendImage() {
    const file = document.getElementById('imgInput').files[0];
    if (!file) {
        addSystemMessage("Choose an image!");
        return;
    }

    const to = document.getElementById("toInput").value.trim();
    if (!to) {
        addSystemMessage("Enter recipient's nickname!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        
        socket.emit("private_image", {
            from: myNick,
            to: to,
            image: bytes
        });

        // Add to own chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-sent';
        const blob = new Blob([bytes], { type: "image/png"});
        const url = URL.createObjectURL(blob);
        messageDiv.innerHTML = `
            <div class="message-sender">You → ${to}</div>
            <div class="message-text">Sent image with steganography</div>
            <img src="${url}" class="message-image">
        `;
        document.getElementById('chat').appendChild(messageDiv);
        
        document.getElementById('imgInput').value = '';
        updateFileName();
        scrollToBottom();
    };
    reader.readAsArrayBuffer(file);
}

// Receive message
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

// Receive image
socket.on('receive_image', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-received';
    
    const blob = new Blob([data.image], { type: "image/png"});
    const url = URL.createObjectURL(blob);
    
    messageDiv.innerHTML = `
        <div class="message-sender">${data.from}</div>
        <div class="message-text">Sent image with steganography</div>
        <img src="${url}" class="message-image">
    `;
    document.getElementById('chat').appendChild(messageDiv);
    scrollToBottom();
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
document.getElementById('sendImgBtn').addEventListener('click', sendImage);

// Enter key to send
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('sendBtn').click();
    }
});