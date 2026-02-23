# AWS S3 Image Upload Module

This module provides AWS S3 integration for uploading, managing, and deleting images in your NestJS application.

## Features

- ✅ Single and multiple file uploads to AWS S3
- ✅ File validation (type, size)
- ✅ Automatic file naming with UUID
- ✅ File deletion from S3
- ✅ Organized folder structure
- ✅ Public URL generation
- ✅ Role-based access control (ADMIN only)

## Installation

The required packages are already installed:
- `@aws-sdk/client-s3` - AWS SDK for S3 operations
- `@aws-sdk/lib-storage` - Multipart upload support
- `multer` - File upload handling

## Configuration

### 1. Environment Variables

Add the following variables to your `.env` file:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

### 2. AWS S3 Bucket Setup

1. Create an S3 bucket in AWS Console
2. Configure bucket permissions:
   - Enable public access for uploaded files
   - Add bucket policy for public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your_bucket_name/*"
    }
  ]
}
```

3. Enable CORS if needed:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### 3. AWS IAM User Permissions

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your_bucket_name",
        "arn:aws:s3:::your_bucket_name/*"
      ]
    }
  ]
}
```

## API Endpoints

### 1. Upload Single Image

**Endpoint:** `POST /s3/upload`

**Authorization:** JWT Token (ADMIN role required)

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file`: Image file (required)
  - `folder`: Folder name (optional, default: "products")

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/s3/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=products"
```

**Response:**
```json
{
  "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid.jpg",
  "key": "products/uuid.jpg",
  "bucket": "your-bucket",
  "filename": "image.jpg"
}
```

### 2. Upload Multiple Images

**Endpoint:** `POST /s3/upload-multiple`

**Authorization:** JWT Token (ADMIN role required)

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `files`: Multiple image files (required, max 10)
  - `folder`: Folder name (optional, default: "products")

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/s3/upload-multiple \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "folder=products"
```

**Response:**
```json
[
  {
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
    "key": "products/uuid1.jpg",
    "bucket": "your-bucket",
    "filename": "image1.jpg"
  },
  {
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid2.jpg",
    "key": "products/uuid2.jpg",
    "bucket": "your-bucket",
    "filename": "image2.jpg"
  }
]
```

### 3. Delete Single File

**Endpoint:** `DELETE /s3/delete`

**Authorization:** JWT Token (ADMIN role required)

**Request:**
- Method: DELETE
- Content-Type: application/json
- Body:
```json
{
  "key": "products/uuid.jpg"
}
```

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

### 4. Delete Multiple Files

**Endpoint:** `DELETE /s3/delete-multiple`

**Authorization:** JWT Token (ADMIN role required)

**Request:**
- Method: DELETE
- Content-Type: application/json
- Body:
```json
{
  "keys": ["products/uuid1.jpg", "products/uuid2.jpg"]
}
```

**Response:**
```json
{
  "message": "Files deleted successfully"
}
```

### 5. Upload Product Images (Integrated in Products Module)

**Endpoint:** `POST /products/upload-images`

**Authorization:** JWT Token (ADMIN role required)

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `images`: Multiple image files (required, max 10)

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/products/upload-images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## File Validation

The module includes the following validations:

- **File Size:** Maximum 5MB per file
- **File Types:** Only images are allowed (JPEG, JPG, PNG, GIF, WebP)

## Usage in Other Modules

To use the S3Service in other modules:

### 1. Import S3Module
```typescript
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [S3Module],
  // ...
})
export class YourModule {}
```

### 2. Inject S3Service
```typescript
import { S3Service } from '../s3/s3.service';

@Injectable()
export class YourService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadImage(file: Express.Multer.File) {
    return this.s3Service.uploadFile(file, 'your-folder');
  }
}
```

## Example Workflow: Creating Product with Images

1. **Upload Images First:**
```bash
POST /products/upload-images
# Upload images and get URLs
```

2. **Create Product with Image URLs:**
```bash
POST /products
{
  "name": "Product Name",
  "categoryName": "Category",
  "discountedPrice": 100,
  "actualPrice": 150,
  "stockCount": 50,
  "images": [
    {
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
      "altText": "Main product image",
      "isMain": true,
      "sortOrder": 0
    },
    {
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid2.jpg",
      "altText": "Secondary image",
      "isMain": false,
      "sortOrder": 1
    }
  ]
}
```

## Security Considerations

1. **Authentication:** All upload/delete endpoints require JWT authentication
2. **Authorization:** Only ADMIN users can upload/delete files
3. **File Validation:** Files are validated for type and size
4. **AWS Credentials:** Never commit AWS credentials to version control
5. **Bucket Permissions:** Configure proper S3 bucket policies

## Troubleshooting

### Common Issues

1. **"Access Denied" Error:**
   - Check IAM user permissions
   - Verify AWS credentials in `.env`
   - Ensure bucket policy allows PutObject action

2. **"File size exceeds limit" Error:**
   - Reduce file size or increase limit in `s3.service.ts`
   - Current limit: 5MB

3. **"Only image files are allowed" Error:**
   - Ensure you're uploading valid image formats
   - Supported: JPEG, JPG, PNG, GIF, WebP

4. **CORS Error:**
   - Configure CORS in S3 bucket settings
   - Add allowed origins and methods

## Testing

Use Postman or any API client to test the endpoints:

1. Get JWT token from `/auth/login`
2. Include token in Authorization header
3. Upload files using multipart/form-data
4. Save returned URLs for use in your application

## Future Enhancements

- [ ] Add image optimization/resizing
- [ ] Support for signed URLs (private files)
- [ ] Add progress tracking for large uploads
- [ ] Implement CloudFront CDN integration
- [ ] Add image thumbnail generation
- [ ] Support for other file types (PDF, videos)
