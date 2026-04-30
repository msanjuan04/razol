#!/usr/bin/env python3
"""Servidor HTTP alternativo (usa Python si no tienes Node.js)."""
import http.server
import socketserver

PORT = 5173
HOST = "127.0.0.1"

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
    print("")
    print("  Servidor listo.")
    print(f"  Abre en el navegador: http://{HOST}:{PORT}/")
    print("")
    httpd.serve_forever()
