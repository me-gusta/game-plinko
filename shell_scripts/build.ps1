#### CHANGE DIRECTORY

$ScriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$TargetDirectory = Join-Path -Path $ScriptDirectory -ChildPath "..\"
$FullTargetDirectory = Resolve-Path -Path $TargetDirectory
Set-Location -Path $FullTargetDirectory

####


# Prompt the user for the maximum amount
$maxAmount = Read-Host "Please enter the number of buildItems (9 by default)"
if (-not $maxAmount) { $maxAmount = "9" }

# Prompt the user for the number of threads (parallel jobs)
$threads = Read-Host "Please enter the number of threads (3 by default)"
if (-not $threads) { $threads = "3" }

# Run the node command and capture the output
$TotalCount = node ./bundler/build-bundle/countBuildItems.js

# Convert the output and user inputs to integers
$TotalCount = [int]$TotalCount
$maxAmount = [int]$maxAmount
$threads = [int]$threads

# Initialize a variable to keep track of the current count
$currentCount = 0

# Create a list to hold jobs
$jobs = @()

# Loop until the total count is processed
while ($currentCount -lt $TotalCount) {
    # Calculate the amount to process in this iteration
    $amount = [math]::Min($maxAmount, $TotalCount - $currentCount)

    # Run the webpack command in a new job from the current directory
    $job = Start-Job -ScriptBlock {
        param($start, $amount, $workingDirectory)
        # Change to the working directory
        Set-Location $workingDirectory
        # Run the webpack command
        & ./node_modules/.bin/webpack --config ./bundler/build-bundle/webpack.prod-bundle.js --env start=$start amount=$amount
    } -ArgumentList $currentCount, $amount, (Get-Location)

    # Add the job to the list
    $jobs += $job

    # Update the current count
    $currentCount += $amount

    # If the number of active jobs equals the thread limit, wait for any job to complete
    while ($jobs.Count -ge $threads) {
        $finishedJob = Wait-Job -Job $jobs -Any -Timeout 1
        if ($finishedJob) {
            Receive-Job -Job $finishedJob | Out-Null
            Remove-Job -Job $finishedJob
            $jobs = $jobs | Where-Object { $_.Id -ne $finishedJob.Id }
        }
    }
}

# Wait for any remaining jobs to complete
$jobs | ForEach-Object {
    $_ | Wait-Job | Receive-Job
    Remove-Job $_
}

# Wait for user input before exiting
Write-Output "Press any key to exit..."
[void][System.Console]::ReadKey($true)
