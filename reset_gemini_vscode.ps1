# Script para refrescar sesión de Gemini y reiniciar VS Code en Windows

# Ruta de tu proyecto (ajústala a tu carpeta real)
$proyecto = "C:\Users\gerar\Desktop\Negocios\Venta de Puerco\Plataforma GCF"

Write-Host "🔄 Cerrando procesos de Google Cloud..."
Get-Process gcloud -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🔑 Refrescando sesión de Google Cloud..."
Start-Process "gcloud" -ArgumentList "auth login" -NoNewWindow -Wait
Start-Process "gcloud" -ArgumentList "auth application-default login" -NoNewWindow -Wait
gcloud auth print-access-token | Out-Null

Write-Host "🛑 Cerrando VS Code..."
Get-Process code -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 2

Write-Host "🚀 Reiniciando VS Code en $proyecto..."
Start-Process "code" -ArgumentList $proyecto

Write-Host "✅ Todo listo. Gemini debería reconocer el nuevo límite."

