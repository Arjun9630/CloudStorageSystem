import boto3
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "my-cloud-storage-bucket")

# Initialize S3 Client
s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

def list_s3_files(user_id: str, prefix: str = ""):
    """Lists files in the S3 bucket isolated to the given user."""
    try:
        user_prefix = f"{user_id}/{prefix}" if prefix else f"{user_id}/"
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=user_prefix)
        return response.get("Contents", [])
    except ClientError as e:
        print(f"Error listing files: {e}")
        raise e

def upload_s3_file(user_id: str, file_obj, key: str, content_type: str = "application/octet-stream"):
    """Uploads a file payload directly to S3 within the user's isolated folder using streaming."""
    try:
        s3_key = f"{user_id}/{key}"
        s3_client.upload_fileobj(
            file_obj,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={"ContentType": content_type}
        )
        return s3_key
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        raise e

def delete_s3_file(s3_key: str):
    """Deletes an object from the S3 bucket using the full s3_key."""
    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError as e:
        print(f"Error deleting from S3: {e}")
        raise e

def get_presigned_url(s3_key: str, filename: str = None, expires_in: int = 3600):
    """Generates a secure presigned URL for downloading/viewing the file with an optional custom filename."""
    try:
        params = {"Bucket": S3_BUCKET_NAME, "Key": s3_key}
        if filename:
            # This ensures the browser downloads the file with the correct display name
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
            
        url = s3_client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_in,
        )
        return url
    except ClientError as e:
        print(f"Error generating url: {e}")
        raise e
