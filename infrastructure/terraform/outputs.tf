# Outputs for generating .env files

# Project Information

output "project_id" {
  description = "GCP Project ID"
  value       = local.project_id
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

# Monitoring URLs (only shown when monitoring is enabled)

output "monitoring_dashboard_url" {
  description = "Cloud Monitoring Dashboard URL"
  value       = var.monitoring.enabled ? "https://console.cloud.google.com/monitoring?project=${local.project_id}" : null
}

output "logging_explorer_url" {
  description = "Cloud Logging Explorer URL"
  value       = var.monitoring.enabled ? "https://console.cloud.google.com/logs/query?project=${local.project_id}" : null
}

output "alerting_policies_url" {
  description = "Cloud Monitoring Alerting Policies URL"
  value       = var.monitoring.enabled ? "https://console.cloud.google.com/monitoring/alerting?project=${local.project_id}" : null
}

output "monitoring_config_summary" {
  description = "Summary of enabled monitoring features"
  value = {
    enabled = var.monitoring.enabled
    audit_logs = var.monitoring.enabled ? {
      firestore = var.monitoring.audit_logs.enabled && var.monitoring.audit_logs.firestore
      auth      = var.monitoring.audit_logs.enabled && var.monitoring.audit_logs.auth
    } : null
    alerts = var.monitoring.enabled ? {
      auth_failures    = var.monitoring.alerts.auth_failures.enabled
      function_errors  = var.monitoring.alerts.function_errors.enabled
      firestore_errors = var.monitoring.alerts.firestore_errors.enabled
      high_latency     = var.monitoring.alerts.high_latency.enabled
      uptime           = var.monitoring.alerts.uptime.enabled && var.monitoring.alerts.uptime.api_domain != null
    } : null
    notification_email = var.monitoring.enabled ? coalesce(var.monitoring.notifications.email, var.super_admin_email) : null
    slack_enabled      = var.monitoring.enabled ? var.monitoring.notifications.slack_webhook != null : null
  }
}

# AI Service

output "ai_service_url" {
  description = "AI service Cloud Run URL"
  value       = var.ai_service.enabled ? google_cloud_run_v2_service.ai_service[0].uri : null
}
