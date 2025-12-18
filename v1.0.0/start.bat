@echo off
echo 正在启动本地服务器...
python start.py
if errorlevel 1 (
    echo 请确保已安装Python并添加到PATH
    echo 下载Python: https://www.python.org/downloads/
    pause
)
