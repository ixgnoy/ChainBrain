plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "net.chainbrain.wallet"
    compileSdk = 37

    defaultConfig {
        applicationId = "net.chainbrain.wallet"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "API_URL", "\"${providers.gradleProperty("chainbrain.apiUrl").get()}\"")
        buildConfigField("String", "RPC_URL", "\"${providers.gradleProperty("chainbrain.rpcUrl").get()}\"")
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging {
        resources.excludes += setOf("META-INF/DISCLAIMER", "META-INF/versions/**", "META-INF/INDEX.LIST", "META-INF/DEPENDENCIES")
    }
    testOptions { unitTests.isReturnDefaultValues = true }
}

dependencies {
    val bom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(bom)
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.12.4")
    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    // Signing and ABI encoding only; JSON-RPC goes over OkHttp (no web3j-core, rxjava or jackson).
    implementation("org.web3j:crypto:4.12.3")
    implementation("org.web3j:abi:4.12.3")
    implementation("com.squareup.okhttp3:okhttp:5.5.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20260814") // Android ships org.json; plain JVM tests need the real one
}
