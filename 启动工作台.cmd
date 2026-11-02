@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo 请先安装 Node.js 22.12 或更新版本，再打开本文件。
  pause
  exit /b 1
)
if not exist node_modules (
  echo 正在安装项目依赖，首次安装需要联网，请稍候。
  call npm.cmd ci
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)
echo 正在打开个人工作台。使用期间请保留本窗口。
echo 结束使用时按 Ctrl+C。
call npm.cmd run dev -- --open
pause
