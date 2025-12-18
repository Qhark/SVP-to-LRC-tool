#!/usr/bin/env python3
"""
一键启动本地服务器
支持Windows/Mac/Linux
"""

import os
import sys
import webbrowser
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import platform

def check_port_in_use(port):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_server(port=8000):
    """启动HTTP服务器"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    if check_port_in_use(port):
        print(f" 端口 {port} 已被占用，尝试使用端口 {port + 1}")
        port += 1
    
    server = HTTPServer(('localhost', port), SimpleHTTPRequestHandler)
    
    print(f"服务器启动成功！")
    print(f"服务目录: {os.getcwd()}")
    print(f"访问地址: http://localhost:{port}")
    print(f"主页面: http://localhost:{port}/index.html")
    print("\n按 Ctrl+C 停止服务器")
    
    # 在新线程中启动服务器，以便我们可以同时打开浏览器
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    # 打开浏览器
    webbrowser.open(f'http://localhost:{port}')
    
    # 保持主线程运行
    try:
        while True:
            server_thread.join(1)
    except KeyboardInterrupt:
        print("\n正在关闭服务器...")
        server.shutdown()
        sys.exit(0)

def create_bat_file():
    """为Windows创建批处理文件"""
    bat_content = '''@echo off
echo 正在启动本地服务器...
python start.py
if errorlevel 1 (
    echo 请确保已安装Python并添加到PATH
    echo 下载Python: https://www.python.org/downloads/
    pause
)
'''
    with open('start.bat', 'w', encoding='utf-8') as f:
        f.write(bat_content)
    
    sh_content = '''#!/bin/bash
echo "正在启动本地服务器..."
python3 start.py
if [ $? -ne 0 ]; then
    echo "请确保已安装Python3"
    echo "安装: sudo apt-get install python3 (Ubuntu/Debian)"
    echo "或: brew install python (macOS)"
fi
'''
    with open('start.sh', 'w', encoding='utf-8') as f:
        f.write(sh_content)
    
    # 设置执行权限（Linux/Mac）
    if platform.system() != 'Windows':
        os.chmod('start.sh', 0o755)

if __name__ == '__main__':
    print("=" * 50)
    print("本地Web应用一键启动器")
    print("=" * 50)
    
    # 创建启动脚本
    create_bat_file()
    
    # 启动服务器
    try:
        start_server()
    except Exception as e:
        print(f"启动失败: {e}")
        print("\n可能的解决方案：")
        print("1. 确保已安装Python（https://www.python.org/）")
        print("2. 检查防火墙设置")
        print("3. 尝试使用其他端口：python start.py 8080")
        sys.exit(1)