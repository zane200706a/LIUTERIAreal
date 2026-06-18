# Simple static file HTTP server for the luthier website
$port = 8000
$basePath = (Resolve-Path $PSScriptRoot)

Add-Type -AssemblyName System.Web.Extensions
$jsonHelper = New-Object System.Web.Script.Serialization.JavaScriptSerializer

Write-Host "Server started at http://localhost:$port" -ForegroundColor Green
Write-Host "Serving files from: $basePath" -ForegroundColor DarkGray
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

# Allow network access by adding netsh binding
try {
    # Try to add a wildcard prefix for LAN access
    & netsh http add urlacl url=http://+:$port/ user=EVERYTHING 2>$null
} catch {}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $url = $request.Url.LocalPath

    # Determine the file path
    if ($url -eq "/" -or $url -eq "/index.html") {
        $filePath = Join-Path $basePath "index.html"
    } else {
        $relativePath = $url.Substring(1)
        $filePath = Join-Path $basePath $relativePath
    }

    if (Test-Path $filePath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($filePath)

        # Determine content type
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = switch ($ext) {
            ".html" { "text/html; charset=utf-8" }
            ".css"  { "text/css; charset=utf-8" }
            ".js"   { "application/javascript; charset=utf-8" }
            ".json" { "application/json; charset=utf-8" }
            ".png"  { "image/png" }
            ".jpg",".jpeg" { "image/jpeg" }
            ".gif"  { "image/gif" }
            ".svg"  { "image/svg+xml" }
            ".woff2"{ "font/woff2" }
            ".woff" { "font/woff" }
            default { "application/octet-stream" }
        }

        $response = $context.Response
        $response.ContentType = $contentType
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
        $response.Close()
    } else {
        $errorHtml = "<html><body style='font-family:sans-serif;padding:40px;background:#1a1714;color:#f0e6d8'><h1>404 Not Found</h1><p>The page <code>$url</code> was not found.</p></body></html>"
        $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorHtml)
        $response = $context.Response
        $response.ContentType = "text/html; charset=utf-8"
        $response.StatusCode = 404
        $response.ContentLength64 = $errorBytes.Length
        $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
        $response.Close()
    }
}

$listener.Stop()
