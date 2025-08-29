variable "subscription_id" {
  description = "The Subscription ID for Azure"
  type        = string
}

variable "env_name" {
  description = "The Environment prefix for Azure services"
  type        = string
  default     = "q" # Your environment name (eg. q, u, p)
}

variable "ghcr_url" {
  description = "Github container registry url"
  type        = string
  default     = "ghcr.io"
}

variable "ghcr_username" {
  description = "Github container registry username"
  type        = string
  default     = "vgdagpin"
}

variable "ghcr_pat" {
  description = "Github container registry access token"
  type        = string
}

variable "api_version" {
  description = "The version of api"
  type        = string
  default     = "latest"
}

variable "services_prefix" {
  description = "The prefix of each services"
  type        = string
  default     = "teeledger"
}

variable "database_connection_string" {
  description = "Database connection string"
  type        = string
  sensitive   = true
}

variable "tags" {
  type = map(string)
  default = {
    environment = "QA"
  }
}