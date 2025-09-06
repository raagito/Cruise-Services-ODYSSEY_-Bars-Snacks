$ErrorActionPreference = 'Continue'

# Ruta del archivo SQLite que usa Django
$db = "C:\Users\Usuario\Desktop\crucero-bar\Administracion-proyecto-Crucero-Development-Almac-n\db.sqlite3"

# Posibles ubicaciones del ejecutable de DB Browser
$exe1 = "C:\Program Files\DB Browser for SQLite\DB Browser for SQLite.exe"
$exe2 = "C:\Program Files (x86)\DB Browser for SQLite\DB Browser for SQLite.exe"

if (Test-Path $exe1) {
  Start-Process -FilePath $exe1 -ArgumentList "`"$db`""
}
elseif (Test-Path $exe2) {
  Start-Process -FilePath $exe2 -ArgumentList "`"$db`""
}
else {
  Write-Host "No se encontró DB Browser en Program Files. Abriendo el archivo en el Explorador..."
  Start-Process explorer "/select,`"$db`""
}
