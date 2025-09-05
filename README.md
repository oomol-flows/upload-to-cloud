# Upload to Cloud

A OOMOL workflow block for uploading files to cloud storage with temporary access URLs.

## Overview

This project provides a secure and efficient solution for uploading files to cloud storage and generating temporary access URLs. The uploaded files are stored in a remote cache with a 24-hour validity period, making it perfect for temporary file sharing and processing workflows.

## Features

- **Multipart Upload**: Supports large file uploads with chunked upload mechanism
- **Progress Tracking**: Real-time upload progress reporting
- **Retry Logic**: Automatic retry mechanism for failed uploads with exponential backoff
- **Temporary URLs**: Generates presigned URLs with 24-hour expiration
- **Error Handling**: Comprehensive error handling and logging
- **OOMOL Integration**: Seamless integration with OOMOL platform workflows

## Project Structure

```
upload-to-cloud/
├── flows/                          # Workflow definitions
│   └── flow-1/
│       ├── flow.oo.yaml           # Main workflow configuration
│       └── .flow.ui.oo.json       # UI configuration
├── tasks/                          # Reusable task blocks
│   └── upload-to-cloud/
│       ├── index.ts               # Main upload implementation
│       └── task.oo.yaml           # Task configuration
├── package.oo.yaml                # OOMOL package configuration
├── package.json                   # Node.js dependencies
└── README.md                      # This file
```

## Block Description

### Upload to Cloud Block

**Location**: `tasks/upload-to-cloud/`

This block handles the complete file upload process to cloud storage.

#### Inputs
- `file` (string): File path of the file to be uploaded
  - Accepts any file type
  - Uses file picker UI widget for easy selection

#### Outputs  
- `remote_url` (string): Presigned URL for accessing the uploaded file
  - Valid for 24 hours from upload time
  - Can be used for direct file access or sharing

#### Functionality
1. **File Validation**: Checks if the specified file exists and is accessible
2. **Upload Initialization**: Contacts the remote server to initialize a multipart upload session
3. **Chunked Upload**: Splits large files into smaller chunks for parallel upload
4. **Progress Reporting**: Provides real-time progress updates during upload
5. **URL Generation**: Retrieves the final presigned URL for the uploaded file

#### Technical Details
- **Executor**: Node.js/TypeScript
- **API Endpoint**: `https://console.oomol.com/api/tasks/files/remote-cache/`
- **Authentication**: Requires OOMOL API key from environment
- **Upload Strategy**: Parallel multipart upload with automatic retry
- **File Size**: Supports files of any size through chunked upload
- **Timeout**: Includes retry logic with progressive backoff

## Usage

### In OOMOL Workflows

1. **Add the Block**: Drag the "Upload to Cloud" block into your workflow
2. **Configure Input**: Connect a file path or use the file picker
3. **Connect Output**: Use the `remote_url` output in subsequent blocks
4. **Run Workflow**: Execute to upload your file and get the temporary URL

### Example Workflow

```yaml
nodes:
  - node_id: upload-remote-cache#1
    title: "Upload File to Remote Cache"
    inputs_from:
      - handle: file
        value: /path/to/your/file.pdf
    task: self::upload-to-cloud
```

The output `remote_url` can then be used by other blocks for:
- File sharing and distribution
- Processing by cloud-based services  
- Integration with external APIs
- Temporary file hosting

## Prerequisites

- OOMOL platform environment
- Valid OOMOL API key configured in environment variables
- Node.js runtime for TypeScript execution

## Installation

The block is automatically configured when you install this OOMOL package. Dependencies are managed through the package configuration and installed during the bootstrap process.

## Error Handling

The block includes comprehensive error handling for:
- Missing or invalid file paths
- Network connectivity issues  
- Authentication failures
- Server-side upload errors
- Large file upload timeouts

All errors are properly logged and reported through the OOMOL context system.

## Security

- All uploads require valid authentication
- Presigned URLs have limited 24-hour lifespan
- Files are stored securely in remote cache
- No sensitive data is logged or exposed

## Support

For issues and feature requests, please visit the [project repository](https://github.com/oomol-flows/upload-to-cloud.git).