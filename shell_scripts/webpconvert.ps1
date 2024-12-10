#### CHANGE DIRECTORY

$ScriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$TargetDirectory = Join-Path -Path $ScriptDirectory -ChildPath "..\assets"
$FullTargetDirectory = Resolve-Path -Path $TargetDirectory
Set-Location -Path $FullTargetDirectory

####

function Split-String {
    param (
        [string]$Str,
        [string]$Split
    )
    
    # Split the string by the specified word
    $parts = $Str -split [regex]::Escape($Split), 2

    # Return the part after the specified word
    if ($parts.Length -gt 1) {
        return $parts[-1]
    } else {
        return ""
    }
}

###

# Step 0: Read the .webpconvertignore file (if it exists)
$ignoreFilePath = Join-Path (Get-Location) "..\.webpconvertignore"
$ignorePatterns = @()

if (Test-Path -Path $ignoreFilePath) {
    $ignorePatterns = Get-Content -Path $ignoreFilePath
    $ignorePatterns = $ignorePatterns | ForEach-Object { $_.Trim() }  # Trim any extra whitespace
    
    # Print the ignore patterns
    Write-Output "Patterns loaded from .webpconvertignore:"
    $ignorePatterns | ForEach-Object { Write-Output $_ }
    Write-Output ""
}

# Function to check if a file or directory should be ignored
function Should-SkipItem($relativePath) {
    foreach ($pattern in $ignorePatterns) {
        if ($relativePath -like $pattern) {
            return $true
        }
    }
    return $false
}

# Step 1: Prompt user for compression level with default value of 80
$compressionLevel = Read-Host "Enter the compression level (default is 80)" 
if (-not $compressionLevel) { $compressionLevel = 80 }

# Step 2: Get the current directory
$CurrentDirectory = Get-Location

# Step 3: Determine which files will be skipped and which will be processed
$filesToProcess = @()
$filesToSkip = @()

Get-ChildItem -Path $CurrentDirectory -Recurse -Include *.png, *.jpg, *.jpeg | ForEach-Object {
    $File = $_.FullName
    $RelativePath = $File.Substring($CurrentDirectory.Length + 1)
    $PrintName = Split-String -Str $RelativePath -Split "assets"
    $PrintName = "~\assets" + $PrintName

    # Check if the file or its directory matches any pattern in the ignore list
    $Directory = Split-Path -Path (Split-Path -Parent $RelativePath) -Leaf
    $FileName = Split-Path -Leaf $RelativePath
    
    $ShouldSkip = Should-SkipItem $Directory -or Should-SkipItem $FileName

    if ($ShouldSkip) {
        $filesToSkip += $PrintName
    } else {
        $filesToProcess += $PrintName
    }
}

# Print files that will be skipped
if ($filesToSkip.Count -gt 0) {
    Write-Output "Files that will be skipped:"
    $filesToSkip | ForEach-Object { Write-Output $_ }
    Write-Output ""
}

# Print files that will be processed
if ($filesToProcess.Count -gt 0) {
    Write-Output "Files that will be converted:"
    $filesToProcess | ForEach-Object { Write-Output $_ }
    Write-Output ""
}

# Step 4: Prompt user for confirmation
$confirmation = Read-Host "Files will be converted. Do you want to proceed? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Output "Operation cancelled."
    exit
}

# Step 5: Process the files
Get-ChildItem -Path $CurrentDirectory -Recurse -Include *.png, *.jpg, *.jpeg | ForEach-Object {
    $File = $_.FullName
    $RelativePath = $File.Substring($CurrentDirectory.Length + 1)
    $PrintName = Split-String -Str $RelativePath -Split "assets"
    $PrintName = "~\assets" + $PrintName

    # Check if the file or its directory matches any pattern in the ignore list
    $Directory = Split-Path -Path (Split-Path -Parent $RelativePath) -Leaf
    $FileName = Split-Path -Leaf $RelativePath
    
    if (Should-SkipItem $Directory -or Should-SkipItem $FileName) {
        Write-Output "Skipped: $PrintName"
        return
    }

    $WebPFile = [System.IO.Path]::ChangeExtension($File, ".webp")

    ### STARTREGION: THIS SHOULD GO AFTER IN THE NEXT FOR LOOP
    # Convert the image to webp using ImageMagick
    magick "$File" -quality $compressionLevel "$WebPFile"

    # Check if conversion was successful and delete the original file
    if (Test-Path -Path $WebPFile) {
        Remove-Item -Path $File -Force
        Write-Output "Converted: $PrintName"
    } else {
        Write-Output "Failed: $PrintName"
    }

    ### ENDREGION
}

Write-Output "Conversion process completed."

Write-Output "Press any key to exit..."
[void][System.Console]::ReadKey($true)
