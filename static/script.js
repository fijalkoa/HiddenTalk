const socket = io();

let myNick = '';

document.getElementById('registerBtn').addEventListener('click', () => {
    const nick = document.getElementById('nickInput').value.trim();
    if (nick) {
        myNick = nick;
        socket.emit('register', nick);
    }
});

document.getElementById('sendBtn').addEventListener('click', () => {
    const to = document.getElementById('toInput').value.trim();
    const message = document.getElementById('messageInput').value.trim();
    if (to && message) {
        socket.emit('private_message', { from: myNick, to: to, message: message });
        document.getElementById('messageInput').value = '';
    }
});

const chat = document.getElementById('chat');

socket.on('receive_message', (data) => {
    const p = document.createElement('p');
    p.textContent = `${data.from}: ${data.message}`;
    chat.appendChild(p);
});

socket.on('system_message', (msg) => {
    const p = document.createElement('p');
    p.style.fontStyle = 'italic';
    p.textContent = `[SYSTEM] ${msg}`;
    chat.appendChild(p);
});

function sendImage() {
    const file = document.getElementById('imgInput').files[0];
    if (!file) return alert("Pick an image first!");

    const to = document.getElementById("toInput").value.trim();
    if (!to) return alert("Enter target nick!");

    const reader = new FileReader();

    reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        console.log(`Read ${bytes.length} bytes from file.`);
        console.log(bytes);
        
        // send everything in one object
        socket.emit("private_image", {
            from: myNick,
            to: to,
            image: bytes
        });
    };

    reader.readAsArrayBuffer(file);
}


// Make it available for HTML button
window.sendImage = sendImage;

socket.on('receive_image', (data) => {
    const p = document.createElement('p');
    p.textContent = `${data.from} sent an image:`;
    chat.appendChild(p);

    console.log('Received image metadata:', data);
    console.log('Image bytes:', data.image);
    const blob = new Blob([data.image], { type: "image/png"});
    const url = URL.createObjectURL(blob);

    const img = document.createElement('img');
    img.src = url;
    img.style.width = '200px';
    chat.appendChild(img);
});
