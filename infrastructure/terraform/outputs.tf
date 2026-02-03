# Outputs for generating .env files

# Project Information

output "project_id" {
  description = "GCP Project ID"
  value       = local.project_id
}

output "project_number" {
  description = "GCP Project Number"
  value       = local.project_number
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

# Firebase Web App Configuration

output "firebase_api_key" {
  description = "Firebase API Key"
  value       = data.google_firebase_web_app_config.default.api_key
  sensitive   = true
}

output "firebase_auth_domain" {
  description = "Firebase Auth Domain"
  value       = data.google_firebase_web_app_config.default.auth_domain
}

output "firebase_storage_bucket" {
  description = "Firebase Storage Bucket"
  value       = lookup(data.google_firebase_web_app_config.default, "storage_bucket", "${local.project_id}.appspot.com")
}

output "firebase_messaging_sender_id" {
  description = "Firebase Messaging Sender ID"
  value       = data.google_firebase_web_app_config.default.messaging_sender_id
}

output "firebase_app_id" {
  description = "Firebase App ID"
  value       = google_firebase_web_app.default.app_id
}

# Service Account

output "service_account_email" {
  description = "Development Service Account Email"
  value       = google_service_account.dev.email
}

output "service_account_key" {
  description = "Development Service Account Key (base64 encoded JSON)"
  value       = var.create_service_account_key ? google_service_account_key.dev[0].private_key : null
  sensitive   = true
}

# Super Admin

output "super_admin_email" {
  description = "Super Admin Email"
  value       = var.super_admin_email
}

# Useful URLs

output "firebase_console_url" {
  description = "Firebase Console URL"
  value       = "https://console.firebase.google.com/project/${local.project_id}"
}

output "gcp_console_url" {
  description = "GCP Console URL"
  value       = "https://console.cloud.google.com/home/dashboard?project=${local.project_id}"
}

output "auth_providers_url" {
  description = "Firebase Auth Providers URL"
  value       = "https://console.firebase.google.com/project/${local.project_id}/authentication/providers"
}
