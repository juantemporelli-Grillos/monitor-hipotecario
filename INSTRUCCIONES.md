# 🏠 Monitor Hipotecario Argentina
## Guía de publicación — sin conocimientos técnicos

---

## ¿Qué hace este sitio?

- Muestra los **10 mejores créditos hipotecarios UVA** de Argentina, ordenados por tasa
- Muestra el **ratio UVA/dólar en tiempo real** con gráfico histórico de 20 años
- Se actualiza automáticamente cada 30 minutos **sin que hagas nada**
- Datos de fuentes públicas gratuitas: BCRA (UVA) + DolarAPI (dólar)
- **Sin costo de hosting** — Vercel lo aloja gratis

---

## PASO 1 — Crear cuenta en GitHub (5 minutos)

1. Ir a **github.com**
2. Hacer clic en "Sign up"
3. Ingresar email, contraseña y usuario (ej: `monitor-hipotecario`)
4. Verificar el email

---

## PASO 2 — Subir los archivos (10 minutos)

1. En GitHub, hacer clic en el botón verde **"New"** (nuevo repositorio)
2. Nombre del repositorio: `monitor-hipotecario`
3. Dejarlo en **Public** ✅
4. Hacer clic en **"Create repository"**
5. En la página del repo vacío, hacer clic en **"uploading an existing file"**
6. **Arrastrar toda la carpeta** `monitor-hipotecario` a la ventana
7. Hacer clic en **"Commit changes"**

---

## PASO 3 — Publicar en Vercel (5 minutos)

1. Ir a **vercel.com**
2. Hacer clic en **"Sign Up"** → **"Continue with GitHub"**
3. Autorizar a Vercel
4. Hacer clic en **"Add New Project"**
5. Seleccionar el repo `monitor-hipotecario`
6. Vercel detecta automáticamente que es Next.js ✅
7. Hacer clic en **"Deploy"**
8. Esperar 2 minutos → ¡listo!

🎉 Tu sitio queda publicado en una URL tipo:
**`https://monitor-hipotecario.vercel.app`**

---

## Cómo actualizar las tasas de los bancos

Las tasas no cambian todos los días. Cuando quieras actualizarlas:

1. Ir a tu repo en GitHub
2. Abrir la carpeta `data` → archivo `banks.json`
3. Hacer clic en el ícono del lápiz ✏️ (editar)
4. Cambiar el valor de `"tna"` del banco que corresponda
5. Hacer clic en **"Commit changes"**
6. Vercel republica automáticamente en 2 minutos ✅

### Campos que podés modificar fácilmente:
- `"tna"` → la tasa anual (número, ej: `6.5`)
- `"plazo"` → años máximos
- `"financiacion"` → % que financia el banco
- `"ventaja"` → texto descriptivo
- `"ultima_actualizacion"` → fecha en formato `"2026-03-28"`

---

## Datos que se actualizan solos (sin tocar nada)

| Dato | Fuente | Frecuencia |
|------|--------|-----------|
| Valor de la UVA | BCRA (público) | Diario |
| Precio del dólar oficial | DolarAPI (público) | En tiempo real |
| Ratio UVA/USD | Calculado automáticamente | En tiempo real |

---

## Preguntas frecuentes

**¿Tiene costo?**
No. GitHub y Vercel tienen planes gratuitos más que suficientes para este tipo de sitio.

**¿Puedo personalizar el nombre o dominio?**
Sí. Vercel te permite conectar un dominio propio (ej: `monitorhipotecario.com.ar`) desde el panel de Vercel → "Domains".

**¿Qué pasa si una API está caída?**
El sitio muestra los últimos datos conocidos y un aviso de advertencia. No se rompe.

**¿Lo puede ver todo el mundo?**
Sí. Es un sitio público, accesible desde cualquier dispositivo o país.

---

## Soporte

Si algo no funciona, revisá que:
1. Los archivos estén todos subidos (incluyendo la carpeta `data/` y `pages/`)
2. El repo sea **público** (no privado)
3. En Vercel el "Framework Preset" diga **Next.js**

---

*Monitor Hipotecario Argentina · Datos: BCRA + DolarAPI · Uso orientativo.*
