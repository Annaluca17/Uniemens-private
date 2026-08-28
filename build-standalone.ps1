# Genera standalone.html: un unico file HTML auto-contenuto (React + Babel + sorgente inline)
# che si apre con doppio click, senza Node/Vite. Rilanciare dopo ogni modifica a src/UniEmensPriv.jsx.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# I sorgenti sono UTF-8 senza BOM: PS 5.1 li leggerebbe come ANSI e romperebbe gli accenti.
$utf8 = New-Object System.Text.UTF8Encoding $false
$read = { param($p) [System.IO.File]::ReadAllText((Join-Path $root $p), $utf8) }

$react    = & $read "vendor\react.js"
$reactDom = & $read "vendor\react-dom.js"
$babel    = & $read "vendor\babel.js"
$src      = & $read "src\UniEmensPriv.jsx"

# Rimuove gli import ESM e l'export default: in modalita' standalone React e' un global UMD.
$src = $src -replace '(?m)^\s*import\s+.*?from\s+".*?";\s*$', ''
$src = $src -replace 'export\s+default\s+function\s+UniEmensPriv', 'function UniEmensPriv'
# Le funzioni pure sono esportate per i test (vitest). Qui siamo in uno <script> semplice,
# non in un modulo: un 'export' rimasto e' un errore di sintassi e la pagina resta bianca.
$src = $src -replace '(?m)^export\s+function\s+', 'function '

$prelude = @"
const { useState, useRef, useMemo, useEffect, useCallback } = React;
"@

$epilogue = @"
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(UniEmensPriv));
"@

$html = @"
<!doctype html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>UniEmens Privatistico Builder (standalone)</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0b1523; }
  #boot { color:#7AAFC8; font:14px/1.6 'Segoe UI',system-ui,sans-serif; padding:24px; }
</style>
</head>
<body>
<div id="root"><div id="boot">Compilazione in corso&hellip;</div></div>
<script>$react</script>
<script>$reactDom</script>
<script>$babel</script>
<script type="text/babel" data-presets="react">
$prelude
$src
$epilogue
</script>
</body>
</html>
"@

$outFile = Join-Path $root "standalone.html"
[System.IO.File]::WriteAllText($outFile, $html, $utf8)
"Generato: $outFile  ({0:N0} bytes)" -f (Get-Item $outFile).Length
