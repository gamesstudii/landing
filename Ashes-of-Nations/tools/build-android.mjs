import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const root = new URL("../", import.meta.url);
const androidDir = new URL("android/", root);
const manifestPath = new URL("android/app/src/main/AndroidManifest.xml", root);
const apkPath = new URL("android/app/build/outputs/apk/debug/app-debug.apk", root);
const distApkPath = new URL("dist/Ashes-of-Nations-android-debug.apk", root);
const localSdkDir = new URL(".android-sdk/", root);
const localPropertiesPath = new URL("android/local.properties", root);
const localJdkDir = new URL(".jdk21/", root);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      shell: true,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
    child.on("error", reject);
  });
}

async function ensureLandscapeManifest() {
  let text = await readFile(manifestPath, "utf8");
  if (text.includes("android:screenOrientation=")) {
    text = text.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="landscape"');
  } else {
    text = text.replace(
      /(<activity\b[^>]*android:name="\.MainActivity")/,
      '$1 android:screenOrientation="landscape"',
    );
  }
  await writeFile(manifestPath, text);
}

async function ensureAndroidSdk() {
  if (!existsSync(localSdkDir)) return;
  const sdkPath = decodeURIComponent(localSdkDir.pathname)
    .replace(/^\/([A-Za-z]:\/)/, "$1")
    .replace(/\//g, "\\");
  process.env.ANDROID_HOME = sdkPath;
  process.env.ANDROID_SDK_ROOT = sdkPath;
  await writeFile(localPropertiesPath, `sdk.dir=${sdkPath.replace(/\\/g, "\\\\")}\n`);
}

function ensureJavaHome() {
  if (!existsSync(localJdkDir)) return;
  const javaHome = decodeURIComponent(localJdkDir.pathname)
    .replace(/^\/([A-Za-z]:\/)/, "$1")
    .replace(/\//g, "\\");
  process.env.JAVA_HOME = javaHome;
  process.env.PATH = `${javaHome}\\bin;${process.env.PATH || ""}`;
}

async function copyApk() {
  await stat(apkPath);
  await mkdir(new URL("dist/", root), { recursive: true });
  await copyFile(apkPath, distApkPath);
  console.log(`Copied Android APK to ${distApkPath.pathname}`);
}

await run("npm", ["run", "build"]);
ensureJavaHome();
await ensureAndroidSdk();
if (!existsSync(androidDir)) {
  await run("npx", ["cap", "add", "android"]);
}
await run("npx", ["cap", "sync", "android"]);
ensureJavaHome();
await ensureAndroidSdk();
await ensureLandscapeManifest();
await run(".\\gradlew.bat", ["assembleDebug"], { cwd: androidDir });
await copyApk();
