#!/bin/bash
echo "正在启动本地服务器..."
python3 start.py
if [ $? -ne 0 ]; then
    echo "请确保已安装Python3"
    echo "安装: sudo apt-get install python3 (Ubuntu/Debian)"
    echo "或: brew install python (macOS)"
fi
