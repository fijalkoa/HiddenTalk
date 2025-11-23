# 🔒 HiddenTalk

**Steganographic Messenger with End-to-End Encryption**

A real-time messaging application that combines steganography and AES-256 encryption to hide messages within images. Send encrypted communications that look like innocent image exchanges to the untrained eye.

---

## ✨ Features

- **AES-256 Encryption** - Military-grade encryption for your messages  
- **Steganography** - Hide encrypted messages inside images using DWT + DCT  
- **Real-time Messaging** - WebSocket-based instant communication  
- **Modern UI** - Beautiful glassmorphic interface with smooth animations

---

## 🎨 UI Preview

The application features a split-panel design with a dark sidebar for user management and a vibrant chat area with gradient accents.

#### Main chat view
The core interface displays all active conversations with a clean, modern layout featuring real-time message updates and status indicators.
![Screenshot of the main chat view](/assets/MainChat.png)

#### Seding image with hidden message
Seamlessly embed encrypted messages into images using an intuitive workflow. Password-protected encryption ensures your secrets stay hidden.
![Screenshot of sending hidden message](/assets/SendSecretMessage.png)


#### Receiving image with hidden message
Receive steganographic images and decrypt hidden messages with just a right-click. The 🔒 indicator shows which images contain encrypted content.
![Screenshot of sending hidden message](/assets/GetSecretMessage.png)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Docker (optional)
- pip

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/hiddentalk.git
cd hiddentalk
```

2. **Create environment file**
```bash
cp .env.template .env
# Edit .env and add your SECRET_KEY
echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')" > .env
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the application**
```bash
python app.py
```

The application will start at `http://localhost:5000`

---

## 🐳 Docker Setup

1. **Build the image**
```bash
docker build -t hiddentalk .
```

2. **Run the container**
```bash
docker run -p 5000:5000 --env-file .env hiddentalk
```

---

## 📖 How to Use

### Step 1: Connect
1. Enter your nickname in the sidebar
2. Click **Connect** to register on the network

### Step 2: Send a Regular Message
1. Enter recipient's nickname
2. Type your message
3. Click **Send**

### Step 3: Send an Encrypted Image
1. Enter recipient's nickname
2. Type your secret message
3. Click **Choose image** to select an image file
4. Click **Send**
5. When prompted, enter an encryption password
6. Your message is now hidden inside the image!

### Step 4: Decrypt a Message
1. Right-click on an image that contains a hidden message (marked with 🔒)
2. Select **Check for hidden message**
3. Enter the decryption password
4. The hidden message will appear in the chat

---

## 🔧 Technical Architecture

### Backend Stack
```
Flask + Flask-SocketIO (WebSocket communication)
NumPy & OpenCV (Image processing)
PyWavelets (Discrete Wavelet Transform)
PyCryptodome (AES encryption)
```

### Encryption Flow
```
User Message
    ↓
[AES-256 Encryption with password]
    ↓
[Payload: Length + Encrypted + CRC32]
    ↓
[Bit extraction: Convert bytes to bits]
    ↓
[DWT Decomposition on Y channel]
    ↓
[DCT Transform on 8×8 blocks]
    ↓
[Embed bits in quantized coefficients]
    ↓
[Inverse transforms & Image reconstruction]
    ↓
Steganographic Image
```

### Decryption Flow
```
Steganographic Image
    ↓
[DWT & DCT decomposition]
    ↓
[Extract bits from coefficients]
    ↓
[Reconstruct: Length + Encrypted + CRC32]
    ↓
[CRC32 verification]
    ↓
[AES-256 Decryption with password]
    ↓
Original Message
```

---

## 📁 Project Structure

```
hiddentalk/
├── app.py                    # Flask application & SocketIO handlers
├── stego.py                  # Steganography implementation
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker configuration
├── .env.template            # Environment template
├── .gitignore               # Git ignore rules
│
├── templates/
│   └── index.html           # Main HTML interface
│
└── static/
    ├── script.js            # Client-side logic & SocketIO events
    └── styles.css           # Modern UI styling
```

---

## 🔐 Security Details

### Message Encryption
- **Algorithm**: AES-256 in CBC mode
- **Key Derivation**: SHA-256 hash of user password
- **IV**: Random 16 bytes per encryption
- **Padding**: PKCS7

### Steganography Algorithm
- **Transform**: Discrete Wavelet Transform (Haar) + Discrete Cosine Transform
- **Capacity**: Depends on image resolution (1 bit per 8×8 block)
- **Robustness**: CRC32 checksum validates extracted data

### Data Integrity
- CRC32 checksum embedded with encrypted message
- Automatic validation on extraction
- Error reporting if data is corrupted

---


<div align="center">

**[⬆ Back to Top](#-hiddentalk)**

</div>