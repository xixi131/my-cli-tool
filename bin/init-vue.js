#!/usr/bin/env node

// 强制设置标准输出编码为 UTF-8
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// 引入必要的模块
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readlineSync = require('readline-sync');
const { writeFileSync } = require('fs');
const cliProgress = require('cli-progress');

// 1. 强制设置 Windows 环境中的编码为 UTF-8
if (process.platform === 'win32') {
  try {
    // 使用 chcp 65001 强制设置 Windows 使用 UTF-8 编码
    execSync('chcp 65001', { stdio: 'inherit' });
  } catch (error) {
    console.error('设置编码为 UTF-8 失败:', error);
  }
}

// 2. 获取用户输入（项目名称、包管理器、端口号）
const projectName = readlineSync.question('请输入项目名称: ');
const packageManager = readlineSync.keyInSelect(
  ['npm', 'pnpm', 'yarn'],
  '请选择你想使用的包管理器:'
);

if (packageManager === -1) {
  console.log('未选择包管理器，退出');
  process.exit();
}

const port = readlineSync.questionInt('请输入端口号（默认为 3000）：', { defaultInput: 3000 });

const packageManagers = ['npm', 'pnpm', 'yarn'];
const selectedPackageManager = packageManagers[packageManager];

// 3. 创建 Vue 项目
console.log(`正在创建 Vue 项目 ${projectName}...`);

// 进度条设置
const progress = new cliProgress.SingleBar({
  format: '正在执行 |' + '{bar}' + '| {percentage}% 完成 | {value}/{total} 任务',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
}, cliProgress.Presets.shades_classic);

progress.start(4, 0); // 增加了一个任务数量

// 执行项目初始化命令
try {
  execSync(`npx create-vue@latest ${projectName} --template vue`, { stdio: 'inherit' });
  progress.increment();
} catch (error) {
  console.error('项目初始化失败', error);
  process.exit(1);
}

// 4. 进入项目目录
process.chdir(path.join(process.cwd(), projectName));

// 5. 修改 vite.config.js 以设置端口号
console.log(`正在配置端口号为 ${port}...`);
const viteConfigPath = path.join(process.cwd(), 'vite.config.js');

if (fs.existsSync(viteConfigPath)) {
  // 读取文件内容
  let viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8');

  // 判断是否已有 server 配置
  if (!viteConfigContent.includes('server:')) {
    // 如果没有 server 配置，添加到 defineConfig 中
    const insertPosition = viteConfigContent.indexOf('export default defineConfig({') + 'export default defineConfig({'.length;
    viteConfigContent =
      viteConfigContent.slice(0, insertPosition) +
      `
  server: {
    port: ${port}, // 用户指定端口
    open: true,
  },` +
      viteConfigContent.slice(insertPosition);
  } else {
    // 如果有 server 配置，更新端口号
    viteConfigContent = viteConfigContent.replace(
      /server:\s*\{[^}]*\}/,
      `server: {
        port: ${port}, // 用户指定端口
        open: true,
      }`
    );
  }

  // 写回文件
  fs.writeFileSync(viteConfigPath, viteConfigContent, 'utf-8');
  console.log(`已更新 vite.config.js，端口号设置为 ${port}`);
} else {
  console.error('vite.config.js 文件不存在，无法修改端口号');
}

progress.increment();

// 6. 安装依赖
console.log(`正在使用 ${selectedPackageManager} 安装依赖...`);
try {
  execSync(`${selectedPackageManager} install`, { stdio: 'inherit' });
  progress.increment();
} catch (error) {
  console.error('依赖安装失败', error);
  process.exit(1);
}

// 7. 删除不必要的文件（根据你的需求进行删减）
// 删除 src/assets 下的所有内容
const assetsPath = path.join(process.cwd(), 'src', 'assets');
if (fs.existsSync(assetsPath)) {
  fs.readdirSync(assetsPath).forEach(file => {
    fs.unlinkSync(path.join(assetsPath, file));
  });
  console.log(`清空目录: ${assetsPath}`);
}

// 删除 src/components/icons 下的所有内容
const iconsPath = path.join(process.cwd(), 'src', 'components', 'icons');
if (fs.existsSync(iconsPath)) {
  fs.readdirSync(iconsPath).forEach(file => {
    fs.unlinkSync(path.join(iconsPath, file));
  });
  console.log(`清空目录: ${iconsPath}`);
}

// 删除 src/components 中除 icons 文件夹的所有内容
const componentsPath = path.join(process.cwd(), 'src', 'components');
if (fs.existsSync(componentsPath)) {
  fs.readdirSync(componentsPath).forEach(file => {
    const filePath = path.join(componentsPath, file);
    if (file !== 'icons') {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmdirSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  });
  console.log(`清理目录: ${componentsPath}`);
}

// 修改 src/App.vue 文件内容
const appVuePath = path.join(process.cwd(), 'src', 'App.vue');
const newAppVueContent = `<script setup>

</script>

<template>

</template>

<style scoped>

</style>
`;
fs.writeFileSync(appVuePath, newAppVueContent, 'utf-8');
console.log(`修改文件: ${appVuePath}`);

// 修改 src/main.js 文件，删除 import './assets/main.css'
const mainJsPath = path.join(process.cwd(), 'src', 'main.js');
if (fs.existsSync(mainJsPath)) {
  let mainJsContent = fs.readFileSync(mainJsPath, 'utf-8');
  
  // 精确匹配并删除 import './assets/main.css'
  const lines = mainJsContent.split('\n'); // 按行分割文件内容
  const filteredLines = lines.filter(line => !line.includes("import './assets/main.css'")); // 移除包含目标内容的行
  
  fs.writeFileSync(mainJsPath, filteredLines.join('\n'), 'utf-8');
  console.log(`修改文件: ${mainJsPath}`);
}

progress.increment();

// 8. 提示用户运行开发服务器
progress.stop();
console.log(`项目初始化完成！

1. 项目已成功创建，依赖已安装。
2. 项目端口已配置为 ${port}。
3. 你可以通过以下命令启动开发服务器：
   
   ${selectedPackageManager} run dev

祝你开发愉快！`);
