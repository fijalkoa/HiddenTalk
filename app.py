from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import numpy as np
import cv2
import hashlib
from dotenv import load_dotenv
import os
from stego import embed_message_array, extract_message_from_array

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'super-super-secret-key')
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10e6)

users = {}

def password_to_key(password: str) -> bytes:
    """Convert password string to 32-byte AES key using SHA-256"""
    return hashlib.sha256(password.encode()).digest()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('register')
def handle_register(nick):
    users[nick] = request.sid
    emit('system_message', f'Zarejestrowano jako {nick}')

@socketio.on('private_image')
def handle_private_image(data):
    target = data['to']
    sender = data['from']
    image_bytes = data['image']
    hidden_message = data.get('hiddenMessage', None)
    password = data.get('password', None)

    target_sid = users.get(target)
    print(f"Sending image from {sender} to {target} (SID: {target_sid})")
    
    if target_sid:
        if hidden_message and password:
            try:
                nparr = np.frombuffer(bytes(image_bytes), np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                key = password_to_key(password)
                
                success, buffer = cv2.imencode('.png', img)
                temp_bytes = buffer.tobytes()
                
                temp_input = '/tmp/input_image.png'
                temp_output = '/tmp/stego_image.png'
                cv2.imwrite(temp_input, img)
                
                embed_message_array(img, temp_output, hidden_message, key)
                
                with open(temp_output, 'rb') as f:
                    stego_bytes = f.read()
                
                emit('receive_image', {
                    'from': sender,
                    'image': list(stego_bytes),
                    'hasHiddenMessage': True
                }, to=target_sid)
                
                print(f"Successfully embedded message in image")
                
            except Exception as e:
                print(f"Error embedding message: {e}")
                emit('system_message', f'Błąd podczas ukrywania wiadomości: {str(e)}')
        else:
            emit('receive_image', {
                'from': sender,
                'image': image_bytes,
                'hasHiddenMessage': False
            }, to=target_sid)
    else:
        emit('system_message', f'Użytkownik {target} nie jest dostępny')

@socketio.on('extract_message')
def handle_extract_message(data):
    image_bytes = data['image']
    password = data['password']
    
    try:
        nparr = np.frombuffer(bytes(image_bytes), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        key = password_to_key(password)
        
        message = extract_message_from_array(img, key)
        
        emit('message_extracted', {'success': True, 'message': message})
        print(f"Successfully extracted message: {message}")
        
    except Exception as e:
        print(f"Error extracting message: {e}")
        emit('message_extracted', {'success': False, 'error': str(e)})

@socketio.on('private_message')
def handle_private_message(data):
    target_nick = data['to']
    message = data['message']
    sender_sid = request.sid
    
    target_sid = users.get(target_nick)
    if target_sid:
        emit('receive_message', {'from': data['from'], 'message': message}, to=target_sid)
        emit('system_message', f'Wysłano wiadomość do {target_nick}')
    else:
        emit('system_message', f'Użytkownik {target_nick} nie jest dostępny')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)