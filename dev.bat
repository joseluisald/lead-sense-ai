@echo off

start "Lead Sense Frontend" /D "%~dp0frontend" cmd /k "bun run dev"
start "Lead Sense Backend" /D "%~dp0backend" cmd /k "bun run dev"
