# =============================================================================
#  LolPick — installation en une commande (Windows)
# -----------------------------------------------------------------------------
#  Colle ceci dans PowerShell :
#
#    irm https://raw.githubusercontent.com/UnGlockSurLaTempe/chroma-/refs/heads/claude/lol-champion-picker-flyo1g/lolpick/bootstrap.ps1 | iex
#
#  Le script :
#    1. trouve Python 3 (et propose de l'installer via winget s'il manque)
#    2. télécharge la dernière version de LolPick
#    3. l'installe dans %LOCALAPPDATA%\Programs\LolPick
#    4. crée les raccourcis + le lancement automatique avec League
#    5. ouvre l'app
#
#  Relance-le quand tu veux : ça met à jour l'installation existante.
#  Tes réglages (pool, mode) sont ailleurs et ne sont jamais touchés.
# =============================================================================

function Install-LolPick {
    $Repo   = 'UnGlockSurLaTempe/chroma-'
    $Branch = 'claude/lol-champion-picker-flyo1g'
    $Dest   = Join-Path $env:LOCALAPPDATA 'Programs\LolPick'

    Write-Host ''
    Write-Host '  LolPick' -ForegroundColor Yellow -NoNewline
    Write-Host ' — assistant de draft League of Legends'
    Write-Host '  ---------------------------------------'
    Write-Host ''

    # -- 1. Python ----------------------------------------------------------
    $py = Find-Python
    if (-not $py) {
        Write-Host '  Python 3 est absent. Installation via winget...' -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install -e --id Python.Python.3.12 `
                --accept-source-agreements --accept-package-agreements
            # winget modifie le PATH de la machine : on le recharge ici
            $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                        [Environment]::GetEnvironmentVariable('Path', 'User')
            $py = Find-Python
        }
    }
    if (-not $py) {
        Write-Host ''
        Write-Host '  Impossible de trouver ou installer Python 3.' -ForegroundColor Red
        Write-Host '  Installe-le depuis https://www.python.org/downloads/'
        Write-Host '  (coche "Add python.exe to PATH"), puis relance cette commande.'
        return
    }
    Write-Host ('  Python      : ' + $py) -ForegroundColor DarkGray

    # -- 2. Téléchargement --------------------------------------------------
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $zip = Join-Path $env:TEMP 'lolpick.zip'
    $tmp = Join-Path $env:TEMP ('lolpick-' + [guid]::NewGuid().ToString('N'))
    $url = "https://codeload.github.com/$Repo/zip/refs/heads/$Branch"

    Write-Host '  Téléchargement...' -ForegroundColor DarkGray
    try {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    } catch {
        Write-Host ''
        Write-Host ('  Échec du téléchargement : ' + $_.Exception.Message) -ForegroundColor Red
        return
    }

    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $extracted = Get-ChildItem $tmp -Directory | Select-Object -First 1
    $source = Join-Path $extracted.FullName 'lolpick'
    if (-not (Test-Path $source)) {
        Write-Host '  Archive inattendue : dossier lolpick introuvable.' -ForegroundColor Red
        return
    }

    # -- 3. Installation des fichiers ---------------------------------------
    if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    Copy-Item (Join-Path $source '*') $Dest -Recurse -Force
    Remove-Item $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ('  Installé    : ' + $Dest) -ForegroundColor DarkGray

    # -- 4. Raccourcis + lancement automatique ------------------------------
    Write-Host ''
    & $py (Join-Path $Dest 'install.py')

    # -- 5. Ouverture ---------------------------------------------------------
    $pyw = Get-PythonNoConsole $py
    Start-Process $pyw -ArgumentList ('"' + (Join-Path $Dest 'app.py') + '"')

    Write-Host ''
    Write-Host '  C''est prêt.' -ForegroundColor Green
    Write-Host '  La fenêtre vient de s''ouvrir. À la prochaine ouverture de session,'
    Write-Host '  LolPick se mettra en veille et apparaîtra tout seul avec League.'
    Write-Host ''
    Write-Host '  Mise à jour  : relance cette même commande'
    Write-Host ('  Désinstaller : ' + $py + ' "' + (Join-Path $Dest 'install.py') + '" --uninstall')
    Write-Host ''
}

function Find-Python {
    # `py` d'abord : `python` peut être l'alias Microsoft Store, qui ouvre
    # le Store au lieu de lancer quoi que ce soit.
    foreach ($name in @('py', 'python', 'python3')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        try {
            $major = & $cmd.Source -c 'import sys; print(sys.version_info[0])' 2>$null
        } catch { continue }
        if ("$major".Trim() -eq '3') { return $cmd.Source }
    }
    return $null
}

function Get-PythonNoConsole($python) {
    # pythonw.exe / pyw.exe : lance l'app sans fenêtre de console noire
    $dir  = Split-Path $python
    $leaf = Split-Path $python -Leaf
    $candidate = if ($leaf -ieq 'py.exe') { Join-Path $dir 'pyw.exe' } else { Join-Path $dir 'pythonw.exe' }
    if (Test-Path $candidate) { return $candidate }
    return $python
}

Install-LolPick
