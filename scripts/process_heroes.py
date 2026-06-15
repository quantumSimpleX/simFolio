"""Face-detect, square-crop, grayscale and resize hero source photos to 256x256 JPG.

Consistent look: the detected face is scaled so it occupies a fixed fraction of the
frame and is positioned slightly above centre (classic headshot framing). Files with
no detected face are reported so a different source photo can be chosen.
"""
import os, sys, glob
import cv2
import numpy as np
from PIL import Image

SRC = "/tmp/herosrc"
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "public", "heroes")
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)

SIZE = 256
HEAD_EXPAND = 1.5     # fallback: square side = head bbox * this (when no landmarks)
HEAD_VOFFSET = 0.05   # fallback: shift centre down slightly
EYE_Y = 0.39          # eye line sits at this fraction from the crop top
MOUTH_Y = 0.675       # mouth sits here -> eye->mouth span (28.5%) sets the head SIZE

# Tone targets so every portrait reads as if shot by the same photographer.
TARGET_MEAN = 150.0   # overall lightness (0-255)
TARGET_STD = 46.0     # contrast (spread of tones)


def normalize_tone(gray):
    """Match brightness + contrast to fixed targets, metered on the central
    face region so dark/bright backgrounds don't skew the exposure."""
    import numpy as np
    g = gray.astype(np.float32)
    h, w = g.shape
    m = int(min(h, w) * 0.30)          # central ~40% window = the face
    cy, cx = h // 2, w // 2
    center = g[cy - m:cy + m, cx - m:cx + m]
    mean, std = float(center.mean()), float(center.std())
    if std < 1e-3:
        std = 1e-3
    g = (g - mean) * (TARGET_STD / std) + TARGET_MEAN
    return np.clip(g, 0, 255).astype(np.uint8)

_MODEL = os.path.join(os.path.dirname(__file__), "models", "yunet.onnx")
_yunet = cv2.FaceDetectorYN.create(_MODEL, "", (320, 320), 0.6, 0.3, 5000)
# haar face box only used as a last-resort fallback when YuNet finds nothing
_haar = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def detect_yunet(img):
    """Return (right_eye, left_eye, face_box) using YuNet 5-point landmarks,
    picking the highest-scoring face. None if nothing is found. Detection runs on
    a copy scaled so the long side is ~1024px (YuNet is unreliable at very large
    resolutions); landmarks are scaled back to full-resolution coordinates."""
    H, W = img.shape[:2]
    scale = 1024.0 / max(H, W) if max(H, W) > 1024 else 1.0
    small = cv2.resize(img, (int(round(W * scale)), int(round(H * scale)))) if scale != 1.0 else img
    sh, sw = small.shape[:2]
    _yunet.setInputSize((sw, sh))
    _, faces = _yunet.detect(small)
    if faces is None or len(faces) == 0:
        return None
    f = max(faces, key=lambda r: r[14])          # best confidence
    s = 1.0 / scale
    r_eye = (float(f[4]) * s, float(f[5]) * s)   # subject's right eye (image-left)
    l_eye = (float(f[6]) * s, float(f[7]) * s)   # subject's left eye  (image-right)
    r_mouth = (float(f[10]) * s, float(f[11]) * s)
    l_mouth = (float(f[12]) * s, float(f[13]) * s)
    mouth = ((r_mouth[0] + l_mouth[0]) / 2.0, (r_mouth[1] + l_mouth[1]) / 2.0)
    return r_eye, l_eye, mouth

def detect_haar_box(gray):
    faces = _haar.detectMultiScale(gray, 1.1, 6, minSize=(60, 60))
    if len(faces) == 0:
        faces = _haar.detectMultiScale(gray, 1.05, 4, minSize=(40, 40))
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])

def process(path):
    img = cv2.imread(path)
    if img is None:  # Pillow fallback for odd formats
        pil = Image.open(path).convert("RGB")
        img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    H, W = img.shape[:2]
    det = detect_yunet(img)

    if det is not None:
        # Facial-landmark alignment: rotate so the eyes are level, scale by the
        # eye->mouth distance (a vertical facial measure), then place the eye line
        # at EYE_Y and the mouth at MOUTH_Y. This pins BOTH the eyes and the mouth
        # to the same spot for every hero, regardless of face length, without
        # distorting any face (uniform scale only).
        r_eye, l_eye, mouth = det
        eye_mid = ((r_eye[0] + l_eye[0]) / 2.0, (r_eye[1] + l_eye[1]) / 2.0)
        dx, dy = (l_eye[0] - r_eye[0]), (l_eye[1] - r_eye[1])
        angle = np.degrees(np.arctan2(dy, dx))        # roll of the eye line
        # rotate the whole image about the eye midpoint to level the eyes
        M = cv2.getRotationMatrix2D(eye_mid, angle, 1.0)
        img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_REPLICATE)
        # mouth in the rotated frame
        mr = M @ np.array([mouth[0], mouth[1], 1.0])
        mouth_y = float(mr[1]); mouth_x = float(mr[0])
        eye_mouth = abs(mouth_y - eye_mid[1])         # vertical eye->mouth distance
        side = int(round(eye_mouth / (MOUTH_Y - EYE_Y)))
        # centre horizontally on the eye-line / mouth midpoint so faces turned to
        # the side still sit centred (the facial mid-axis, not just the eyes)
        cx = (eye_mid[0] + mouth_x) / 2.0
        cy = eye_mid[1] + side * (0.5 - EYE_Y)        # eyes sit at EYE_Y of the crop
        mode = "eyes"
    else:
        gray_full = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face = detect_haar_box(gray_full)
        if face is None:
            return None, (W, H), "none"
        fx, fy, fw, fh = face
        cx = fx + fw / 2.0
        cy = fy + fh / 2.0 + fh * HEAD_VOFFSET
        side = int(round(max(fw, fh) * HEAD_EXPAND))
        mode = "box"

    half = side // 2
    left = int(round(cx)) - half
    top = int(round(cy)) - half
    # Centred square crop. Pad the SOURCE by edge-replication so the box is always
    # in-bounds -> head stays centred and the same size (no clamping/shift, no bars).
    pad_l = max(0, -left); pad_t = max(0, -top)
    pad_r = max(0, (left + side) - img.shape[1])
    pad_b = max(0, (top + side) - img.shape[0])
    if pad_l or pad_t or pad_r or pad_b:
        img = cv2.copyMakeBorder(img, pad_t, pad_b, pad_l, pad_r, cv2.BORDER_REPLICATE)
        left += pad_l; top += pad_t
    crop = img[top:top + side, left:left + side]
    # grayscale, tone-normalize, resize to 256 square
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = normalize_tone(gray)
    pil = Image.fromarray(gray).resize((SIZE, SIZE), Image.LANCZOS)
    return pil, (W, H), mode

def main():
    paths = sorted(glob.glob(os.path.join(SRC, "*")))
    if len(sys.argv) > 1:
        paths = [p for p in paths if os.path.splitext(os.path.basename(p))[0] in sys.argv[1:]]
    no_face = []; box_fallback = []
    for p in paths:
        hid = os.path.splitext(os.path.basename(p))[0]
        out, (W, H), mode = process(p)
        if out is None:
            print(f"NO FACE   {hid:14} src {W}x{H}")
            no_face.append(hid); continue
        dst = os.path.join(OUT, hid + ".jpg")
        out.save(dst, "JPEG", quality=88, optimize=True)
        print(f"OK [{mode:4}] {hid:14} src {W}x{H}")
        if mode == "box":
            box_fallback.append(hid)
    print("\nNO FACE:", no_face or "none")
    print("BOX FALLBACK (no eyes found):", box_fallback or "none")

if __name__ == "__main__":
    main()
