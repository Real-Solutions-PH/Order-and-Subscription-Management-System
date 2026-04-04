-- Create the IAM database for future extraction
SELECT 'CREATE DATABASE prepflow_iam'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'prepflow_iam')\gexec
