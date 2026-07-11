import java.util.Properties
val localProps = project.rootProject.file("local.properties")
    .takeIf { it.exists() }
    ?.let { file ->
        Properties().apply {
            load(file.inputStream())
        }
    }

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.ltsoft.joyaspos"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ltsoft.joyaspos"
        minSdk = 28
        targetSdk = 34
        versionCode = 2
        versionName = "1.1.0"

        buildConfigField(
            "String", "API_BASE_URL",
            "\"${localProps?.getProperty("API_BASE_URL") ?: "http://192.168.1.100:3000"}\""
        )
    }

    signingConfigs {
        create("release") {
            val keystoreFile = localProps?.getProperty("KEYSTORE_FILE")
            val keystorePassword = localProps?.getProperty("KEYSTORE_PASSWORD")
            val keyAlias = localProps?.getProperty("KEY_ALIAS")
            val keyPassword = localProps?.getProperty("KEY_PASSWORD")

            if (!keystoreFile.isNullOrBlank() && !keystorePassword.isNullOrBlank()
                && !keyAlias.isNullOrBlank() && !keyPassword.isNullOrBlank()
            ) {
                storeFile = file(keystoreFile)
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
        aidl = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.13"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // Room schema export location — required by SKILL-11
    kapt {
        arguments {
            arg("room.schemaLocation", "$projectDir/schemas")
        }
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Compose BOM
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.compose.activity)
    debugImplementation(libs.compose.ui.tooling)

    // Navigation
    implementation(libs.navigation.compose)
    implementation(libs.hilt.navigation.compose)

    // Lifecycle
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Hilt
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.hilt.work)
    kapt(libs.hilt.work.compiler)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    kapt(libs.room.compiler)

    // Retrofit + OkHttp + Moshi
    implementation(libs.retrofit)
    implementation(libs.retrofit.moshi)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.moshi.kotlin)
    implementation(libs.moshi.adapters)

    // WorkManager
    implementation(libs.workmanager.ktx)

    // DataStore
    implementation(libs.datastore.preferences)

    // Coroutines
    implementation(libs.coroutines.android)

    // Sunmi printer — binding directo via IWoyouService AIDL (src/main/aidl/woyou/...)
}

// Esto le dice a Gradle dónde encontrar los archivos .aidl
android.sourceSets {
    getByName("main") {
        aidl.srcDirs("src/main/aidl")
    }
}