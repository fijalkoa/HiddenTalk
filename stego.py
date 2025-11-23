# stego_utils.py
import numpy as np
import cv2
import pywt
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import struct
import zlib

Q = 35  # quantization step

# ==========================
# AES ENCRYPTION
# ==========================
def aes_encrypt(message: str, key: bytes):
    cipher = AES.new(key, AES.MODE_CBC)
    ct = cipher.encrypt(pad(message.encode(), AES.block_size))
    return cipher.iv + ct

def aes_decrypt(ciphertext: bytes, key: bytes):
    iv = ciphertext[:16]
    ct = ciphertext[16:]
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ct), AES.block_size).decode()

# ==========================
# BIT HELPERS
# ==========================
def bytes_to_bits(data: bytes):
    return [(byte >> i) & 1 for byte in data for i in range(8)]

def bits_to_bytes(bits):
    data = bytearray()
    for b in range(0, len(bits), 8):
        byte = 0
        for i in range(8):
            if b + i < len(bits):
                byte |= (bits[b + i] << i)
        data.append(byte)
    return bytes(data)

# ==========================
# EMBEDDING
# ==========================
def embed_message_array(img_color: np.ndarray, output_path: str, message: str, key: bytes):
    ycrcb = cv2.cvtColor(img_color, cv2.COLOR_BGR2YCrCb)
    Y, Cr, Cb = cv2.split(ycrcb)
    img = Y.astype(np.float32)
    h, w = img.shape

    # Encrypt
    encrypted = aes_encrypt(message, key)

    # Build payload: [length | encrypted | CRC32]
    crc = zlib.crc32(encrypted)
    header = struct.pack("<I", len(encrypted))
    payload = header + encrypted + struct.pack("<I", crc)
    bits = bytes_to_bits(payload)

    # DWT
    cA, (cH, cV, cD) = pywt.dwt2(img, 'haar')
    channel = cA.copy()

    # Calculate max capacity
    max_blocks = (channel.shape[0] // 8) * (channel.shape[1] // 8)

    # Embed bits in 8x8 DCT blocks
    idx = 0
    for i in range(0, channel.shape[0], 8):
        for j in range(0, channel.shape[1], 8):
            if idx >= len(bits):
                break
            block = channel[i:i+8, j:j+8]
            if block.shape[0] < 8 or block.shape[1] < 8:
                continue
            dct_block = cv2.dct(block)
            ci, cj = 3, 3
            coef = dct_block[ci, cj]
            qval = int(np.round(coef / Q))
            bit = bits[idx]
            if bit == 1 and qval % 2 == 0:
                qval += 1
            elif bit == 0 and qval % 2 == 1:
                qval -= 1
            dct_block[ci, cj] = qval * Q
            channel[i:i+8, j:j+8] = cv2.idct(dct_block)
            idx += 1
        if idx >= len(bits):
            break

    if idx < len(bits):
        raise ValueError(f"Message too large for this image! Embedded {idx}/{len(bits)} bits")


    # Inverse DWT
    stego = pywt.idwt2((channel, (cH, cV, cD)), 'haar')
    stego_Y = np.clip(stego, 0, 255).astype(np.uint8)
    stego_ycrcb = cv2.merge([stego_Y, Cr, Cb])
    stego_bgr = cv2.cvtColor(stego_ycrcb, cv2.COLOR_YCrCb2BGR)
    cv2.imwrite(output_path, stego_bgr)
    return output_path

# ==========================
# EXTRACTION
# ==========================
def extract_message_from_array(img_color: np.ndarray, key: bytes):
    
    ycrcb = cv2.cvtColor(img_color, cv2.COLOR_BGR2YCrCb)
    Y, _, _ = cv2.split(ycrcb)
    img = Y.astype(np.float32)

    cA, (cH, cV, cD) = pywt.dwt2(img, 'haar')
    channel = cA.copy()
    h, w = channel.shape
    
    bits = []

    # Extract header first (32 bits = length)
    bit_count = 0
    for i in range(0, h, 8):
        for j in range(0, w, 8):
            block = channel[i:i+8, j:j+8]
            if block.shape[0] < 8 or block.shape[1] < 8:
                continue
            dct_block = cv2.dct(block)
            ci, cj = 3, 3
            coef = dct_block[ci, cj]
            qval = int(np.round(coef / Q))
            bits.append(qval % 2)
            bit_count += 1
            if bit_count == 32:
                break
        if bit_count == 32:
            break

    header_bytes = bits_to_bytes(bits[:32])
    length, = struct.unpack("<I", header_bytes)

    total_bits_needed = 32 + (length + 4) * 8
    
    bits = []
    bit_count = 0
    
    for i in range(0, h, 8):
        for j in range(0, w, 8):
            if bit_count >= total_bits_needed:
                break
            block = channel[i:i+8, j:j+8]
            if block.shape[0] < 8 or block.shape[1] < 8:
                continue
            dct_block = cv2.dct(block)
            ci, cj = 3, 3
            coef = dct_block[ci, cj]
            qval = int(np.round(coef / Q))
            bits.append(qval % 2)
            bit_count += 1
        if bit_count >= total_bits_needed:
            break


    # Parse the data
    all_bytes = bits_to_bytes(bits)
    header = all_bytes[:4]
    length_check, = struct.unpack("<I", header)
    
    encrypted = all_bytes[4:4+length]
    crc_bytes = all_bytes[4+length:4+length+4]
    
    if len(crc_bytes) < 4:
        raise ValueError(f"Not enough data for CRC. Got {len(crc_bytes)} bytes")
    
    crc_recv = struct.unpack("<I", crc_bytes)[0]
    crc_calc = zlib.crc32(encrypted)
    
    if crc_calc != crc_recv:
        raise ValueError(f"CRC mismatch — data corrupted! Expected {crc_recv}, got {crc_calc}")

    message = aes_decrypt(encrypted, key)
    return message