$manifestPath = ".\com.fluxell.smartthings.sdPlugin\manifest.json"
$pluginName = "com.fluxell.smartthings.sdPlugin"
$outputPath = ".\com.fluxell.smartthings.streamDeckPlugin"

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

Compress-Archive -Path $pluginName -DestinationPath $tempZip
Rename-Item -Path $tempZip -NewName $outputPath

Write-Host "Build complete: $outputPath"
