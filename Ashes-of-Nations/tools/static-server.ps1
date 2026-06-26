param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [int]$Port = 8765,
  [switch]$OpenBrowser
)

$rootPath = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

if ($OpenBrowser) {
  Start-Process "http://localhost:$Port/"
}

Write-Host "Ashes of Nations: http://localhost:$Port/"
Write-Host "Закройте это окно, чтобы остановить игру."

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relativePath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      $filePath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relativePath))
      if (-not $filePath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $context.Response.StatusCode = 403
        $context.Response.Close()
        continue
      }

      if (-not [System.IO.File]::Exists($filePath)) {
        $context.Response.StatusCode = 404
        $context.Response.Close()
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $context.Response.ContentType = if ($mimeTypes.ContainsKey($extension)) {
        $mimeTypes[$extension]
      } else {
        "application/octet-stream"
      }
      $context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $context.Response.OutputStream.Close()
    } catch {
      $context.Response.StatusCode = 500
      $context.Response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
