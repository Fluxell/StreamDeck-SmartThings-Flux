$manifestPath = ".\com.fluxell.smartthings.sdPlugin\manifest.json"
$pluginName = "com.fluxell.smartthings.sdPlugin"
$distDir = ".\dist"
if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Force -Path $distDir
}
$outputPath = "$distDir\com.fluxell.smartthings.streamDeckPlugin"

if (!(Test-Path $manifestPath)) {
    Write-Error "Manifest not found at $manifestPath"
    exit 1
}

$json = Get-Content $manifestPath | ConvertFrom-Json
$version = [version]$json.Version
$newVersion = "{0}.{1}.{2}" -f $version.Major, $version.Minor, ($version.Build + 1)

Write-Host "Incrementing version from $($json.Version) to $newVersion"
$json.Version = $newVersion
$json.Builder.Version = $newVersion

$json | ConvertTo-Json -Depth 10 | Set-Content $manifestPath

# Create the package (Zip)
# StreamDeck distribution tool is preferred, but for this task we are creating the package file.
# A .streamDeckPlugin is just a zip of the folder.

Write-Host "Creating package..."

if (Test-Path $outputPath) {
    Remove-Item $outputPath
}

$tempZip = ".\temp_package.zip"
if (Test-Path $tempZip) {
    Remove-Item $tempZip
}


if (Test-Path $outputPath) {
    Remove-Item $outputPath
}

Compress-Archive -Path $pluginName -DestinationPath $tempZip
Move-Item -Path $tempZip -Destination $outputPath -Force

Write-Host "Build complete: $outputPath"
