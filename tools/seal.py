"""개인 결과 데이터를 AES-256-GCM으로 잠근다. assets/crypto.js 가 브라우저에서 푼다.

- 학생마다 새 열쇠(32바이트)와 새 파일 ID(16바이트)를 무작위로 만든다. 참여 번호와 무관하다.
- 링크: {base}/r/#i={파일ID}&k={열쇠}. # 뒷부분은 브라우저가 서버로 보내지 않는다.
- 서버에는 d/{파일ID}.bin (암호문)만 올라간다.
"""
import base64
import json
import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def seal(payload):
    """payload(dict) -> (파일ID, 열쇠, 암호문 바이트)"""
    key = secrets.token_bytes(32)
    nonce = secrets.token_bytes(12)
    data = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
    blob = nonce + AESGCM(key).encrypt(nonce, data, None)
    return secrets.token_hex(16), b64url(key), blob


def link(base, file_id, key):
    return f"{base.rstrip('/')}/r/#i={file_id}&k={key}"


def write_sealed(out_dir, payload):
    file_id, key, blob = seal(payload)
    os.makedirs(os.path.join(out_dir, "d"), exist_ok=True)
    with open(os.path.join(out_dir, "d", f"{file_id}.bin"), "wb") as fp:
        fp.write(blob)
    return file_id, key
