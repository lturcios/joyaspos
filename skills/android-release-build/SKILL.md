---
name: android-release-build
description: |
  Guía completa para generar el APK de release firmado de JoyasPOS para el Sunmi
  V2SE: configuración de signingConfigs en Gradle Kotlin DSL, buildTypes.release
  con R8/ProGuard, variables de producción vía BuildConfig (URL de la API en
  local.properties), generación del keystore, comando assembleRelease, instalación
  en dispositivo Sunmi vía ADB, y checklist pre-release. Usar al generar el APK
  de producción por primera vez, al actualizar el APK en los dispositivos Sunmi,
  o al depurar problemas de firma o instalación. Depende de SKILL-10
  (android-project-structure) y de que la API esté desplegada (SKILL-31).
---

# SKILL-33 — Android Release Build (apps/mobile)

## Objetivo
Generar `app-release.apk` firmado, listo para instalar en los dispositivos
Sunmi V2SE del negocio.

---

## 1. Generar el Keystore (solo la primera vez)

```bash
# En tu máquina de desarrollo (no en el VPS)
# El keystore debe guardarse de forma segura y NO commitearse al repo

keytool -genkey -v \
  -keystore joyaspos-release.keystore \
  -alias joyaspos \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# El comando pedirá:
# - Contraseña del keystore (guardar en un gestor de contraseñas)
# - Nombre, organización, localidad, país
# - Contraseña del alias (puede ser la misma que la del keystore)

# Mover el keystore a una ubicación segura fuera del repo
# Recomendado: ~/keystores/joyaspos-release.keystore
mv joyaspos-release.keystore ~/keystores/
```

> ⚠️ **NUNCA commitear el `.keystore` al repositorio Git.** Si se pierde,
> no se puede actualizar la app en los dispositivos que ya la tienen instalada.

---

## 2. Configurar `local.properties` (no se commitea)

```properties
# apps/mobile/local.properties
sdk.dir=/Users/tuusuario/Library/Android/sdk    # macOS
# sdk.dir=C:\\Users\\tuusuario\\AppData\\Local\\Android\\sdk  # Windows

# URL de la API de producción
API_BASE_URL=https://api.tudominio.com

# Datos del keystore (para el build de release)
KEYSTORE_PATH=/Users/tuusuario/keystores/joyaspos-release.keystore
KEYSTORE_PASSWORD=tu_password_del_keystore
KEY_ALIAS=joyaspos
KEY_PASSWORD=tu_password_del_alias
```

---

## 3. Configurar `signingConfigs` en Gradle

### `app/build.gradle.kts` — sección signingConfigs y buildTypes
```kotlin
import java.util.Properties

// Leer local.properties
val localProps = rootProject.file("local.properties")
    .takeIf { it.exists() }
    ?.let { Properties().apply { load(it.inputStream()) } }

android {
    namespace = "com.ltsoft.joyaspos"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ltsoft.joyaspos"
        minSdk = 28
        targetSdk = 34
        versionCode = 1        // Incrementar en cada release
        versionName = "1.0.0"  // Versión legible

        // URL de la API desde local.properties
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"${localProps?.getProperty("API_BASE_URL") ?: "http://10.0.2.2:3000"}\""
        )
    }

    // ── Firma de release ─────────────────────────────────────────────────────
    signingConfigs {
        create("release") {
            storeFile = localProps?.getProperty("KEYSTORE_PATH")
                ?.let { file(it) }
            storePassword = localProps?.getProperty("KEYSTORE_PASSWORD")
            keyAlias = localProps?.getProperty("KEY_ALIAS")
            keyPassword = localProps?.getProperty("KEY_PASSWORD")
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
            applicationIdSuffix = ".debug"    // Permite tener debug y release instalados a la vez
            versionNameSuffix = "-debug"
        }

        release {
            isMinifyEnabled = true            // Activa R8 (minificación + ofuscación)
            isShrinkResources = true          // Elimina recursos no usados
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    // ... resto de la configuración
}
```

---

## 4. Reglas ProGuard para las dependencias del proyecto

### `app/proguard-rules.pro`
```proguard
# ── Retrofit + OkHttp ──────────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# ── Moshi ──────────────────────────────────────────────────────────────────────
-keepclassmembers class * {
    @com.squareup.moshi.* <methods>;
}
-keep @com.squareup.moshi.JsonClass class * { *; }
-keep class com.squareup.moshi.** { *; }

# ── Room ───────────────────────────────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keep @androidx.room.Dao class *

# ── Hilt / Dagger ──────────────────────────────────────────────────────────────
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keepclassmembers class * {
    @javax.inject.Inject <init>(...);
}

# ── WorkManager ────────────────────────────────────────────────────────────────
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.CoroutineWorker
-keepclassmembers class * extends androidx.work.Worker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# ── Sunmi SDK ──────────────────────────────────────────────────────────────────
-keep class com.sunmi.** { *; }
-dontwarn com.sunmi.**

# ── DataStore ──────────────────────────────────────────────────────────────────
-keep class androidx.datastore.** { *; }

# ── DTOs de red — mantener nombres para Moshi ──────────────────────────────────
-keep class com.ltsoft.joyaspos.data.remote.dto.** { *; }

# ── Kotlin Coroutines ──────────────────────────────────────────────────────────
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}
```

---

## 5. Generar el APK de release

```bash
# Desde la raíz del proyecto Android (apps/mobile)
cd apps/mobile

# Limpiar builds anteriores
./gradlew clean

# Generar APK de release
./gradlew assembleRelease

# El APK quedará en:
ls app/build/outputs/apk/release/
# app-release.apk
```

---

## 6. Verificar el APK antes de distribuir

```bash
# Verificar que está firmado correctamente
jarsigner -verify -verbose -certs \
  app/build/outputs/apk/release/app-release.apk

# Ver información del APK
aapt dump badging app/build/outputs/apk/release/app-release.apk | \
  grep -E "package|version|sdkVersion"
```

---

## 7. Instalar en el Sunmi V2SE via ADB

```bash
# Conectar el Sunmi por USB y habilitar depuración USB en el dispositivo:
# Ajustes → Acerca del dispositivo → Número de compilación (tocar 7 veces)
# Ajustes → Opciones de desarrollador → Depuración USB = ON

# Verificar que el dispositivo es reconocido
adb devices
# Debe mostrar algo como: 123456789ABCDEF  device

# Instalar el APK
adb install -r app/build/outputs/apk/release/app-release.apk
# -r = reinstalar si ya existe una versión anterior

# Si hay varios dispositivos conectados, especificar por serial:
adb -s 123456789ABCDEF install -r app-release.apk

# Verificar que la app está instalada
adb shell pm list packages | grep joyaspos
# → package:com.ltsoft.joyaspos
```

---

## 8. Actualizar la app en dispositivos ya instalados

Para actualizaciones, solo cambiar `versionCode` (obligatorio, entero creciente)
y opcionalmente `versionName` (legible para el usuario):

```kotlin
// En defaultConfig — antes de cada release:
versionCode = 2          // Incrementar desde el anterior
versionName = "1.1.0"
```

Luego repetir `./gradlew assembleRelease` y `adb install -r`.

---

## 9. Checklist pre-release

- [ ] `versionCode` incrementado respecto al release anterior
- [ ] `versionName` actualizado a la versión correspondiente
- [ ] `API_BASE_URL` en `local.properties` apunta a `https://api.tudominio.com` (producción)
- [ ] El keystore está disponible en la ruta indicada en `local.properties`
- [ ] `./gradlew clean assembleRelease` completó sin errores
- [ ] `jarsigner -verify` confirma que el APK está firmado
- [ ] Probado en el Sunmi V2SE real:
  - [ ] Login con usuario de producción funciona
  - [ ] Lista de productos carga desde la API de producción
  - [ ] Se puede registrar una venta online
  - [ ] Se puede registrar una venta offline y se sincroniza al reconectar
  - [ ] El recibo se imprime correctamente
  - [ ] La impresión funciona en caso de venta offline (con ID `#L-xxx`)

---

## 10. Troubleshooting común

### `INSTALL_FAILED_VERSION_DOWNGRADE`
**Causa:** se intenta instalar un `versionCode` menor al instalado.
**Solución:** incrementar `versionCode` o desinstalar la versión anterior:
```bash
adb uninstall com.ltsoft.joyaspos
adb install app-release.apk
```

### `INSTALL_FAILED_INVALID_APK`
**Causa:** el APK no está firmado correctamente.
**Solución:** verificar que `signingConfig = signingConfigs.getByName("release")` está en `buildTypes.release` y que el keystore existe en la ruta indicada.

### La app crashea al iniciar en release pero funciona en debug
**Causa:** R8 ofuscó alguna clase que necesita sus nombres originales (ej: DTOs de Moshi).
**Solución:** agregar regla `-keep class com.ltsoft.joyaspos.data.remote.dto.** { *; }` en `proguard-rules.pro`.

### `cleartext traffic to ... not permitted`
**Causa:** la app intenta conectarse a HTTP en lugar de HTTPS.
**Solución:** verificar que `API_BASE_URL` en `local.properties` usa `https://` y no `http://`. En release, `usesCleartextTraffic` está deshabilitado por defecto (correcto).
