# Create GitHub Repository Script
# This script creates a GitHub repository using Personal Access Token

$token = "YOUR_GITHUB_TOKEN_HERE"
$owner = "AgentNEXORA"
$repoName = "nexora-terminal"
$description = "NEXORA Terminal - A powerful terminal interface"

# Create repository payload
$body = @{
    name = $repoName
    description = $description
    private = $false
    auto_init = $false
} | ConvertTo-Json

# Set headers
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    Write-Host "Creating repository $owner/$repoName..."
    
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "Repository created successfully!"
    Write-Host "Repository URL: $($response.html_url)"
    Write-Host "Clone URL: $($response.clone_url)"
    
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "Error creating repository: $errorMessage"
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}