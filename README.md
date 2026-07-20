# Tennessee Leaders Action Platform — Sitio

Sitio estático (HTML/CSS/JS) con tres secciones:

- **Action Plans** — presentaciones PDF/PPT de las zonas 2–8.
- **Media & Press Release** — comunicado de prensa y artículo (Word).
- **Chat** — registro de usuarios (nombre, correo, clave) y chat grupal + mensajes privados, usando Firebase (Auth + Firestore).

## 1. Crear el proyecto de Firebase (gratis)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y crea un proyecto nuevo.
2. En **Build → Authentication → Sign-in method**, habilita el proveedor **Email/Password**.
3. En **Build → Firestore Database**, crea una base de datos (modo producción).
4. En **Firestore → Rules**, pega el contenido de [`firestore.rules`](firestore.rules) de este repo y publica.
5. En **Configuración del proyecto (ícono de engranaje) → Tus apps**, agrega una app **Web** (`</>`) y copia el objeto `firebaseConfig`.
6. Pega esos valores en [`js/firebase-config.js`](js/firebase-config.js), reemplazando los `REEMPLAZA_...`.

Estas claves de `firebaseConfig` **no son secretas** — están hechas para ir en el frontend; la seguridad real la dan las reglas de Firestore/Auth del paso 4.

## 2. Subir el sitio a GitHub

```bash
cd tlap-site
git init
git add .
git commit -m "Sitio TLAP: action plans, press release y chat"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

## 3. Activar GitHub Pages

1. En tu repositorio en GitHub, ve a **Settings → Pages**.
2. En "Build and deployment", elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Guarda. En unos minutos el sitio queda publicado en `https://<tu-usuario>.github.io/<tu-repo>/`.

## Notas

- La presentación **Zone 6 Presentation.pptx** (136 MB) supera el límite de 100 MB de GitHub, así que en `action-plans.html` queda enlazada directamente a Google Drive en vez de alojarse en el repositorio.
- El visor de Word en "Media & Press Release" (Office Online) solo funciona una vez el sitio esté publicado públicamente (no en `localhost`).
- Cualquier persona con el link puede crear una cuenta de chat; si más adelante quieres restringir el acceso (ej. solo correos de tu organización), se puede agregar validación extra en las reglas de Firestore o en el formulario de registro.
