from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Prosta mapa: nick -> session_id
users = {}

@app.route('/')
def index():
    return render_template('index.html')

# Rejestracja użytkownika z nickiem
@socketio.on('register')
def handle_register(nick):
    users[nick] = request.sid
    emit('system_message', f'Zarejestrowano jako {nick}')

@socketio.on('private_image')
def handle_private_image(data):
    target = data['to']
    sender = data['from']
    image_bytes = data['image']

    target_sid = users.get(target)
    print(f"Sending image from {sender} to {target} (SID: {target_sid})")
    if target_sid:
        # Step 1: send metadata (who sent it)
        emit('receive_image', {'from': sender, 'image': image_bytes}, to=target_sid)

        # Step 2: send raw binary
        # emit('receive_image_bytes', image_bytes, to=target_sid, binary=True)
    else:
        emit('system_message', f'Użytkownik {target} nie jest dostępny')

# Wysyłanie wiadomości do wybranego nicka
@socketio.on('private_message')
def handle_private_message(data):
    target_nick = data['to']
    message = data['message']
    sender_sid = request.sid
    
    # Szukamy sesji odbiorcy
    target_sid = users.get(target_nick)
    if target_sid:
        emit('receive_message', {'from': data['from'], 'message': message}, to=target_sid)
        emit('system_message', f'Wysłano wiadomość do {target_nick}')
    else:
        emit('system_message', f'Użytkownik {target_nick} nie jest dostępny')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
