# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment
# terraform import azurerm_container_app_environment.main "/subscriptions/27de852c-c023-4de6-ac4d-52c9d4470482/resourceGroups/teeledger-q-rg/providers/Microsoft.App/managedEnvironments/teeledger-q-cae"
resource "azurerm_container_app_environment" "main" {
  name                        = "${local.name_prefix}-cae"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
# terraform import azurerm_container_app.api "/subscriptions/27de852c-c023-4de6-ac4d-52c9d4470482/resourceGroups/teeledger-q-rg/providers/Microsoft.App/containerApps/teeledger-q-ca-server"
resource "azurerm_container_app" "api" {
  name                            = "${local.name_prefix}-ca-api"
  resource_group_name             = azurerm_resource_group.main.name
  container_app_environment_id    = azurerm_container_app_environment.main.id
  revision_mode                   = "Single"
  tags = var.tags

  identity {
    type = "UserAssigned"
    identity_ids = [
      azurerm_user_assigned_identity.api.id
    ]
  }  

  secret {
    identity              = azurerm_user_assigned_identity.api.id
    name                  = "ghcr-pat"
    key_vault_secret_id   = azurerm_key_vault_secret.ghcr_pat.id
  }

  secret {
    identity              = azurerm_user_assigned_identity.api.id
    name                  = "database-connection-string"
    key_vault_secret_id   = azurerm_key_vault_secret.database_connection_string.id
  }

  template {
    container {
      name   = "${local.name_prefix}-c-api"
      image  = "${var.ghcr_url}/vgdagpin/teeledger.api:${var.api_version}"
      cpu    = "0.5"
      memory = "1Gi"
      env {
        name      = "ConnectionStrings__TeeLedgerDbConString"
        secret_name = "database-connection-string"
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.api.client_id
      }
    }

    min_replicas = 0
    max_replicas = 3
  }

  registry {
    server               = var.ghcr_url
    username             = var.ghcr_username
    password_secret_name = "ghcr-pat"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

}